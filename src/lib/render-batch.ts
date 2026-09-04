import { startRender } from '@/lib/render';
import { CreatomateService } from '@/services/creatomate';
import { GoogleSheetsService, Pattern } from '@/services/sheets';

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
  return /quota|rate limit|429|503|ECONNRESET|ETIMEDOUT|aborted|timeout/i.test(message);
}

/**
 * Starting a render costs a Sheets write, and the API allows 60 per minute, so a batch stops
 * well short of that. Whatever is left stays `Pending` and the next run picks it up.
 */
export const MAX_RENDERS_PER_BATCH = 20;

/** Hands `Pending` renders of script-complete tasks to the renderer, up to the batch limit. */
export async function runRenderBatch(
  sheets: GoogleSheetsService,
  creatomate: CreatomateService,
  limit = MAX_RENDERS_PER_BATCH,
): Promise<RenderBatchResult> {
  const pendingRenders = await sheets.getPendingRenders();
  let triggered = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const task of pendingRenders) {
    if (triggered + failed >= limit) {
      skipped += 1;
      continue;
    }
    const scriptOutput = await sheets.getScriptOutput(task.task_id);

    for (const pattern of ['20s', '65s'] as Pattern[]) {
      const status = pattern === '20s' ? task.render_status_20s : task.render_status_65s;
      if (status !== 'Pending') continue;

      try {
        if (!scriptOutput) {
          throw new Error(`No script output found for ${task.task_id}`);
        }
        await startRender(sheets, creatomate, {
          taskId: task.task_id,
          language: task.lang_code,
          pattern,
          dayOfWeek: task.day_of_week,
          script: JSON.parse(
            pattern === '20s' ? scriptOutput.script_20s_json : scriptOutput.script_65s_json,
          ),
        });
        triggered += 1;
      } catch (taskError) {
        failed += 1;
        const message = taskError instanceof Error ? taskError.message : 'Unknown error';
        console.error(`Render trigger failed for ${task.task_id} (${pattern}):`, message);
        errors.push(`${task.task_id} (${pattern}): ${message}`);
        if (!isTransient(message)) {
          await sheets.updateRenderStatus(task.task_id, pattern, 'Error');
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
