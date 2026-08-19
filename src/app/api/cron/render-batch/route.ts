import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { startRender } from '@/lib/render';
import { CreatomateService } from '@/services/creatomate';
import { GoogleSheetsService } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  // Scenario 2 Trigger: Creatomate batch rendering
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheetsService = new GoogleSheetsService();
    const creatomateService = new CreatomateService();
    const pendingRenders = await sheetsService.getPendingRenders();
    let triggered = 0;
    let failed = 0;

    for (const task of pendingRenders) {
      try {
        const scriptOutput = await sheetsService.getScriptOutput(task.task_id);
        if (!scriptOutput) {
          throw new Error(`No script output found for ${task.task_id}`);
        }

        if (task.render_status_20s === 'Pending') {
          await startRender(sheetsService, creatomateService, {
            taskId: task.task_id,
            language: task.lang_code,
            pattern: '20s',
            dayOfWeek: task.day_of_week,
            script: JSON.parse(scriptOutput.script_20s_json),
          });
          triggered += 1;
        }
        if (task.render_status_65s === 'Pending') {
          await startRender(sheetsService, creatomateService, {
            taskId: task.task_id,
            language: task.lang_code,
            pattern: '65s',
            dayOfWeek: task.day_of_week,
            script: JSON.parse(scriptOutput.script_65s_json),
          });
          triggered += 1;
        }
      } catch (taskError) {
        failed += 1;
        const message = taskError instanceof Error ? taskError.message : 'Unknown error';
        console.error(`Render trigger failed for ${task.task_id}:`, message);
        if (task.render_status_20s === 'Pending') {
          await sheetsService.updateRenderStatus(task.task_id, '20s', 'Error');
        }
        if (task.render_status_65s === 'Pending') {
          await sheetsService.updateRenderStatus(task.task_id, '65s', 'Error');
        }
      }
    }

    return NextResponse.json({
      status: 'Render batch initiated',
      processed: pendingRenders.length,
      triggered,
      failed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Render batch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
