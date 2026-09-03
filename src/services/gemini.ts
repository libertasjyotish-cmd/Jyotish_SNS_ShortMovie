import { GoogleGenAI, Type } from '@google/genai';
import { optionalEnv, requireEnv } from '@/lib/env';
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
  script_20s: GeneratedScript;
  script_65s: GeneratedScript;
  hashtags: string;
}

interface LanguageProfile {
  name: string;
  /** How the tradition is named on screen; "Vedic astrology" reads as a sect in Japanese. */
  tradition: string;
  /** Narration length targets, expressed in the unit natural for the script. */
  length20s: string;
  length65s: string;
  /** The 65s body is where the model consistently falls short, so it is budgeted apart. */
  body65s: string;
  note?: string;
}

const LANGUAGE_PROFILES: Record<Language, LanguageProfile> = {
  ja: {
    name: '日本語',
    tradition: 'インド占星術（ジョーティシュ）',
    length20s: '合計75〜90文字',
    length65s: '合計390〜420文字',
    body65s: '320〜350文字',
  },
  en: {
    name: 'English',
    tradition: 'Indian (Vedic) astrology, Jyotish',
    /** English is read at ~2.6 words per second, so 50 words overran the 22s ceiling. */
    length20s: '32-40 words in total',
    length65s: '160-180 words in total',
    body65s: '130-150 words',
  },
  es: {
    name: 'Español',
    tradition: 'la astrología india (Jyotish)',
    length20s: '45-55 palabras en total',
    length65s: '160-180 palabras en total',
    body65s: '130-150 palabras',
  },
  pt: {
    name: 'Português',
    tradition: 'a astrologia indiana (Jyotish)',
    length20s: '45-55 palavras no total',
    length65s: '160-180 palavras no total',
    body65s: '130-150 palavras',
  },
  id: {
    name: 'Bahasa Indonesia',
    tradition: 'astrologi India (Jyotish)',
    length20s: 'total 45-55 kata',
    length65s: 'total 160-180 kata',
    body65s: '130-150 kata',
  },
  ar: {
    name: 'العربية',
    tradition: 'التنجيم الهندي (جيوتيش)',
    length20s: '45-55 كلمة إجمالاً',
    length65s: '160-180 كلمة إجمالاً',
    body65s: '130-150 كلمة',
    note: 'Right-to-left script. Do not insert Latin punctuation or emoji that break RTL rendering.',
  },
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    script_20s: {
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
  required: ['script_20s', 'script_65s', 'hashtags'],
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
  script_20s?: Partial<GeneratedScript>;
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
    'You are given a finished 20-second script. Rewrite it as a longer version of the same video.',
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

  return [
    'You are a Vedic (Jyotish) astrology scriptwriter for Libertas Jyotish short videos.',
    'Sidereal system, Moon-sign (Chandra Lagna) based readings.',
    '',
    'Absolute rules:',
    '1. Never write vague, unfounded fortunes such as "You are lucky this week!".',
    '2. Base every statement solely on the supplied transit reference and its house relationship to the target Moon sign. Never invent transits, dates, planetary positions, proper nouns, or numbers that are not present in the reference.',
    '3. Never add original interpretations that contradict classical Jyotish (dasha, nakshatra, planetary rulership).',
    '4. Explain exactly one planetary movement, plainly.',
    '5. The CTA invites viewers to the Libertas Jyotish site for their personal reading. Never write a URL, a domain name or an email address in any field; the link lives in the profile and the description.',
    '6. Never give definitive medical, mental-health, financial, investment or legal advice, and never predict illness, death, pregnancy, accidents, lawsuits, or specific gains and losses of money. Phrase practical suggestions as everyday actions (rest, planning, communication), not as diagnoses or instructions.',
    '7. Keep the tone calm and specific. Vary the opening sentence and the concrete example between zodiac signs so the twelve scripts of a week never read as one template.',
    `8. Name the tradition in the first sentence of body_script, exactly as "${profile.tradition}". Viewers do not know what a nakshatra or a sidereal Moon sign is, so never open on a technical term without saying which system it comes from.`,
    '9. hook_text is one short line that stops the scroll: a surprising claim, a question, or naming the viewer. Never announce the video ("here is this week\'s movement of the stars").',
    '10. The length limits are hard limits; count before answering and cut adjectives rather than overrun.',
    '11. script_65s must stop short of the personal answer: it explains what is happening in the sky and what it means in general, then says that which house it falls in — and therefore what it means for the individual — depends on the birth chart, which the site works out. Never let the viewer feel the video already covered their own case.',
    '',
    `Write the narration in ${profile.name}. Output every text field in ${profile.name}.`,
    profile.note ?? '',
    '',
    `Week: ${request.week_id}`,
    `Audience: ${audience}`,
    `Transit reference (the only allowed factual source):\n${request.transit_reference}`,
    '',
    'Produce two narration scripts for the same content:',
    `- script_20s: spoken in about 20 seconds, ${profile.length20s} (hook_text + body_script + cta_text combined). Structure: 2-second hook, one sentence naming Jyotish and the planetary movement, one concrete action, app CTA.`,
    `- script_65s: spoken in 61-68 seconds, ${profile.length65s} (hook_text + body_script + cta_text combined). This one is long: body_script alone carries ${profile.body65s} and needs five or six sentences. Structure: hook, why the sidereal Moon sign matters, the transit and its house, detailed outlook and a caution, app CTA.`,
    '',
    'hashtags: 4-6 space-separated hashtags suitable for the target language, always including #LibertasJyotish.',
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
      script_20s: assertScript(raw.script_20s, 'script_20s'),
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
