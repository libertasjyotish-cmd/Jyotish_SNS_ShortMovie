import { mp3DurationSeconds } from '@/lib/mp3';
import { CreatomateService } from '@/services/creatomate';
import { GeneratedScript } from '@/services/gemini';
import { GoogleSheetsService, Language, Pattern, Platform } from '@/services/sheets';
import { uploadVoiceover } from '@/services/storage';
import { TextToSpeechService } from '@/services/tts';

/** Duration the finished video must fall within; TikTok monetization needs >60s. */
export const DURATION_BOUNDS: Record<Pattern, { min: number; max: number }> = {
  '20s': { min: 18, max: 22 },
  '65s': { min: 61, max: 68 },
};

/** Narration length aimed for; the rest of the pattern budget is visual tail. */
const TARGET_NARRATION: Record<Pattern, number> = { '20s': 19, '65s': 63 };

/** Free TTS passes used to land the narration on its target length. */
export const MAX_TTS_ATTEMPTS = 3;
const NARRATION_TOLERANCE = 0.4;

/** 20s videos go to YouTube Shorts / Instagram Reels, 65s videos to TikTok. */
export const TEMPLATE_SOURCE_PLATFORM: Record<Pattern, Platform> = {
  '20s': 'YouTube',
  '65s': 'TikTok',
};

export function isDurationAcceptable(pattern: Pattern, duration: number | undefined): boolean {
  if (duration === undefined) return true;
  const { min, max } = DURATION_BOUNDS[pattern];
  return duration >= min && duration <= max;
}

/** Speaking rate that brings narration of `duration` seconds onto the target length. */
export function correctedSpeed(pattern: Pattern, duration: number, currentSpeed: number): number {
  const factor = (currentSpeed * duration) / TARGET_NARRATION[pattern];
  return Math.min(Math.max(Number(factor.toFixed(3)), 0.5), 2);
}

/**
 * Synthesizes the narration and re-synthesizes at a corrected speaking rate until it
 * fits the pattern. Doing this before rendering keeps Creatomate to one billed render.
 */
export async function synthesizeNarration(
  text: string,
  language: Language,
  pattern: Pattern,
): Promise<{ audio: Buffer; speed: number; duration: number }> {
  const tts = new TextToSpeechService();
  let speed = 1;

  for (let attempt = 1; ; attempt += 1) {
    const audio = await tts.synthesize(text, language, speed);
    const duration = mp3DurationSeconds(audio);
    const offBy = Math.abs(duration - TARGET_NARRATION[pattern]);
    const nextSpeed = correctedSpeed(pattern, duration, speed);

    if (
      duration === 0 ||
      offBy <= NARRATION_TOLERANCE ||
      attempt >= MAX_TTS_ATTEMPTS ||
      nextSpeed === speed
    ) {
      return { audio, speed, duration };
    }
    speed = nextSpeed;
  }
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

export function narrationText(script: GeneratedScript): string {
  return [script.hook_text, script.body_script, script.cta_text].join('\n');
}

/** Spreads tasks over the available background videos without needing shared state. */
export function pickBackground(taskId: string, urls: string[]): string | undefined {
  if (urls.length === 0) return undefined;
  let hash = 0;
  for (const char of taskId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1_000_003;
  }
  return urls[hash % urls.length];
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
    dayOfWeek?: string;
  },
): Promise<void> {
  const templateId = await resolveTemplateId(sheets, params.language, params.pattern);

  const { audio, speed } = await synthesizeNarration(
    narrationText(params.script),
    params.language,
    params.pattern,
  );
  const voiceoverUrl = await uploadVoiceover(
    `voiceover/${params.taskId}-${params.pattern}.mp3`,
    audio,
  );

  const assets = await sheets.getBackgroundAssets({
    lang_code: params.language,
    day_of_week: params.dayOfWeek,
    pattern: params.pattern,
  });

  const response = await creatomate.triggerRender({
    taskId: params.taskId,
    templateId,
    pattern: params.pattern,
    language: params.language,
    scriptData: params.script,
    voiceoverUrl,
    backgroundUrl: pickBackground(params.taskId, assets.map((asset) => asset.video_url)),
    speed,
  });

  await sheets.saveRenderOutput({
    task_id: params.taskId,
    ...(params.pattern === '20s'
      ? { creatomate_render_id_20s: response.renderId }
      : { creatomate_render_id_65s: response.renderId }),
  });
}
