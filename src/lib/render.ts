import { CTA_NOTES } from '@/lib/cta';
import { optionalEnv } from '@/lib/env';
import { mp3DurationSeconds } from '@/lib/mp3';
import { applyReadingHints } from '@/lib/reading';
import { DAY_OFFSET, DayOfWeek, PROMO_SCRIPT_PREFIX } from '@/lib/schedule';
import { SIGN_THEME_SERIES } from '@/lib/sign-themes';
import { ZODIAC_SIGNS } from '@/lib/zodiac-names';
import { CreatomateService } from '@/services/creatomate';
import { GeneratedScript } from '@/services/gemini';
import { RendererService, isRendererConfigured } from '@/services/renderer';
import { BackgroundAsset, GoogleSheetsService, Language, Pattern, Platform } from '@/services/sheets';
import { uploadVoiceover } from '@/services/storage';
import { TextToSpeechService } from '@/services/tts';

/** Duration the finished video must fall within; TikTok monetization needs >60s. */
export const DURATION_BOUNDS: Record<Pattern, { min: number; max: number }> = {
  '30s': { min: 26, max: 46 },
  '65s': { min: 61, max: 68 },
};

/** Narration length aimed for; the rest of the pattern budget is visual tail. */
const TARGET_NARRATION: Record<Pattern, number> = { '30s': 38, '65s': 61 };

/** Free TTS passes used to land the narration on its target length. */
export const MAX_TTS_ATTEMPTS = 3;
const NARRATION_TOLERANCE = 0.4;
/** Silent tail kept after the narration ends. */
const OUTRO_SECONDS = 0.8;
/** Lead-in before the narration starts, so the opening word is never clipped. */
export const INTRO_SECONDS = 2;

/** 30s videos go to YouTube Shorts / Instagram Reels, 65s videos to TikTok. */
export const TEMPLATE_SOURCE_PLATFORM: Record<Pattern, Platform> = {
  '30s': 'YouTube',
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
    const audio = await tts.synthesize(applyReadingHints(text, language), language, speed);
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
    pattern === '30s' ? channel.creatomate_template_30s : channel.creatomate_template_65s;
  if (!templateId) {
    throw new Error(`No ${pattern} template configured for channel "${channel.channel_id}"`);
  }
  return templateId;
}

export function narrationText(script: GeneratedScript): string {
  return [script.hook_text, script.body_script, script.cta_text].join('\n');
}

function stableHash(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1_000_003;
  }
  return hash;
}

/** Slots a week takes up: the four theme days plus the twelve sign readings. */
const SLOTS_PER_WEEK = 16;

/** A task id ends in the script id it was planned from, so a promotion is told apart by it. */
function isPromoTaskId(taskId: string): boolean {
  return taskId.includes(`-${PROMO_SCRIPT_PREFIX}`);
}

/** Place of a promotion among the promotions its day publishes, counted in task id order. */
function promoOrdinal(taskId: string, daySiblings: string[] | undefined): number {
  const ids = [taskId, ...(daySiblings ?? [])].filter(isPromoTaskId);
  const promos = ids.filter((id, index) => ids.indexOf(id) === index).sort();
  return Math.max(promos.indexOf(taskId), 0);
}

/** Traits that decide how a background looks: its `visual_group` and how bright it is. */
function traitsOf(asset: BackgroundAsset): string[] {
  const brightness = asset.brightness ?? 0;
  return [
    `group:${asset.visual_group || asset.asset_id}`,
    `tone:${brightness >= 150 ? 'bright' : brightness >= 90 ? 'mid' : 'dark'}`,
  ];
}

const TRAIT_WEIGHT = [1.5, 1];

/**
 * Orders the library so that neither look nor brightness comes up in runs. Assets sit in upload
 * order, which groups them by look and leaves the few bright ones bunched together, so walking
 * the list shows the same picture (and the same darkness) several slots in a row even though
 * every file differs.
 *
 * Each asset is placed by picking, from what is left, the one whose traits have gone unused the
 * longest relative to how common they are: a trait held by a third of the library scores full
 * marks once three slots have passed, one held by a tenth needs ten. That spaces every trait out
 * in proportion to its stock, which is the most even a lopsided library allows.
 */
