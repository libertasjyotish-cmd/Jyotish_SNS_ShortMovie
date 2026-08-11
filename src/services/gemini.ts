import { GoogleGenAI } from '@google/genai';
import { Language } from './sheets';

export interface GenerationRequest {
  type: 'FORECAST' | 'THEME';
  targetGroup: string;
  themeContext?: string;
}

export interface GeneratedContent {
  scripts_pattern_a: Record<Language, string>;
  scripts_pattern_b: Record<Language, string>;
}

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async generateScripts(request: GenerationRequest): Promise<GeneratedContent> {
    // Stub: 16 bases * 2 patterns * 6 languages (including AR instead of ZH)
    // using @google/genai structured outputs
    
    // Example languages: JP, EN, ES, PT, ID, AR
    
    return {
      scripts_pattern_a: { JP: '', EN: '', ES: '', PT: '', ID: '', AR: '' },
      scripts_pattern_b: { JP: '', EN: '', ES: '', PT: '', ID: '', AR: '' }
    };
  }
}
