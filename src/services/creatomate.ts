import { optionalEnv, requireEnv } from '@/lib/env';
import { GeneratedScript } from './gemini';
import { Language, Pattern } from './sheets';

const DEFAULT_RENDERS_ENDPOINT = 'https://api.creatomate.com/v2/renders';

/** Element names every Creatomate template must expose. */
export const TEMPLATE_ELEMENTS = {
  hook: 'Hook-Text',
  body: 'Body-Text',
  cta: 'CTA-Text',
  voiceover: 'Voiceover',
  background: 'Background-Video',
} as const;

export interface RenderMetadata {
  taskId: string;
  pattern: Pattern;
  /** Speaking rate the narration was synthesized at, kept for diagnostics. */
  speed: number;
}

export interface RenderRequest {
  taskId: string;
  templateId: string;
  pattern: Pattern;
  language: Language;
  scriptData: GeneratedScript;
  /** Narration MP3 rendered by Google Cloud TTS and hosted on Vercel Blob. */
  voiceoverUrl: string;
  backgroundUrl?: string;
  speed?: number;
}

export interface RenderResponse {
  renderId: string;
  status: 'planned' | 'waiting' | 'transcribing' | 'rendering' | 'succeeded' | 'failed';
}

interface CreatomateRender {
  id?: string;
  status?: RenderResponse['status'];
  error_message?: string;
}

export function parseRenderMetadata(raw: string | undefined): RenderMetadata | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RenderMetadata>;
    if (!parsed.taskId || (parsed.pattern !== '20s' && parsed.pattern !== '65s')) return null;
    return {
      taskId: parsed.taskId,
      pattern: parsed.pattern,
      speed: typeof parsed.speed === 'number' ? parsed.speed : 1,
    };
  } catch {
    return null;
  }
}

export class CreatomateService {
  private apiKey: string;
  private endpoint: string;
  private webhookUrl: string;

  constructor() {
    this.apiKey = requireEnv('CREATOMATE_API_KEY');
    this.endpoint = optionalEnv('CREATOMATE_RENDERS_ENDPOINT') ?? DEFAULT_RENDERS_ENDPOINT;
    const baseUrl = requireEnv('PUBLIC_BASE_URL').replace(/\/$/, '');
    const secret = encodeURIComponent(requireEnv('CREATOMATE_WEBHOOK_SECRET'));
    this.webhookUrl = `${baseUrl}/api/webhook/creatomate?secret=${secret}`;
  }

  async triggerRender(request: RenderRequest): Promise<RenderResponse> {
    const { scriptData } = request;
    const speed = request.speed ?? 1;
    const metadata: RenderMetadata = {
      taskId: request.taskId,
      pattern: request.pattern,
      speed,
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: request.templateId,
        output_format: 'mp4',
        modifications: {
          [TEMPLATE_ELEMENTS.hook]: scriptData.hook_text,
          [TEMPLATE_ELEMENTS.body]: scriptData.body_script,
          [TEMPLATE_ELEMENTS.cta]: scriptData.cta_text,
          [`${TEMPLATE_ELEMENTS.voiceover}.source`]: request.voiceoverUrl,
          ...(request.backgroundUrl
            ? { [`${TEMPLATE_ELEMENTS.background}.source`]: request.backgroundUrl }
            : {}),
        },
        webhook_url: this.webhookUrl,
        metadata: JSON.stringify(metadata),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Creatomate render request failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as CreatomateRender[] | CreatomateRender;
    const render = Array.isArray(payload) ? payload[0] : payload;
    if (!render?.id) {
      throw new Error('Creatomate render request returned no render id');
    }

    return { renderId: render.id, status: render.status ?? 'planned' };
  }
}
