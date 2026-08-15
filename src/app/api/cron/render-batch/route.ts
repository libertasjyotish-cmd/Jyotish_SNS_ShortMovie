import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { CreatomateService } from '@/services/creatomate';
import { GeneratedScript } from '@/services/gemini';
import { ContentQueue, GoogleSheetsService, Pattern } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** 20s videos go to YouTube Shorts / Instagram Reels, 65s videos to TikTok. */
const TEMPLATE_SOURCE_PLATFORM = { '20s': 'YouTube', '65s': 'TikTok' } as const;

export async function GET(request: Request) {
  // Scenario 2 Trigger: Creatomate batch rendering
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheetsService = new GoogleSheetsService();
  const creatomateService = new CreatomateService();

  const renderPattern = async (task: ContentQueue, pattern: Pattern, script: GeneratedScript) => {
    const channel = await sheetsService.getChannelConfig(
      task.lang_code,
      TEMPLATE_SOURCE_PLATFORM[pattern],
    );
    if (!channel) {
      throw new Error(
        `No ${TEMPLATE_SOURCE_PLATFORM[pattern]} channel configured for "${task.lang_code}"`,
      );
    }

    const templateId =
      pattern === '20s' ? channel.creatomate_template_20s : channel.creatomate_template_65s;
    if (!templateId) {
      throw new Error(`No ${pattern} template configured for channel "${channel.channel_id}"`);
    }

    const response = await creatomateService.triggerRender({
      taskId: task.task_id,
      templateId,
      pattern,
      language: task.lang_code,
      scriptData: script,
    });

    await sheetsService.saveRenderOutput({
      task_id: task.task_id,
      ...(pattern === '20s'
        ? { creatomate_render_id_20s: response.renderId }
        : { creatomate_render_id_65s: response.renderId }),
    });
  };

  try {
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
          await renderPattern(task, '20s', JSON.parse(scriptOutput.script_20s_json));
          triggered += 1;
        }
        if (task.render_status_65s === 'Pending') {
          await renderPattern(task, '65s', JSON.parse(scriptOutput.script_65s_json));
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
