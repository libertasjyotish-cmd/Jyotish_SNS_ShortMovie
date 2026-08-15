import { CreatomateService } from '@/services/creatomate';
import { GeneratedScript } from '@/services/gemini';
import { GoogleSheetsService, Language, Pattern, Platform } from '@/services/sheets';

/** Duration the finished video must fall within; TikTok monetization needs >60s. */
export const DURATION_BOUNDS: Record<Pattern, { min: number; max: number }> = {
  '20s': { min: 18, max: 22 },
  '65s': { min: 61, max: 68 },
};

const TARGET_DURATION: Record<Pattern, number> = { '20s': 20, '65s': 65 };

/** 20s videos go to YouTube Shorts / Instagram Reels, 65s videos to TikTok. */
export const TEMPLATE_SOURCE_PLATFORM: Record<Pattern, Platform> = {
  '20s': 'YouTube',
  '65s': 'TikTok',
};

export const MAX_RENDER_ATTEMPTS = 3;

export function isDurationAcceptable(pattern: Pattern, duration: number | undefined): boolean {
  if (duration === undefined) return true;
  const { min, max } = DURATION_BOUNDS[pattern];
  return duration >= min && duration <= max;
}

/** Speed factor that brings a render of `duration` seconds onto the target length. */
export function correctedSpeed(pattern: Pattern, duration: number, currentSpeed: number): number {
  const factor = (currentSpeed * duration) / TARGET_DURATION[pattern];
  return Math.min(Math.max(Number(factor.toFixed(3)), 0.5), 2);
}

export async function resolveTemplateId(
  sheets: GoogleSheetsService,
  language: Language,
  pattern: Pattern,
): Promise<string> {
  const platform = TEMPLATE_SOURCE_PLATFORM[pattern];
  const channel = await sheets.getChannelConfig(language, platform);
  if (!channel) {
    throw new Error(`No ${platform} channel configured for "${language}"`);
  }
  const templateId =
    pattern === '20s' ? channel.creatomate_template_20s : channel.creatomate_template_65s;
  if (!templateId) {
    throw new Error(`No ${pattern} template configured for channel "${channel.channel_id}"`);
  }
  return templateId;
}

/** Starts a render and records its render id, so cron and webhook retries share one path. */
export async function startRender(
  sheets: GoogleSheetsService,
  creatomate: CreatomateService,
  params: {
    taskId: string;
    language: Language;
    pattern: Pattern;
    script: GeneratedScript;
    attempt?: number;
    speed?: number;
  },
): Promise<void> {
  const templateId = await resolveTemplateId(sheets, params.language, params.pattern);
  const response = await creatomate.triggerRender({
    taskId: params.taskId,
    templateId,
    pattern: params.pattern,
    language: params.language,
    scriptData: params.script,
    attempt: params.attempt,
    speed: params.speed,
  });

  await sheets.saveRenderOutput({
    task_id: params.taskId,
    ...(params.pattern === '20s'
      ? { creatomate_render_id_20s: response.renderId }
      : { creatomate_render_id_65s: response.renderId }),
  });
}
