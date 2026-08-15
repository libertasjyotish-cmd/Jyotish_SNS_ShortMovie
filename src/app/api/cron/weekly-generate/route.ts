import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { numberEnv, runWithinBudget, triggerNextBatch } from '@/lib/batch';
import { GeminiService } from '@/services/gemini';
import { GoogleSheetsService, WeeklyTransit } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  // Scenario 1: Weekly Script Generation Pipeline (Sunday 00:00 JST)
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheetsService = new GoogleSheetsService();
    const geminiService = new GeminiService();
    const pendingTasks = await sheetsService.getPendingScripts();
    const transitCache = new Map<string, Promise<WeeklyTransit | null>>();
    let succeeded = 0;
    let failed = 0;

    const remainingTasks = await runWithinBudget(
      pendingTasks,
      async (task) => {
        try {
          if (!transitCache.has(task.week_id)) {
            transitCache.set(task.week_id, sheetsService.getWeeklyTransits(task.week_id));
          }
          const transit = await transitCache.get(task.week_id);
          if (!transit) {
            throw new Error(`No transit data for week_id "${task.week_id}"`);
          }

          const scriptData = await geminiService.generateScript({
            week_id: task.week_id,
            lang_code: task.lang_code,
            target_type: task.target_type,
            zodiac_sign: task.zodiac_sign,
            transit_reference: transit.transit_data,
          });

          await sheetsService.saveScriptOutput({
            task_id: task.task_id,
            week_id: scriptData.week_id,
            lang_code: scriptData.lang_code,
            zodiac_sign: scriptData.zodiac_sign,
            transit_reference: scriptData.transit_reference,
            script_20s_json: JSON.stringify(scriptData.script_20s),
            script_65s_json: JSON.stringify(scriptData.script_65s),
            hashtags: scriptData.hashtags,
            created_at: new Date().toISOString(),
          });

          await sheetsService.updateScriptStatus(task.task_id, 'Script_Done');
          succeeded += 1;
        } catch (taskError) {
          failed += 1;
          const message = taskError instanceof Error ? taskError.message : 'Unknown error';
          console.error(`Script generation failed for ${task.task_id}:`, message);
          await sheetsService.updateScriptStatus(task.task_id, 'Error');
        }
      },
      {
        concurrency: numberEnv('WEEKLY_GENERATE_CONCURRENCY', 4),
        budgetMs: numberEnv('WEEKLY_GENERATE_BUDGET_MS', 35_000),
      }
    );

    const chainParam = Number(new URL(request.url).searchParams.get('chain'));
    const chain = Number.isFinite(chainParam) && chainParam > 0 ? chainParam : 0;
    const continued =
      remainingTasks.length > 0 ? await triggerNextBatch('/api/cron/weekly-generate', chain) : false;

    return NextResponse.json({
      status: 'Weekly generation completed',
      processed: pendingTasks.length - remainingTasks.length,
      succeeded,
      failed,
      remaining: remainingTasks.length,
      continued,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Weekly generation failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
