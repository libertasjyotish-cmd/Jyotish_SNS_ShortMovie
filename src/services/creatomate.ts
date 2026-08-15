import { Language, Pattern } from './sheets';
import { GeneratedScript } from './gemini';

export interface RenderRequest {
  taskId: string;
  templateId: string;
  pattern: Pattern;
  language: Language;
  scriptData: GeneratedScript;
}

export interface RenderResponse {
  renderId: string;
  status: 'rendering' | 'succeeded' | 'failed';
}

export class CreatomateService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.CREATOMATE_API_KEY || '';
  }

  async triggerRender(request: RenderRequest): Promise<RenderResponse> {
    // Stub: Trigger Creatomate API to generate video
    // Requires inserting TTS parameters, dynamic text fields (telop), and background video
    // Target duration bounds: 65s pattern must be strictly between 61s and 68s (adjusting TTS speed).

    return {
      renderId: `cm_render_${request.taskId}_${request.pattern}`,
      status: 'rendering',
    };
  }
}
