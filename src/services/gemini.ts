import { GoogleGenAI, Type } from '@google/genai';
import { optionalEnv, requireEnv } from '@/lib/env';
import { hookAssignment } from '@/lib/hook-angles';
import { weekPeriodLabel, weekPeriodSpoken } from '@/lib/period';
import { zodiacName } from '@/lib/zodiac-names';
import { Language, Pattern, TargetType } from './sheets';

const DEFAULT_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
/** Proofreading needs the stronger model: flash passed sentences a native speaker rejects. */
const DEFAULT_REVIEW_MODELS = ['gemini-3.1-pro-preview', 'gemini-flash-latest'];
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 2_000;
const ATTEMPT_TIMEOUT_MS = 25_000;
/** Proofreading runs on the reasoning model, which needs far longer than a generation call. */
const REVIEW_TIMEOUT_MS = 180_000;

/**
 * A depleted prepaid balance also comes back as RESOURCE_EXHAUSTED, but no amount of
 * retrying fixes it: only a top-up does.
 */
export function isGeminiCreditError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b402\b|prepayment credits|billing account|FAILED_PRECONDITION/i.test(message);
}

/** 429 / 5xx from the Gemini endpoint are load related and worth retrying. */
export function isTransientGeminiError(error: unknown): boolean {
  if (isGeminiCreditError(error)) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|abort/i.test(
    message,
  );
}

/**
 * Smallest possible call, used by the daily health check so a depleted balance surfaces
 * before a weekly generation run loses the week.
 */
export async function probeGeminiCredit(): Promise<{ ok: boolean; detail: string }> {
  const model = DEFAULT_MODELS[0];
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': requireEnv('GEMINI_API_KEY'),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ok' }] }] }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      },
    );
    if (response.ok) return { ok: true, detail: model };
    const body = await response.text();
    const detail = `${model} ${response.status} ${body.slice(0, 200)}`;
    // 429 is a per-minute quota, which clears by itself; 402 needs the owner to pay.
    return { ok: !isGeminiCreditError(detail) && response.status === 429, detail };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
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
  /** Longest hook still spoken inside the first two seconds; must match HOOK_BOUNDS in script-lint. */
  hook: string;
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
    hook: '24文字以内',
    length30s: '合計165〜183文字',
    length65s: '合計390〜420文字',
    body65s: '320〜350文字',
    note: 'Japanese wording: call the chart 「ホロスコープ」. Never write 「出生図」, 「出生時間」 or 「チャート」, and never make 生まれた時刻 the condition for getting an answer, since many viewers do not know theirs. Write every sentence as a Japanese speaker would say it out loud: one subject per sentence, and a predicate that says something about that subject. Never end a sentence about a person with a noun phrase about the chart — 「〜と感じる人は容量の出方です」「〜人はこの部屋が出ています」「〜人ほど、ここです」 are all broken, because 容量の出方 / 部屋 / ここ say nothing about the person. Never join two clauses whose subjects differ (「ここが強い人ほど…、忙しいと感じる人は…」) with a comma: split them into two sentences. Keep 敬体 throughout and never mix in 「〜さん」 or 「〜よね？」. Prefer dropping a detail over compressing a sentence until particles disappear.',
  },
  en: {
    name: 'English',
    tradition: 'Indian (Vedic) astrology, Jyotish',
    hook: '8 words or fewer',
    /** English is read at ~2.2 words per second at the default speaking rate. */
    length30s: '52-62 words in total',
    length65s: '160-180 words in total',
    body65s: '130-150 words',
  },
  es: {
    name: 'Español',
    tradition: 'la astrología india (Jyotish)',
    hook: '9 palabras como máximo',
    length30s: '70-85 palabras en total',
    length65s: '160-180 palabras en total',
    body65s: '130-150 palabras',
  },
  pt: {
    name: 'Português',
    tradition: 'a astrologia indiana (Jyotish)',
    hook: 'no máximo 9 palavras',
    length30s: '70-85 palavras no total',
    length65s: '160-180 palavras no total',
    body65s: '130-150 palavras',
  },
  id: {
    name: 'Bahasa Indonesia',
    tradition: 'astrologi India (Jyotish)',
    hook: 'maksimal 9 kata',
    length30s: 'total 70-85 kata',
    length65s: 'total 160-180 kata',
    body65s: '130-150 kata',
  },
  ar: {
    name: 'العربية',
    tradition: 'التنجيم الهندي (جيوتيش)',
    hook: '9 كلمات كحد أقصى',
    length30s: '70-85 كلمة إجمالاً',
    length65s: '160-180 كلمة إجمالاً',
    body65s: '130-150 كلمة',
    note: 'Right-to-left script. Do not insert Latin punctuation or emoji that break RTL rendering.',
  },
  fr: {
    name: 'Français',
    tradition: "l'astrologie indienne (le Jyotish)",
    hook: '9 mots au maximum',
    length30s: '65-80 mots au total',
    length65s: '160-200 mots au total',
    body65s: '130-160 mots',
  },
  de: {
    name: 'Deutsch',
    tradition: 'die indische Astrologie (Jyotisch)',
    hook: 'höchstens 8 Wörter',
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

const REVIEW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reviews: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          verdict: { type: Type.STRING, enum: ['ok', 'awkward', 'broken'] },
          reason: { type: Type.STRING },
        },
        required: ['id', 'verdict', 'reason'],
      },
    },
  },
  required: ['reviews'],
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

