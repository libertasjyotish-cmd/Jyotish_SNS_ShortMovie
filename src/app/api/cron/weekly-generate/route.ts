import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { numberEnv, runWithinBudget, triggerNextBatch } from '@/lib/batch';
import { evergreenClosing } from '@/lib/evergreen-cta';
import { buildPlacementBrief } from '@/lib/placements';
import { weekPeriodSpoken } from '@/lib/period';
import { zodiacName } from '@/lib/zodiac-names';
import { describeIssues, lintRequirements, lintScript } from '@/lib/script-lint';
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
    cta_text: evergreenClosing(source.script_id, task.lang_code, source.cta),
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
            // A house number alone lets the writer fall back on generic lore, so the
            // placements are resolved for this viewer's Moon sign first: which planet, in
            // which sign, which house from that sign, and which field of life that is.
            const placements = task.zodiac_sign
              ? buildPlacementBrief(transitReference, task.zodiac_sign)
              : '';
            scriptData = await geminiService.generateScript({
              week_id: task.week_id,
              lang_code: task.lang_code,
              target_type: task.target_type,
              zodiac_sign: task.zodiac_sign,
              transit_reference: placements
                ? `${transitReference}\n\n${placements}`
                : transitReference,
            });
          }

          const spokenPeriod =
            task.target_type === 'Zodiac_Sign'
              ? weekPeriodSpoken(task.week_id, task.lang_code)
              : undefined;
          // Both the weekly readings and the sign-targeted evergreens must name their sign out
          // loud, so a viewer who scrolled in halfway knows whether it is theirs.
          const signName = zodiacName(task.zodiac_sign, task.lang_code);

          const lint = (data: typeof scriptData) =>
            (
              [
                ['30s', data.script_30s],
                ['65s', data.script_65s],
              ] as const
            ).flatMap(([pattern, script]) =>
              lintScript(script, task.lang_code, pattern, spokenPeriod, signName).map(
                (issue) => `(${pattern}) ${describeIssues([issue])}`,
              ),
            );

          let issues = lint(scriptData);

          // The lint measures length and required wording; it cannot tell whether the narration is
          // a sentence a person would say. The 30s script is the one that ships, so it is also
          // proofread here and rewritten until both checks pass — a script that reads like a bad
          // translation is published to every platform otherwise.
          const proofread = async (script: GeneratedScript) =>
            (
              await geminiService.reviewScripts(
                [
                  {
                    id: task.task_id,
                    hook: script.hook_text,
                    body: script.body_script,
                    cta: script.cta_text,
                  },
                ],
                task.lang_code,
              )
            )[0];

          let verdict = await proofread(scriptData.script_30s);
          const requirements = lintRequirements(task.lang_code, '30s', spokenPeriod, signName);
          const maxRepairs = numberEnv('WEEKLY_GENERATE_MAX_REPAIRS', 2);
          for (let pass = 1; issues.length > 0 || verdict?.verdict !== 'ok'; pass += 1) {
            if (pass > maxRepairs) {
              throw new Error(
                `script still reads badly after ${maxRepairs} rewrites: ${[
                  ...issues,
                  verdict?.verdict !== 'ok' ? (verdict?.reason ?? 'reviewer gave no verdict') : '',
                ]
                  .filter(Boolean)
                  .join('; ')}`,
              );
            }

            const repaired = await geminiService.repairScript(
              {
                id: task.task_id,
                hook: scriptData.script_30s.hook_text,
                body: scriptData.script_30s.body_script,
                cta: scriptData.script_30s.cta_text,
              },
              task.lang_code,
              [
                ...issues,
                ...(verdict && verdict.verdict !== 'ok' ? [verdict.reason] : []),
              ],
              '30s',
              requirements,
            );
            scriptData = { ...scriptData, script_30s: repaired };
            issues = lint(scriptData).filter((issue) => issue.startsWith('(30s)'));
            verdict = await proofread(repaired);
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
