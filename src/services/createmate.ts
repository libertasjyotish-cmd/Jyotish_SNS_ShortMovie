import { Language } from './sheets';
import { GeneratedScript } from './gemini';

export interface RenderRequest {
  taskId: string;
  templateId: string; // creatomate_template_20s or creatomate_template_65s
  pattern: '20s' | '65s';
  language: Language;
  scriptData: GeneratedScript;
}

export interface RenderResponse {
  renderId: string;
  status: 'rendering' | 'succeeded' | 'failed';
}

export class CreatemateService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.CREATEMATE_API_KEY || '';
  }

  async triggerRender(request: RenderRequest): Promise<RenderResponse> {
    // Stub: Trigger Createmate API to generate video
    // Requires inserting TTS parameters, dynamic text fields (telop), and background video
    // Target duration bounds: 65s pattern must be strictly between 61s and 68s (adjusting TTS speed).
    
    // For 65s: TTS Speed adjustment logic goes here
    
    return {
      renderId: `cm_render_${request.taskId}_${request.pattern}`,
      status: 'rendering'
    };
  }
}