export interface ReviewTarget {
  id: string;
  hook: string;
  body: string;
  cta: string;
}

export interface ReviewVerdict {
  id: string;
  verdict: 'ok' | 'awkward' | 'broken';
  reason: string;
}

interface RawReview {
  reviews?: Partial<ReviewVerdict>[];
}

/**
 * The lint only measures length and required keywords, so a script can pass it and still
 * be unreadable out loud. This asks a native speaker of the language to judge the prose
 * itself: dropped subjects, particles that do not agree, noun phrases that mean nothing.
 */
function buildReviewPrompt(targets: ReviewTarget[], lang_code: Language): string {
  const profile = LANGUAGE_PROFILES[lang_code];
  return `You are a native ${profile.name} speaker proofreading narration for short videos about ${profile.tradition}.
Each script is read out loud by a synthetic voice, so it must sound like a fluent person speaking, not like a translation.

Judge ONLY the language, never the astrology, never the length, never whether a call to action is persuasive.
Mark "broken" when a sentence is not grammatical ${profile.name}: a missing subject, a predicate that does not agree with its subject, particles or articles that do not connect, or a noun phrase that carries no meaning.
Mark "awkward" when it parses but no fluent speaker would say it that way, including stitched-together clauses and mixed registers.
Mark "ok" only when you would read it aloud unchanged.

These are real scripts that shipped and had to be withdrawn; every one of them is "broken":
- 「ここが強い人ほど仕事が集まりやすく、いつも忙しいと感じる人は弱さではなく容量の出方です。」 two clauses describe different people, and 「容量の出方です」 is a noun phrase that states nothing about the subject.
- 「ここが強い人は抱えすぎてから離しやすく、手放すのが苦手だと感じる人はこの部屋が出ています。」 the subject changes mid sentence and 「この部屋が出ています」 does not say what happens to the person.
- 「相手の気分が自分のものになると感じる人ほど、ここです。」 「ここです」 cannot serve as the predicate of 「人ほど」.
Be as strict with every script below. Sentences that merely sound like a horoscope are fine; sentences whose subject and predicate do not belong together are not.

In "reason", quote the offending span and say what is wrong, in English, in one sentence. For "ok", leave "reason" empty.

Return one entry per script, with the same id.

${targets
    .map(
      (target) =>
        `id: ${target.id}\nhook: ${target.hook}\nbody: ${target.body}\ncta: ${target.cta}`,
    )
    .join('\n\n')}`;
}

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
  const localSign =
    request.target_type === 'Zodiac_Sign'
      ? zodiacName(request.zodiac_sign, request.lang_code)
      : undefined;
  const spokenPeriod =
    request.target_type === 'Zodiac_Sign'
      ? weekPeriodSpoken(request.week_id, request.lang_code)
      : undefined;
  const assignment =
    request.target_type === 'Zodiac_Sign'
      ? hookAssignment(request.week_id, request.zodiac_sign)
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
    assignment
      ? `7. Keep the tone calm and specific. The twelve signs of this week are each given a different opening so they never read as one template, and this one opens on ${assignment.angle}. Take the concrete everyday example from ${assignment.domain}. Both still have to follow from the transit below; if the transit cannot support this opening, choose the nearest one it does support rather than falling back on plans going wrong.`
      : '7. Keep the tone calm and specific, and never open on plans or schedules going wrong, which is the opening these scripts fall into by default.',
    `8. Name the tradition in the first sentence of body_script, exactly as "${profile.tradition}". Viewers do not know what a nakshatra or a sidereal Moon sign is, so never open on a technical term without saying which system it comes from.`,
    `9. hook_text is spoken in the first two seconds, which is all a short-video feed gives the clip before deciding whether to keep showing it, so it is ${profile.hook}: one sentence, no clause leading up to the point, and nothing before the word that stops the scroll. It either names something the viewer already lives with and asks whether it is happening to them, or contradicts what they believe ("that is not your fault", "you are looking at the wrong planet"). Never announce the video or the topic ("here is this week\'s movement of the stars"), and never answer the hook in the hook itself.`,
    '10. The length limits are hard limits, but they are a budget, not a reason to drop words out of a sentence: every sentence must still be complete and idiomatic when read aloud, and a script that only fits because particles, subjects or verbs were cut is rejected. Count before answering — characters excluding spaces for Japanese, words for the other languages — and when the total is over, remove a whole detail or shorten the CTA rather than squeezing a sentence.',
    '11. body_script contains one sentence that lets the viewer decide for themselves whether the transit is acting on them, by describing what it looks like in everyday actions, never symptoms, luck or loss. Say it the way a person speaks; do not reach for the same "the ones it reaches find that ..." frame every time, and never attach that condition to a predicate that describes the chart instead of the person.',
    '12. cta_text covers three things in this order: (a) the one thing this video left unanswered about the viewer; (b) the reason the generic twelve sun signs cannot settle it, because Jyotish combines finer divisions — the 108 subdivisions (27 lunar mansions x 4 padas) and the dasha periods — to reach one person\'s answer; (c) an invitation to check it free through the link. Word all three freshly for this video in natural spoken language; there is no fixed sentence to reuse, and a CTA that reads like the same boilerplate appended to every script is rejected. Never require the viewer to know their birth time, never disparage Western astrology, never write a URL, and never close on a definitive statement about the individual viewer.',
    '13. Never create urgency through fear. Do not use danger, warning, running out of time, misfortune, or "if you do not do this" framings, and never promise that something will certainly happen.',
    '14. Never let the video close its own loop: state the general principle and the individual variation, and stop before the viewer could conclude what their own case is. The unanswered question is what takes them to the site.',
    spokenPeriod
      ? `15. The reading covers one week and stays on the feed long afterwards, so body_script opens by saying the dates out loud, exactly as "${spokenPeriod}", in the same sentence that names the tradition. Write them as they are read, never as a week number, and say them in both scripts.`
      : '15. This video is not tied to a week, so never state dates or a period in any field.',
    request.target_type === 'Zodiac_Sign'
      ? `16. This reading is for the sidereal Moon sign ${request.zodiac_sign}, which is usually not the sign the viewer knows from Western astrology, so cta_text says in one clause that the sign meant here is the Moon sign of Indian astrology and that the viewer can check their own free through the link, before or inside part (c) of rule 12.`
      : '16. This video is for every Moon sign, so never tell the viewer to look up which sign they are.',
    localSign
      ? `17. Twelve readings are published the same week and a viewer scrolling past has seconds to tell whether this one is theirs, so the sign is said out loud, written exactly as "${localSign}", in hook_text or in the first sentence of body_script.`
      : '17. This video belongs to no single sign, so never name one.',
    request.target_type === 'Zodiac_Sign'
      ? '18. Say which house the movement falls in for this Moon sign as an ordinal number counted from it, for example "the fourth house". Never write that it falls in "a certain house" or "a particular part of the chart": a reading that does not count the house gives the viewer nothing to check.'
      : '18. This video reads no single chart, so never count a house from a sign.',
    '19. script_65s must stop short of the personal answer: it explains what is happening in the sky and what it means in general, then says that which house it falls in — and therefore what it means for the individual — depends on the birth chart, which the site works out. Never let the viewer feel the video already covered their own case.',
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

  /**
   * Rewrites a script that reads badly, keeping what it claims about the sky and the house so
   * the reading stays true and no new astrology is invented.
   */
  async repairScript(
    target: ReviewTarget,
    lang_code: Language,
    issues: string[],
    pattern: Pattern,
  ): Promise<GeneratedScript> {
    const profile = LANGUAGE_PROFILES[lang_code];
    const prompt = [
      `You are a native ${profile.name} writer fixing narration for a short video about ${profile.tradition}.`,
      'The script below says the right thing but is written badly. Rewrite it so a fluent speaker would read it aloud unchanged.',
      '',
      'What must not change: the astrological content. Keep the same house, the same planet, the same part of life, the same promise. Never add a transit, a number, a date or a term that is not already there, and never remove the invitation to check their own reading free through the link.',
      '',
      'What must change: anything that is not natural speech. One subject per sentence, a predicate that says something about that subject, no clause stitched to a clause with a different subject, no noun phrase standing in for a predicate, consistent register throughout.',
      '',
      `Lengths (hard limits, hook + body + cta combined): ${pattern === '30s' ? profile.length30s : profile.length65s}. hook_text is ${profile.hook} and is spoken in the first two seconds. If it does not fit, drop a whole detail rather than squeezing a sentence until words are missing.`,
      profile.note ?? '',
      '',
      issues.length > 0 ? `A reviewer rejected it for: ${issues.join('; ')}.` : '',
      '',
      `hook: ${target.hook}`,
      `body: ${target.body}`,
      `cta: ${target.cta}`,
      '',
      'Return only the JSON object; no markdown fences, no commentary.',
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await this.generate<Partial<GeneratedScript>>(
      prompt,
      LONG_SCRIPT_SCHEMA,
      DEFAULT_REVIEW_MODELS,
      REVIEW_TIMEOUT_MS,
    );
    return assertScript(raw, 'repaired script');
  }

  /** Flags scripts that pass the lint but do not read as fluent prose in their language. */
  async reviewScripts(targets: ReviewTarget[], lang_code: Language): Promise<ReviewVerdict[]> {
    if (targets.length === 0) return [];

    const configured = (optionalEnv('GEMINI_REVIEW_MODEL') ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const raw = await this.generate<RawReview>(
      buildReviewPrompt(targets, lang_code),
      REVIEW_SCHEMA,
      configured.length > 0 ? configured : DEFAULT_REVIEW_MODELS,
      REVIEW_TIMEOUT_MS,
    );
    const byId = new Map((raw.reviews ?? []).map((review) => [review.id, review]));
    return targets.map((target) => {
      const review = byId.get(target.id);
      if (!review?.verdict) {
        return { id: target.id, verdict: 'broken', reason: 'the reviewer returned no verdict' };
      }
      return {
        id: target.id,
        verdict: review.verdict,
        reason: (review.reason ?? '').trim(),
      };
    });
  }

  private async generate<T>(
    prompt: string,
    schema: object,
    models?: string[],
    timeoutMs = ATTEMPT_TIMEOUT_MS,
  ): Promise<T> {
    let lastError: Error | undefined;
    const candidates = models ?? this.models;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const model = candidates[(attempt - 1) % candidates.length];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            abortSignal: controller.signal,
            httpOptions: { timeout: timeoutMs },
          },
        });

        const text = response.text;
        if (!text) throw new Error('Gemini returned an empty response');

        return JSON.parse(text) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown Gemini error');
        console.error(`Gemini generation attempt ${attempt} (${model}) failed:`, lastError.message);
        if (isGeminiCreditError(lastError)) throw lastError;
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
