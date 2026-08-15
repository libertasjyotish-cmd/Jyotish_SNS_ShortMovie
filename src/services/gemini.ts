import { GoogleGenAI, Type } from '@google/genai';
import { optionalEnv, requireEnv } from '@/lib/env';
import { Language, TargetType } from './sheets';

const DEFAULT_MODEL = 'gemini-flash-latest';
const MAX_ATTEMPTS = 2;

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
  /** Narration length targets, expressed in the unit natural for the script. */
  length20s: string;
  length65s: string;
  note?: string;
}

const LANGUAGE_PROFILES: Record<Language, LanguageProfile> = {
  ja: { name: '日本語', length20s: '合計100〜120文字', length65s: '合計350〜380文字' },
  en: { name: 'English', length20s: '45-55 words in total', length65s: '160-180 words in total' },
  es: { name: 'Español', length20s: '45-55 palabras en total', length65s: '160-180 palabras en total' },
  pt: { name: 'Português', length20s: '45-55 palavras no total', length65s: '160-180 palavras no total' },
  id: {
    name: 'Bahasa Indonesia',
    length20s: 'total 45-55 kata',
    length65s: 'total 160-180 kata',
  },
  ar: {
    name: 'العربية',
    length20s: '45-55 كلمة إجمالاً',
    length65s: '160-180 كلمة إجمالاً',
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

interface RawGeneration {
  script_20s?: Partial<GeneratedScript>;
  script_65s?: Partial<GeneratedScript>;
  hashtags?: string;
}

function assertScript(script: Partial<GeneratedScript> | undefined, label: string): GeneratedScript {
  if (!script?.hook_text || !script.body_script || !script.cta_text) {
    throw new Error(`Gemini returned an incomplete ${label}`);
  }
  return {
    hook_text: script.hook_text.trim(),
    body_script: script.body_script.trim(),
    cta_text: script.cta_text.trim(),
  };
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
    '5. The CTA invites viewers to the Libertas Jyotish app (https://www.libertas-jyotish.com/) for their personal reading.',
    '',
    `Write the narration in ${profile.name}. Output every text field in ${profile.name}.`,
    profile.note ?? '',
    '',
    `Week: ${request.week_id}`,
    `Audience: ${audience}`,
    `Transit reference (the only allowed factual source):\n${request.transit_reference}`,
    '',
    'Produce two narration scripts for the same content:',
    `- script_20s: spoken in about 20 seconds, ${profile.length20s} (hook_text + body_script + cta_text combined). Structure: 2-second hook, one sentence on the planetary movement, one concrete action, app CTA.`,
    `- script_65s: spoken in 61-68 seconds, ${profile.length65s} (hook_text + body_script + cta_text combined). Structure: hook, why the sidereal Moon sign matters, the transit and its house, detailed outlook and a caution, app CTA.`,
    '',
    'hashtags: 4-6 space-separated hashtags suitable for the target language, always including #LibertasJyotish.',
    'Return only the JSON object; no markdown fences, no commentary.',
  ]
    .filter(Boolean)
    .join('\n');
}

export class GeminiService {
  private ai: GoogleGenAI;
  private model: string;

  /**
   * Strict Astrology Rules:
   * 1. No abstract baseless fortunes (e.g., "Lucky this week!").
   * 2. Must base scripts solely on provided "transit_reference".
   * 3. No original interpretations that contradict classical Jyotish.
   * 4. Must explain one planetary movement simply.
   */
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
    this.model = optionalEnv('GEMINI_MODEL') ?? DEFAULT_MODEL;
  }

  async generateScript(request: GenerationRequest): Promise<GeneratedContent> {
    const prompt = buildPrompt(request);
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            temperature: 0.7,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        });

        const text = response.text;
        if (!text) throw new Error('Gemini returned an empty response');

        const raw = JSON.parse(text) as RawGeneration;
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
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown Gemini error');
        console.error(`Gemini generation attempt ${attempt} failed:`, lastError.message);
      }
    }

    throw lastError ?? new Error('Gemini generation failed');
  }
}
