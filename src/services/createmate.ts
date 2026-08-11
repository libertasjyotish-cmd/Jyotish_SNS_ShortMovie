import { Language } from './sheets';

export interface CreatemateRequest {
  pattern: 'PatternA' | 'PatternB';
  language: Language;
  script: string;
}

export interface CreatemateResult {
  videoUrl: string;
}

export class CreatemateService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.CREATEMATE_API_KEY || '';
  }

  async generateMedia(request: CreatemateRequest): Promise<CreatemateResult> {
    // Stub: Trigger Createmate API to generate both audio and video
    // based on the script and selected template for Pattern A or B
    // Returns the final rendered video URL
    
    return {
      videoUrl: `https://storage.example.com/video/${request.pattern}_${request.language}.mp4`
    };
  }
}
