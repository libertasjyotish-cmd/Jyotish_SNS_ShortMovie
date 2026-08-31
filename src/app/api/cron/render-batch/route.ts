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
      const scriptOutput = await sheetsService.getScriptOutput(task.task_id);

      for (const pattern of ['20s', '65s'] as const) {
        const status = pattern === '20s' ? task.render_status_20s : task.render_status_65s;
        if (status !== 'Pending') continue;

        try {
          if (!scriptOutput) {
            throw new Error(`No script output found for ${task.task_id}`);
          }
          await startRender(sheetsService, creatomateService, {
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
          await sheetsService.updateRenderStatus(task.task_id, pattern, 'Error');
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
