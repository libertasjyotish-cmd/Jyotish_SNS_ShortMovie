import { SCHEDULED_PATTERNS } from "@/lib/patterns";
import { weekPeriodLabel } from "@/lib/period";
import { zodiacName } from "@/lib/zodiac-names";
import { startRender } from "@/lib/render";
import { CreatomateService } from "@/services/creatomate";
import { GoogleSheetsService, Pattern } from "@/services/sheets";

export interface RenderBatchResult {
  processed: number;
  triggered: number;
  failed: number;
  remaining: number;
  /** Why renders failed, so a cron response explains itself without reading the logs. */
  errors: string[];
}

/**
 * Rate limits and dropped connections say nothing about the task, so those renders stay
 * `Pending` and are retried on the next run instead of counting an attempt against them.
 */
function isTransient(message: string): boolean {
  return /quota|rate limit|429|503|ECONNRESET|ETIMEDOUT|aborted|timeout/i.test(
    message,
  );
}

/**
 * Starting a render costs a Sheets write, and the API allows 60 per minute, so a batch stops
 * well short of that. Whatever is left stays `Pending` and the next run picks it up.
 */
export const MAX_RENDERS_PER_BATCH = 20;

/**
 * The renderer runs one render per Cloud Run instance and scales to 10, so anything started
 * beyond that sits in Cloud Run's request queue while this function holds the connection open,
 * which times the cron out and leaves rows stuck in `Rendering` with no render behind them.
 */
export const RENDERER_CAPACITY = 8;

export interface RenderBatchOptions {
  limit?: number;
  patterns?: Pattern[];
  /**
   * Renders only these tasks. Pending renders are taken in sheet order, so a slot that is
   * needed tomorrow but was appended after a whole planned week would otherwise wait for
   * every earlier row to clear.
   */
  taskIds?: string[];
}

/** Hands `Pending` renders of script-complete tasks to the renderer, up to the batch limit. */
export async function runRenderBatch(
  sheets: GoogleSheetsService,
  creatomate: CreatomateService,
  {
    limit = MAX_RENDERS_PER_BATCH,
    patterns = SCHEDULED_PATTERNS,
    taskIds,
  }: RenderBatchOptions = {},
): Promise<RenderBatchResult> {
  const all = await sheets.getPendingRenders(patterns);
  const pendingRenders = taskIds
    ? all.filter((task) => taskIds.includes(task.task_id))
    : all;
  const running = await sheets.countRunningRenders();
  const effectiveLimit = Math.max(
    0,
    Math.min(limit, RENDERER_CAPACITY - running),
  );
  let triggered = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const task of pendingRenders) {
    if (triggered + failed >= effectiveLimit) {
      skipped += 1;
      continue;
    }
    const scriptOutput = await sheets.getScriptOutput(task.task_id);

    for (const pattern of patterns) {
      const status =
        pattern === "30s" ? task.render_status_30s : task.render_status_65s;
      if (status !== "Pending") continue;

      try {
        if (!scriptOutput) {
          throw new Error(`No script output found for ${task.task_id}`);
        }
        await startRender(sheets, creatomate, {
          taskId: task.task_id,
          language: task.lang_code,
          pattern,
          dayOfWeek: task.day_of_week,
          // A sign-targeted evergreen names its sign but no week, because it applies whenever
          // it is watched; only the weekly readings carry the dates they cover.
          period:
            [
              zodiacName(task.zodiac_sign, task.lang_code),
              task.target_type === "Zodiac_Sign"
                ? weekPeriodLabel(task.week_id, task.lang_code)
                : undefined,
            ]
              .filter(Boolean)
              .join("\n") || undefined,
          script: JSON.parse(
            pattern === "30s"
              ? scriptOutput.script_30s_json
              : scriptOutput.script_65s_json,
          ),
        });
        triggered += 1;
      } catch (taskError) {
        failed += 1;
        const message =
          taskError instanceof Error ? taskError.message : "Unknown error";
        console.error(
          `Render trigger failed for ${task.task_id} (${pattern}):`,
          message,
        );
        errors.push(`${task.task_id} (${pattern}): ${message}`);
        if (!isTransient(message)) {
          await sheets.updateRenderStatus(task.task_id, pattern, "Error");
        }
      }
    }
  }

  return {
    processed: pendingRenders.length - skipped,
    triggered,
    failed,
    remaining: skipped,
    errors: errors.slice(0, 5),
  };
}
