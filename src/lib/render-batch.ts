import { startRender } from '@/lib/render';
import { CreatomateService } from '@/services/creatomate';
import { GoogleSheetsService, Pattern } from '@/services/sheets';

export interface RenderBatchResult {
  processed: number;
  triggered: number;
  failed: number;
}

/** Hands every `Pending` render of a script-complete task to the renderer. */
export async function runRenderBatch(
  sheets: GoogleSheetsService,
  creatomate: CreatomateService,
): Promise<RenderBatchResult> {
  const pendingRenders = await sheets.getPendingRenders();
  let triggered = 0;
  let failed = 0;

  for (const task of pendingRenders) {
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
        await sheets.updateRenderStatus(task.task_id, pattern, 'Error');
      }
    }
  }

  return { processed: pendingRenders.length, triggered, failed };
}