export function balancedOrder(assets: BackgroundAsset[]): string[] {
  const stock = new Map<string, number>();
  for (const asset of assets) {
    for (const trait of traitsOf(asset)) stock.set(trait, (stock.get(trait) ?? 0) + 1);
  }

  const total = assets.length;
  const pool = [...assets].sort((a, b) => a.asset_id.localeCompare(b.asset_id));
  const lastUsed = new Map<string, number>();
  const order: string[] = [];

  while (pool.length > 0) {
    const slot = order.length;
    let bestIndex = 0;
    let bestScore = -Infinity;
    pool.forEach((asset, index) => {
      const score = traitsOf(asset).reduce((sum, trait, i) => {
        const gap = slot - (lastUsed.get(trait) ?? -total);
        return sum + TRAIT_WEIGHT[i] * Math.min(1, (gap * (stock.get(trait) ?? 1)) / total);
      }, 0);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    const [picked] = pool.splice(bestIndex, 1);
    for (const trait of traitsOf(picked)) lastUsed.set(trait, slot);
    order.push(picked.video_url);
  }
  return order;
}

/**
 * Walks the background videos in the order the week's videos go out, one asset per slot, so the
 * whole library is cycled through evenly instead of being sampled at random: every asset comes
 * up once per cycle and no two videos of a week share a background.
 */
export function pickBackground(
  taskId: string,
  assets: BackgroundAsset[],
  dayOfWeek?: string,
  /** Task ids of the other videos the same language publishes on the same day. */
  daySiblings?: string[],
): string | undefined {
  if (assets.length === 0) return undefined;
  const urls = balancedOrder(assets);

  const week = /-W(\d{2})/.exec(taskId);
  const day = dayOfWeek ? DAY_OFFSET[dayOfWeek as DayOfWeek] : undefined;
  if (!week || day === undefined) return urls[stableHash(taskId) % urls.length];

  // A sign-targeted evergreen ends in a sign too, but it takes the slot of its weekday: the
  // three series of one sign go out on the Monday, Tuesday and Wednesday of the same week, and
  // consecutive slots are what the balanced order keeps apart. Reading it as a sign instead
  // would hand all three, and the sign's own weekly reading, the same background.
  const isSignTheme = SIGN_THEME_SERIES.some((series) => taskId.includes(`-sign-${series}-`));
  const sign = isSignTheme
    ? -1
    : ZODIAC_SIGNS.indexOf((taskId.split('-').pop() ?? '') as (typeof ZODIAC_SIGNS)[number]);
  const slot = sign >= 0 ? 4 + sign : day;
  const index = (Number(week[1]) * SLOTS_PER_WEEK + slot) % urls.length;

  // The promotions share their weekday with each other, so the slot of the weekday alone hands
  // them one artwork: the feed then shows the day as the same video posted twice. Each promotion
  // is stepped off the weekday slot by its place among the day's promotions, which is its place
  // among the day's task ids - stable once the week is planned, so the cover drawn after the
  // render lands on the same artwork as the video.
  const promoStep = isPromoTaskId(taskId) ? 1 + promoOrdinal(taskId, daySiblings) : 0;
  return urls[(index + promoStep) % urls.length];
}

/**
 * Background a task's video is built on. The pick is derived from the task alone, so asking
 * again after the render - to draw the cover on the same artwork - returns the same asset.
 */
export async function resolveBackgroundUrl(
  sheets: GoogleSheetsService,
  params: { taskId: string; language: Language; pattern: Pattern; dayOfWeek?: string },
): Promise<string | undefined> {
  const assets = await sheets.getBackgroundAssets({
    lang_code: params.language,
    day_of_week: params.dayOfWeek,
    pattern: params.pattern,
  });
  return pickBackground(
    params.taskId,
    assets,
    params.dayOfWeek,
    await daySiblingTaskIds(sheets, params),
  );
}

/**
 * Task ids the language already has planned for the same day. Only a promotion needs them - it is
 * the one kind of video a day carries more than one of - so the queue is left unread otherwise.
 */
async function daySiblingTaskIds(
  sheets: GoogleSheetsService,
  params: { taskId: string; language: Language; dayOfWeek?: string },
): Promise<string[] | undefined> {
  const weekId = /^(\d{4}-W\d{2})/.exec(params.taskId)?.[1];
  if (!weekId || !params.dayOfWeek || !isPromoTaskId(params.taskId)) return undefined;
  const tasks = await sheets.getQueueTasks(weekId);
  return tasks
    .filter((task) => task.lang_code === params.language && task.day_of_week === params.dayOfWeek)
    .map((task) => task.task_id);
}

/** Where the renderer reports a finished video; empty when the base URL is unknown. */
export function rendererCallbackUrl(): string | undefined {
  const base = optionalEnv('PUBLIC_BASE_URL');
  return base ? `${base.replace(/\/$/, '')}/api/webhook/renderer` : undefined;
}

/**
 * Renders on Cloud Run, which synthesizes the narration itself. A 65s render takes longer
 * than any serverless request may live, so the render is handed over with a callback and
 * `/api/webhook/renderer` closes the queue row out later.
 */
async function renderOnCloudRun(
  sheets: GoogleSheetsService,
  params: {
    taskId: string;
    language: Language;
    pattern: Pattern;
    script: GeneratedScript;
    dayOfWeek?: string;
    period?: string;
  },
): Promise<void> {
  const backgroundUrl = await resolveBackgroundUrl(sheets, params);
  if (!backgroundUrl) {
    throw new Error(`No background asset available for "${params.language}"`);
  }

  const request = {
    taskId: params.taskId,
    language: params.language,
    pattern: params.pattern,
    script: params.script,
    backgroundUrl,
    note: CTA_NOTES[params.language],
    period: params.period,
    target: DURATION_BOUNDS[params.pattern],
  };

  // The pick is derived from the asset list, so a background added between the render and the
  // cover would move it: the still every platform lists the video with would then show a
  // different artwork than the video itself. The asset used is stored with the render instead.
  if (params.pattern === '30s') {
    await sheets.saveRenderOutput({ task_id: params.taskId, background_url: backgroundUrl });
  }

  const callbackUrl = rendererCallbackUrl();
  if (callbackUrl) {
    await new RendererService().start({ ...request, callbackUrl });
    await sheets.markRenderStarted(params.taskId, params.pattern);
    return;
  }

  const result = await new RendererService().render(request);

  await sheets.saveRenderOutput({
    task_id: params.taskId,
    rendered_at: new Date().toISOString(),
    ...(params.pattern === '30s'
      ? { video_url_30s: result.url, duration_30s: result.duration }
      : { video_url_65s: result.url, duration_65s: result.duration }),
  });
  await sheets.updateRenderStatus(params.taskId, params.pattern, 'Rendered');
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
    /** Dated week a sign reading covers; the renderer draws it on the video. */
    period?: string;
  },
): Promise<void> {
  if (isRendererConfigured()) {
    return renderOnCloudRun(sheets, params);
  }

  const templateId = await resolveTemplateId(sheets, params.language, params.pattern);

  const { audio, speed, duration } = await synthesizeNarration(
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
    backgroundUrl: pickBackground(params.taskId, assets, params.dayOfWeek),
    durationSeconds:
      duration > 0 ? Number((INTRO_SECONDS + duration + OUTRO_SECONDS).toFixed(2)) : undefined,
    voiceoverStart: INTRO_SECONDS,
    speed,
  });

  await sheets.saveRenderOutput({
    task_id: params.taskId,
    ...(params.pattern === '30s'
      ? { creatomate_render_id_30s: response.renderId }
      : { creatomate_render_id_65s: response.renderId }),
  });
}
