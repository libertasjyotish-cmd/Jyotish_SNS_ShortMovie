import { weekPeriodLabel } from '@/lib/period';
import { resolveBackgroundUrl } from '@/lib/render';
import { parseSignThemeId } from '@/lib/sign-themes';
import { buildCoverText } from '@/lib/youtube-seo';
import { zodiacName } from '@/lib/zodiac-names';
import { CoverResult, isRendererConfigured, RendererService } from '@/services/renderer';
import { ContentQueue, GoogleSheetsService, RenderOutput } from '@/services/sheets';

/**
 * The still every platform lists the video with. Drawing it means downloading the background
 * asset and decoding its first frame, which on a cold renderer takes longer than the posting
 * request may wait: the cover is therefore drawn once the video is rendered - hours before the
 * slot airs - and stored, so posting only reads a URL.
 *
 * A cover is decoration: when it cannot be drawn the post goes out with whatever frame the
 * platform picks for itself.
 */
export async function ensureCover(args: {
  sheets: GoogleSheetsService;
  task: ContentQueue;
  hook: string;
  /** Row the render wrote, holding the cover and the background the video was built on. */
  renderOutput?: RenderOutput | null;
  timeoutMs?: number;
}): Promise<CoverResult | undefined> {
  const { sheets, task, hook, renderOutput } = args;
  const stored = storedCover(renderOutput);
  if (stored) return stored;
  if (!isRendererConfigured()) return undefined;

  try {
    const backgroundUrl =
      renderOutput?.background_url ??
      (await resolveBackgroundUrl(sheets, {
        taskId: task.task_id,
        language: task.lang_code,
        pattern: '30s',
        dayOfWeek: task.day_of_week,
      }));
    if (!backgroundUrl) return undefined;

    const signName = zodiacName(task.zodiac_sign, task.lang_code);
    const cover = await new RendererService().cover(
      {
        taskId: task.task_id,
        language: task.lang_code,
        backgroundUrl,
        ...buildCoverText({
          lang: task.lang_code,
          zodiacSign: signName,
          period:
            task.target_type === 'Zodiac_Sign'
              ? weekPeriodLabel(task.week_id, task.lang_code)
              : undefined,
          series: task.theme_id ? parseSignThemeId(task.theme_id)?.series : undefined,
          hook,
        }),
      },
      args.timeoutMs,
    );

    await sheets.saveRenderOutput({
      task_id: task.task_id,
      cover_url: cover.url,
      cover_wide_url: cover.wide_url,
    });
    return cover;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${task.task_id} cover failed:`, message);
    return undefined;
  }
}

function storedCover(renderOutput: RenderOutput | null | undefined): CoverResult | undefined {
  const url = renderOutput?.cover_url;
  const wide = renderOutput?.cover_wide_url;
  return url && wide ? { url, wide_url: wide } : undefined;
}
