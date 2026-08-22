import { optionalEnv, requireEnv } from "@/lib/env";
import { splitBodyIntoSegments, splitSentencesIntoLines } from "@/lib/text";
import { GeneratedScript } from "./gemini";
import { Language, Pattern } from "./sheets";

const DEFAULT_RENDERS_ENDPOINT = "https://api.creatomate.com/v2/renders";

/** Element names every Creatomate template must expose. */
export const TEMPLATE_ELEMENTS = {
  hook: "Hook-Text",
  body: "Body-Text",
  cta: "CTA-Text",
  voiceover: "Voiceover",
  background: "Background-Video",
} as const;

/** Stacked text elements used when the body is shown one sentence at a time. */
export const BODY_SEGMENT_ELEMENTS = [
  "Body-1",
  "Body-2",
  "Body-3",
  "Body-4",
] as const;

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
  /** Total video length in seconds; the template's own duration is dynamic. */
  durationSeconds?: number;
  /** Seconds of video shown before the narration starts. */
  voiceoverStart?: number;
  speed?: number;
  /** Narration length, needed to time the per-sentence body elements. */
  narrationSeconds?: number;
  /** Shows the body one sentence at a time in the Body-1..Body-4 elements. */
  timedBodySegments?: boolean;
  /** Layout defined in code; replaces the editor template when present. */
  source?: Record<string, unknown>;
}

/**
 * Spreads the body sentences over the part of the narration that reads them,
 * assuming the narrator keeps a constant pace across hook, body and CTA.
 */
export function bodySegmentModifications(
  script: GeneratedScript,
  narrationSeconds: number,
  narrationStart: number,
): Record<string, string | number> {
  const segments = splitBodyIntoSegments(
    script.body_script,
    BODY_SEGMENT_ELEMENTS.length,
  );
  const totalChars =
    script.hook_text.length +
      script.body_script.length +
      script.cta_text.length || 1;
  const secondsPerChar = narrationSeconds / totalChars;

  const modifications: Record<string, string | number> = {};
  let cursor = narrationStart + script.hook_text.length * secondsPerChar;

  BODY_SEGMENT_ELEMENTS.forEach((element, index) => {
    const segment = segments[index];
    if (!segment) {
      modifications[element] = "";
      return;
    }
    const duration = segment.length * secondsPerChar;
    modifications[element] = segment;
    modifications[`${element}.time`] = Number(cursor.toFixed(2));
    modifications[`${element}.duration`] = Number(duration.toFixed(2));
    cursor += duration;
  });

  return modifications;
}

export interface RenderResponse {
  renderId: string;
  status:
    | "planned"
    | "waiting"
    | "transcribing"
    | "rendering"
    | "succeeded"
    | "failed";
}

interface CreatomateRender {
  id?: string;
  status?: RenderResponse["status"];
  error_message?: string;
}

export function parseRenderMetadata(
  raw: string | undefined,
): RenderMetadata | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RenderMetadata>;
    if (
      !parsed.taskId ||
      (parsed.pattern !== "20s" && parsed.pattern !== "65s")
    )
      return null;
    return {
      taskId: parsed.taskId,
      pattern: parsed.pattern,
      speed: typeof parsed.speed === "number" ? parsed.speed : 1,
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
    this.apiKey = requireEnv("CREATOMATE_API_KEY");
    this.endpoint =
      optionalEnv("CREATOMATE_RENDERS_ENDPOINT") ?? DEFAULT_RENDERS_ENDPOINT;
    const baseUrl = requireEnv("PUBLIC_BASE_URL").replace(/\/$/, "");
    const secret = encodeURIComponent(requireEnv("CREATOMATE_WEBHOOK_SECRET"));
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

    const payloadBody = request.source
      ? { source: request.source }
      : {
          template_id: request.templateId,
          output_format: "mp4",
          modifications: {
            [TEMPLATE_ELEMENTS.hook]: scriptData.hook_text,
            ...(request.timedBodySegments && request.narrationSeconds
              ? bodySegmentModifications(
                  scriptData,
                  request.narrationSeconds,
                  request.voiceoverStart ?? 0,
                )
              : {
                  [TEMPLATE_ELEMENTS.body]: splitSentencesIntoLines(
                    scriptData.body_script,
                  ),
                }),
            [TEMPLATE_ELEMENTS.cta]: scriptData.cta_text,
            [`${TEMPLATE_ELEMENTS.voiceover}.source`]: request.voiceoverUrl,
            [`${TEMPLATE_ELEMENTS.voiceover}.loop`]: false,
            ...(request.voiceoverStart
              ? {
                  [`${TEMPLATE_ELEMENTS.voiceover}.time`]:
                    request.voiceoverStart,
                }
              : {}),
            ...(request.backgroundUrl
              ? {
                  [`${TEMPLATE_ELEMENTS.background}.source`]:
                    request.backgroundUrl,
                }
              : {}),
            ...(request.durationSeconds
              ? { duration: request.durationSeconds }
              : {}),
          },
        };

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payloadBody,
        webhook_url: this.webhookUrl,
        metadata: JSON.stringify(metadata),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Creatomate render request failed (${response.status}): ${detail}`,
      );
    }

    const payload = (await response.json()) as
      CreatomateRender[] | CreatomateRender;
    const render = Array.isArray(payload) ? payload[0] : payload;
    if (!render?.id) {
      throw new Error("Creatomate render request returned no render id");
    }

    return { renderId: render.id, status: render.status ?? "planned" };
  }

  /** Reads a render's current state, for callers that cannot wait for the webhook. */
  async getRender(renderId: string): Promise<{
    status: RenderResponse["status"];
    url?: string;
    duration?: number;
    errorMessage?: string;
  }> {
    const response = await fetch(`${this.endpoint}/${renderId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Creatomate render lookup failed (${response.status}): ${detail}`,
      );
    }
    const render = (await response.json()) as CreatomateRender & {
      url?: string;
      duration?: number;
    };
    return {
      status: render.status ?? "planned",
      url: render.url,
      duration: render.duration,
      errorMessage: render.error_message,
    };
  }
}
