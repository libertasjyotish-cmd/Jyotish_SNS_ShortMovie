import { GoogleGenAI } from '@google/genai';
import { Language, TargetType } from './sheets';

export interface GenerationRequest {
  week_id: string;
  lang_code: Language;
  target_type: TargetType;
  zodiac_sign?: string; // Optional if target_type is 'All_Signs'
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

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Strict Astrology Rules:
   * 1. No abstract baseless fortunes (e.g., "Lucky this week!").
   * 2. Must base scripts solely on provided "transit_reference".
   * 3. No original interpretations that contradict classical Jyotish.
   * 4. Must explain one planetary movement simply.
   */
  async generateScript(request: GenerationRequest): Promise<GeneratedContent> {
    // Stub: generate script by adhering to strict astrology rules.
    // Ensure 20s script is ~100-120 chars, 65s script is ~350-380 chars.
    
    return {
      week_id: request.week_id,
      lang_code: request.lang_code,
      target_type: request.target_type,
      zodiac_sign: request.zodiac_sign,
      transit_reference: request.transit_reference,
      script_20s: {
        hook_text: '',
        body_script: '',
        cta_text: ''
      },
      script_65s: {
        hook_text: '',
        body_script: '',
        cta_text: ''
      },
      hashtags: ''
    };
  }
}
