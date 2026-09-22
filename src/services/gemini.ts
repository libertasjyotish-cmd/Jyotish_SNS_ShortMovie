import { GoogleGenAI, Type } from '@google/genai';
import { optionalEnv, requireEnv } from '@/lib/env';
import { weekPeriodLabel, weekPeriodSpoken } from '@/lib/period';
import { Language, TargetType } from './sheets';

const DEFAULT_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 2_000;
const ATTEMPT_TIMEOUT_MS = 25_000;

/** 429 / 5xx from the Gemini endpoint are load related and worth retrying. */
export function isTransientGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|abort/i.test(
    message,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GenerationRequest {
  week_id: string;
  lang_code: Language;
  target_type: TargetType;
  zodiac_sign?: string;
  transit_reference: string;
  /** Lint issues from a rejected attempt, fed back so the retry fixes them. */
  lint_feedback?: string;
}

export interface GeneratedScript {
  hook_text: string;
  body_script: string;
  cta_text: string;
}

export interface GeneratedContent {
  week_id: string;
  lang_code: Language;
  target_type: TargetType;
  zodiac_sign?: string;
  transit_reference: string;
  script_30s: GeneratedScript;
  script_65s: GeneratedScript;
  hashtags: string;
}

interface LanguageProfile {
  name: string;
  /** How the tradition is named on screen; "Vedic astrology" reads as a sect in Japanese. */
  tradition: string;
  /** Narration length targets, expressed in the unit natural for the script. */
  length30s: string;
  length65s: string;
  /** The 65s body is where the model consistently falls short, so it is budgeted apart. */
  body65s: string;
  note?: string;
}

const LANGUAGE_PROFILES: Record<Language, LanguageProfile> = {
  ja: {
    name: '日本語',
    tradition: 'インド占星術（ジョーティシュ）',
    length30s: '合計165〜183文字',
    length65s: '合計390〜420文字',
    body65s: '320〜350文字',
    note: 'Japanese wording: call the chart 「ホロスコープ」. Never write 「出生図」, 「出生時間」 or 「チャート」, and never make 生まれた時刻 the condition for getting an answer, since many viewers do not know theirs. End cta_text with exactly: 「を調べるには、12の太陽星座ではなく、108の区分とダシャー期を組み合わせた鑑定が必要です。リンクから無料で確認できます。」, preceded only by the one thing this video left unanswered (for example 「あなたの木星がどの部屋を通るか」). That CTA is about 80 characters on its own, so in script_30s hook_text must stay under 40 characters and body_script must be a single sentence under 70 characters; count the characters of all three fields before answering.',
  },
  en: {
    name: 'English',
    tradition: 'Indian (Vedic) astrology, Jyotish',
    /** English is read at ~2.2 words per second at the default speaking rate. */
    length30s: '52-62 words in total',
    length65s: '160-180 words in total',
    body65s: '130-150 words',
  },
  es: {
    name: 'Español',
    tradition: 'la astrología india (Jyotish)',
    length30s: '70-85 palabras en total',
    length65s: '160-180 palabras en total',
    body65s: '130-150 palabras',
  },
  pt: {
    name: 'Português',
    tradition: 'a astrologia indiana (Jyotish)',
    length30s: '70-85 palavras no total',
    length65s: '160-180 palavras no total',
    body65s: '130-150 palavras',
  },
  id: {
    name: 'Bahasa Indonesia',
    tradition: 'astrologi India (Jyotish)',
    length30s: 'total 70-85 kata',
    length65s: 'total 160-180 kata',
    body65s: '130-150 kata',
  },
  ar: {
    name: 'العربية',
    tradition: 'التنجيم الهندي (جيوتيش)',
    length30s: '70-85 كلمة إجمالاً',
    length65s: '160-180 كلمة إجمالاً',
    body65s: '130-150 كلمة',
    note: 'Right-to-left script. Do not insert Latin punctuation or emoji that break RTL rendering.',
  },
  fr: {
    name: 'Français',
    tradition: "l'astrologie indienne (le Jyotish)",
    length30s: '65-80 mots au total',
    length65s: '160-200 mots au total',
    body65s: '130-160 mots',
  },
  de: {
    name: 'Deutsch',
    tradition: 'die indische Astrologie (Jyotisch)',
    length30s: 'insgesamt 60-75 Wörter',
    length65s: 'insgesamt 145-180 Wörter',
    body65s: '120-150 Wörter',
    note: 'German compounds are long; prefer short everyday words over compound nouns so the narration stays inside the time limit.',
  },
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    script_30s: {
      type: Type.OBJECT,
      properties: {
        hook_text: { type: Type.STRING },
        body_script: { type: Type.STRING },
        cta_text: { type: Type.STRING },
      },
      required: ['hook_text', 'body_script', 'cta_text'],
    },
    script_65s: {
      type: Type.OBJECT,
      properties: {
        hook_text: { type: Type.STRING },
        body_script: { type: Type.STRING },
        cta_text: { type: Type.STRING },
      },
      required: ['hook_text', 'body_script', 'cta_text'],
    },
    hashtags: { type: Type.STRING },
  },
  required: ['script_30s', 'script_65s', 'hashtags'],
} as const;

