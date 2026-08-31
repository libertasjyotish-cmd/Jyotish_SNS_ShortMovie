import { GoogleAuth } from 'google-auth-library';
import { optionalEnv, requireEnv } from '@/lib/env';
import { getGoogleCredentials } from '@/lib/google-credentials';
import { GeneratedScript } from './gemini';
import { Language, Pattern } from './sheets';

export interface RendererRequest {
  taskId: string;
  language: Language;
  pattern: Pattern;
  script: GeneratedScript;
  backgroundUrl: string;
  note?: string;
  /** Duration window the renderer fits the speaking rate to. */
  target: { min: number; max: number };
  /** When set, the renderer answers immediately and posts the result here when done. */
  callbackUrl?: string;
}

export interface RendererResult {
  url: string;
  duration: number;
  segments: string[];
}

/** Cloud Run keeps the whole render synchronous; a 20s clip takes ~2.5 minutes. */
const RENDER_TIMEOUT_MS = 280_000;
/** Handing a render over only costs a TTS-free round trip. */
const ACCEPT_TIMEOUT_MS = 30_000;

export function isRendererConfigured(): boolean {
  return Boolean(optionalEnv('RENDERER_URL'));
}

/**
 * Renders through the self-hosted ffmpeg service on Cloud Run.
 *
 * Cloud Run's IAM check owns the `Authorization` header, so the application's own
 * shared secret travels in `X-Cron-Secret`.
 */
export class RendererService {
  private readonly baseUrl: string;
  private readonly auth: GoogleAuth;

  constructor() {
    this.baseUrl = requireEnv('RENDERER_URL').replace(/\/$/, '');
    const { client_email, private_key } = getGoogleCredentials();
    this.auth = new GoogleAuth({ credentials: { client_email, private_key } });
  }

  private async identityToken(): Promise<string> {
    const client = await this.auth.getIdTokenClient(this.baseUrl);
    const headers = await client.getRequestHeaders();
    const header = headers.get('authorization');
    if (!header) {
      throw new Error('Cloud Run identity token could not be issued');
    }
    return header.replace(/^Bearer /, '');
  }

  /** Hands the render over and returns as soon as it is accepted (HTTP 202). */
  async start(request: RendererRequest & { callbackUrl: string }): Promise<void> {
    await this.post(request, ACCEPT_TIMEOUT_MS);
  }

  async render(request: RendererRequest): Promise<RendererResult> {
    const text = await this.post(request, RENDER_TIMEOUT_MS);
    return JSON.parse(text) as RendererResult;
  }

  private async post(request: RendererRequest, timeoutMs: number): Promise<string> {
    const token = await this.identityToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/render`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Cron-Secret': requireEnv('CRON_SECRET'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: `${request.taskId}-${request.pattern}`,
          language: request.language,
          background_url: request.backgroundUrl,
          hook: request.script.hook_text,
          body: request.script.body_script,
          cta: request.script.cta_text,
          note: request.note,
          output_path: `renders/${request.taskId}-${request.pattern}.mp4`,
          queue_task_id: request.taskId,
          pattern: request.pattern,
          callback_url: request.callbackUrl,
          target_min: request.target.min,
          target_max: request.target.max,
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Renderer failed (${response.status}): ${text.slice(0, 300)}`);
      }
      return text;
    } finally {
      clearTimeout(timer);
    }
  }
}
