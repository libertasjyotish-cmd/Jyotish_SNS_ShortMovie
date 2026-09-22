import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { numberEnv, runWithinBudget, triggerNextBatch } from '@/lib/batch';
import { describeIssues, lintScript } from '@/lib/script-lint';
import { GeminiService, GeneratedScript, isTransientGeminiError } from '@/services/gemini';
import { ContentQueue, GoogleSheetsService, WeeklyTransit } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Theme and promotion tasks reuse a hand-written script from `Evergreen_Scripts`, so
 * only the 65s version is generated: it is an expansion of the fixed text, never new
 * astrology.
 */
async function generateThemeScript(
  sheets: GoogleSheetsService,
  gemini: GeminiService,
  task: ContentQueue,
): Promise<{ script_30s: GeneratedScript; script_65s: GeneratedScript; hashtags: string }> {
  if (!task.theme_id) {
    throw new Error(`Theme task ${task.task_id} has no theme_id`);
  }
  const scripts = await sheets.getEvergreenScripts(task.lang_code);
  const source = scripts.find((script) => script.script_id === task.theme_id);
  if (!source) {
    throw new Error(`No evergreen script "${task.theme_id}" for "${task.lang_code}"`);
  }

  const script_30s: GeneratedScript = {
    hook_text: source.hook,
    body_script: source.body,
    cta_text: source.cta,
  };
  return {
    script_30s,
    script_65s: await gemini.expandThemeScript(script_30s, task.lang_code),
    hashtags: source.hashtags,
  };
}

export async function GET(request: Request) {
  // Scenario 1: Weekly Script Generation Pipeline (Thursday 03:00 JST)
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
    let deferred = 0;
    const lintWarnings: string[] = [];

    const remainingTasks = await runWithinBudget(
      pendingTasks,
      async (task) => {
        try {
          let transitReference = '';
          let scriptData: {
            script_30s: GeneratedScript;
            script_65s: GeneratedScript;
            hashtags: string;
          };

          if (task.target_type === 'Theme' || task.target_type === 'Promo') {
            scriptData = await generateThemeScript(sheetsService, geminiService, task);
          } else {
            if (!transitCache.has(task.week_id)) {
              transitCache.set(task.week_id, sheetsService.getWeeklyTransits(task.week_id));
            }
            const transit = await transitCache.get(task.week_id);
            if (!transit) {
              throw new Error(`No transit data for week_id "${task.week_id}"`);
            }
            transitReference = transit.transit_data;
            scriptData = await geminiService.generateScript({
              week_id: task.week_id,
              lang_code: task.lang_code,
              target_type: task.target_type,
              zodiac_sign: task.zodiac_sign,
              transit_reference: transitReference,
            });
          }

          const lint = (data: typeof scriptData) =>
            (
              [
                ['30s', data.script_30s],
                ['65s', data.script_65s],
              ] as const
            ).flatMap(([pattern, script]) =>
              lintScript(script, task.lang_code, pattern).map(
                (issue) => `(${pattern}) ${describeIssues([issue])}`,
              ),
            );

          let issues = lint(scriptData);
          // A script that fails the check is a script that will not send anyone to the site, so
          // the issues are fed back once rather than stored as a warning nobody reads.
          if (issues.length > 0 && task.target_type === 'Zodiac_Sign') {
            const retried = await geminiService.generateScript({
              week_id: task.week_id,
              lang_code: task.lang_code,
              target_type: task.target_type,
              zodiac_sign: task.zodiac_sign,
              transit_reference: transitReference,
              lint_feedback: issues.join('; '),
            });
            const retriedIssues = lint(retried);
            if (retriedIssues.length < issues.length) {
              scriptData = retried;
              issues = retriedIssues;
            }
          }

          for (const issue of issues) {
            const warning = `${task.task_id} ${issue}`;
            console.warn(`Script lint: ${warning}`);
            lintWarnings.push(warning);
          }

          await sheetsService.saveScriptOutput({
            task_id: task.task_id,
            week_id: task.week_id,
            lang_code: task.lang_code,
            zodiac_sign: task.zodiac_sign,
            transit_reference: transitReference,
            script_30s_json: JSON.stringify(scriptData.script_30s),
            script_65s_json: JSON.stringify(scriptData.script_65s),
            hashtags: scriptData.hashtags,
            created_at: new Date().toISOString(),
          });

          await sheetsService.updateScriptStatus(task.task_id, 'Script_Done');
          succeeded += 1;
        } catch (taskError) {
          const message = taskError instanceof Error ? taskError.message : 'Unknown error';
          console.error(`Script generation failed for ${task.task_id}:`, message);
          if (isTransientGeminiError(taskError)) {
            // Left Pending so a later batch picks the task up again.
            deferred += 1;
            return;
          }
          failed += 1;
          await sheetsService.updateScriptStatus(task.task_id, 'Error');
        }
      },
      {
        concurrency: numberEnv('WEEKLY_GENERATE_CONCURRENCY', 4),
        budgetMs: numberEnv('WEEKLY_GENERATE_BUDGET_MS', 25_000),
      }
    );

    const chainParam = Number(new URL(request.url).searchParams.get('chain'));
    const chain = Number.isFinite(chainParam) && chainParam > 0 ? chainParam : 0;
    const unfinished = remainingTasks.length + deferred;
    const continued =
      unfinished > 0 ? await triggerNextBatch('/api/cron/weekly-generate', chain) : false;

    return NextResponse.json({
      status: 'Weekly generation completed',
      processed: pendingTasks.length - remainingTasks.length,
      succeeded,
      failed,
      deferred,
      remaining: remainingTasks.length,
      continued,
      lint_warnings: lintWarnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Weekly generation failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