const LONG_SCRIPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hook_text: { type: Type.STRING },
    body_script: { type: Type.STRING },
    cta_text: { type: Type.STRING },
  },
  required: ['hook_text', 'body_script', 'cta_text'],
} as const;

interface RawGeneration {
  script_30s?: Partial<GeneratedScript>;
  script_65s?: Partial<GeneratedScript>;
  hashtags?: string;
}

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s、。）)]+/gi;

/**
 * The scripts are read out loud by TTS and drawn on screen, so a link the model slipped
 * into the narration would be spoken character by character. Links belong in the profile
 * and the description instead.
 */
function stripUrls(text: string): string {
  return text
    .replace(URL_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([、。,.])/g, '$1')
    .trim();
}

function assertScript(
  script: Partial<GeneratedScript> | undefined,
  label: string,
): GeneratedScript {
  if (!script?.hook_text || !script.body_script || !script.cta_text) {
    throw new Error(`Gemini returned an incomplete ${label}`);
  }
  return {
    hook_text: stripUrls(script.hook_text),
    body_script: stripUrls(script.body_script),
    cta_text: stripUrls(script.cta_text),
  };
}

/** Stretches a hand-written theme script to the 65s pattern without adding new claims. */
function buildThemeExpansionPrompt(script: GeneratedScript, lang_code: Language): string {
  const profile = LANGUAGE_PROFILES[lang_code];
  return [
    'You are a Vedic (Jyotish) astrology scriptwriter for Libertas Jyotish short videos.',
    'You are given a finished 30-second script. Rewrite it as a longer version of the same video.',
    'The video exists to make the viewer need their own chart and go to the Libertas Jyotish site, so',
    'spend the extra seconds on what the principle looks like in ordinary life, not on more sky facts.',
    '',
    'Absolute rules:',
    '1. Do not introduce any fact, number, degree, year, planet, nakshatra, tradition or proper noun that is absent from the source script.',
    '2. Keep the same topic, the same claims and the same order of ideas. Only elaborate on what is already there.',
    '3. Never predict illness, death, pregnancy, accidents, lawsuits, or specific gains and losses of money, and never give medical, mental-health, financial or legal advice.',
    '4. Keep the hook close to the original wording; it is what stops the scroll.',
    `5. Name the tradition in the first sentence of body_script, exactly as "${profile.tradition}", unless the source script already names it.`,
    "6. Stop short of the personal answer: elaborate on the general principle, and leave the viewer's own case (their chart, their Moon sign, their period) to the site. Never let the viewer feel the video already covered their own case.",
    '7. The CTA keeps inviting viewers to look up their own chart on the Libertas Jyotish site. Never write a URL, a domain name or an email address in any field; the link lives in the profile and the description.',
    '',
    `Write everything in ${profile.name}.`,
    profile.note ?? '',
    '',
    'Source script:',
    `hook_text: ${script.hook_text}`,
    `body_script: ${script.body_script}`,
    `cta_text: ${script.cta_text}`,
    '',
    `Produce one script spoken in 61-68 seconds, ${profile.length65s} (hook_text + body_script + cta_text combined), of which body_script carries ${profile.body65s}.`,
    'Return only the JSON object; no markdown fences, no commentary.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildPrompt(request: GenerationRequest): string {
  const profile = LANGUAGE_PROFILES[request.lang_code];
  const audience =
    request.target_type === 'Zodiac_Sign'
      ? `people whose sidereal Moon sign is ${request.zodiac_sign}`
      : 'viewers of every Moon sign';
  const period = weekPeriodLabel(request.week_id, request.lang_code);
  const spokenPeriod =
    request.target_type === 'Zodiac_Sign'
      ? weekPeriodSpoken(request.week_id, request.lang_code)
      : undefined;

  return [
    'You are a Vedic (Jyotish) astrology scriptwriter for Libertas Jyotish short videos.',
    'Sidereal system, Moon-sign (Chandra Lagna) based readings.',
    '',
    'What the video is for: it is not a lesson about planets. It exists to make the viewer unable to',
    'leave the question alone and go to the Libertas Jyotish site, work out their own chart, and',
    'subscribe for their timing and reading. Judge every sentence by one test: does it make the',
    'viewer need their own chart? A sentence that only describes the sky fails and must be rewritten.',
    '',
    'Absolute rules:',
    '1. Never write vague, unfounded fortunes such as "You are lucky this week!".',
    '2. Base every statement solely on the supplied transit reference and its house relationship to the target Moon sign. Never invent transits, dates, planetary positions, proper nouns, or numbers that are not present in the reference.',
    '3. Never add original interpretations that contradict classical Jyotish (dasha, nakshatra, planetary rulership).',
    '4. Explain exactly one planetary movement, plainly. Orbital periods, degrees and cycle lengths may appear once as evidence, never as the subject of the video; the subject is what the viewer experiences in work, money, relationships, mood, home or timing.',
    '5. The CTA invites viewers to the Libertas Jyotish site for their personal reading. Never write a URL, a domain name or an email address in any field; the link lives in the profile and the description.',
    '6. Never give definitive medical, mental-health, financial, investment or legal advice, and never predict illness, death, pregnancy, accidents, lawsuits, or specific gains and losses of money. Phrase practical suggestions as everyday actions (rest, planning, communication), not as diagnoses or instructions.',
    '7. Keep the tone calm and specific. Vary the opening sentence and the concrete example between zodiac signs so the twelve scripts of a week never read as one template.',
    `8. Name the tradition in the first sentence of body_script, exactly as "${profile.tradition}". Viewers do not know what a nakshatra or a sidereal Moon sign is, so never open on a technical term without saying which system it comes from.`,
    '9. hook_text is one short line that either names something the viewer already lives with and asks whether it is happening to them, or contradicts what they believe ("that is not your fault", "you are looking at the wrong planet"). Never announce the video or the topic ("here is this week\'s movement of the stars"), and never answer the hook in the hook itself.',
    '10. In script_30s the fixed CTA already spends about a third of the budget, so hook_text is one short line and body_script is at most two sentences. The length limits are hard limits. Count before answering — characters excluding spaces for Japanese, words for the other languages — and cut adjectives or add a concrete everyday detail until the total is inside the range.',
    '11. body_script contains one sentence that lets the viewer decide for themselves whether the transit is acting on them, phrased as what it looks like in the people it reaches ("the ones it reaches find that ..."). Describe everyday actions, never symptoms, luck or loss.',
    '12. cta_text has three parts in this order: (a) "to find out <the one thing this video left unanswered about the viewer>"; (b) the reason the generic twelve sun signs cannot settle it, because Jyotish combines finer divisions — the 108 subdivisions (27 lunar mansions x 4 padas) and the dasha periods — to reach one person\'s answer; (c) an invitation to check it free through the link. Never require the viewer to know their birth time, never disparage Western astrology, never write a URL, and never close on a definitive statement about the individual viewer.',
    '13. Never create urgency through fear. Do not use danger, warning, running out of time, misfortune, or "if you do not do this" framings, and never promise that something will certainly happen.',
    '14. Never let the video close its own loop: state the general principle and the individual variation, and stop before the viewer could conclude what their own case is. The unanswered question is what takes them to the site.',
    spokenPeriod
      ? `15. The reading covers one week and stays on the feed long afterwards, so body_script opens by saying the dates out loud, exactly as "${spokenPeriod}", in the same sentence that names the tradition. Write them as they are read, never as a week number, and say them in both scripts.`
      : '15. This video is not tied to a week, so never state dates or a period in any field.',
    request.target_type === 'Zodiac_Sign'
      ? `16. This reading is for the sidereal Moon sign ${request.zodiac_sign}, which is usually not the sign the viewer knows from Western astrology, so cta_text says in one clause that the sign meant here is the Moon sign of Indian astrology and that the viewer can check their own free through the link, before or inside part (c) of rule 12.`
      : '16. This video is for every Moon sign, so never tell the viewer to look up which sign they are.',
    '17. script_65s must stop short of the personal answer: it explains what is happening in the sky and what it means in general, then says that which house it falls in — and therefore what it means for the individual — depends on the birth chart, which the site works out. Never let the viewer feel the video already covered their own case.',
    '',
    `Write the narration in ${profile.name}. Output every text field in ${profile.name}.`,
    profile.note ?? '',
    '',
    `Week: ${request.week_id}${period ? ` (${period})` : ''}`,
    `Audience: ${audience}`,
    `Transit reference (the only allowed factual source):\n${request.transit_reference}`,
    '',
    'Produce two narration scripts for the same content:',
    `- script_30s: spoken in about 30 seconds, ${profile.length30s}${spokenPeriod ? ` plus the dates of rule 15` : ''} (hook_text + body_script + cta_text combined). Structure, in this order: (a) hook that names what the viewer lives with or contradicts what they believe; (b) one sentence that opens on ${spokenPeriod ? 'the dates, then names' : 'naming'} Jyotish and how it reads this movement, through the house it falls in for that Moon sign; (c) one sentence on what that looks like in ordinary life, worded so the viewer can tell whether it is reaching them; (d) the CTA of rule 12. Do not add a fourth body sentence: the total would break the limit.`,
    `- script_65s: spoken in 61-68 seconds, ${profile.length65s} (hook_text + body_script + cta_text combined). This one is long: body_script alone carries ${profile.body65s} and needs five or six sentences. Structure: hook, why the sidereal Moon sign matters, the transit and its house, detailed outlook and a caution, app CTA.`,
    '',
    '',
    'Worked example of the structure (English, different topic; copy the shape, not the words):',
    'hook_text: "Told this was a good year for you and nothing happened? You were not looking at the right place."',
    'body_script: "In Jyotish, a transit is read by the house it passes through in your own chart, not by the sign it sits in. The same year lands on work for one person and on the home for another, which is why a shared forecast fits almost no one. If the year felt flat to you, the movement was simply expanding somewhere you were not watching."',
    'cta_text: "To find out which house it passes through for you, twelve sun signs are not enough: Jyotish combines the 108 subdivisions with your dasha periods to reach one answer. Check yours free through the link."',
    '',
    'hashtags: 4-6 space-separated hashtags suitable for the target language, always including #LibertasJyotish.',
    request.lint_feedback
      ? `Your previous attempt was rejected by the automatic check for: ${request.lint_feedback}. Fix exactly these points and keep every other rule.`
      : '',
    'Return only the JSON object; no markdown fences, no commentary.',
  ]
    .filter(Boolean)
    .join('\n');
}

export class GeminiService {
  private ai: GoogleGenAI;
  /** Tried in order across attempts so an overloaded model falls back to the next one. */
  private models: string[];

  /**
   * Strict Astrology Rules:
   * 1. No abstract baseless fortunes (e.g., "Lucky this week!").
   * 2. Must base scripts solely on provided "transit_reference".
   * 3. No original interpretations that contradict classical Jyotish.
   * 4. Must explain one planetary movement simply.
   */
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
    const configured = (optionalEnv('GEMINI_MODEL') ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    this.models = configured.length > 0 ? configured : DEFAULT_MODELS;
  }

  async generateScript(request: GenerationRequest): Promise<GeneratedContent> {
    const raw = await this.generate<RawGeneration>(buildPrompt(request), RESPONSE_SCHEMA);
    return {
      week_id: request.week_id,
      lang_code: request.lang_code,
      target_type: request.target_type,
      zodiac_sign: request.zodiac_sign,
      transit_reference: request.transit_reference,
      script_30s: assertScript(raw.script_30s, 'script_30s'),
      script_65s: assertScript(raw.script_65s, 'script_65s'),
      hashtags: (raw.hashtags || '').trim(),
    };
  }

  async expandThemeScript(script: GeneratedScript, lang_code: Language): Promise<GeneratedScript> {
    const raw = await this.generate<Partial<GeneratedScript>>(
      buildThemeExpansionPrompt(script, lang_code),
      LONG_SCRIPT_SCHEMA,
    );
    return assertScript(raw, 'theme script_65s');
  }

  private async generate<T>(prompt: string, schema: object): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const model = this.models[(attempt - 1) % this.models.length];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.7,
            responseMimeType: 'application/json',
            responseSchema: schema,
            abortSignal: controller.signal,
            httpOptions: { timeout: ATTEMPT_TIMEOUT_MS },
          },
        });

        const text = response.text;
        if (!text) throw new Error('Gemini returned an empty response');

        return JSON.parse(text) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown Gemini error');
        console.error(`Gemini generation attempt ${attempt} (${model}) failed:`, lastError.message);
        if (attempt < MAX_ATTEMPTS) {
          // Exponential backoff with jitter so parallel workers do not retry in lockstep.
          await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1) * (0.5 + Math.random()));
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new Error('Gemini generation failed');
  }
}
