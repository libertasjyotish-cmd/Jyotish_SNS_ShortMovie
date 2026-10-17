import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { numberEnv, runWithinBudget, triggerNextBatch } from '@/lib/batch';

/** Scripts finished this close to their slot are rendered straight away. */
const RENDER_NOW_WINDOW_MS = 36 * 60 * 60 * 1000;
import { evergreenClosing } from '@/lib/evergreen-cta';
import { fixedCta } from '@/lib/fixed-cta';
import { buildPlacementBrief } from '@/lib/placements';
import { WEEKLY_TEMPLATES, WEEKLY_TEMPLATE_HASHTAGS, buildWeeklyFromTemplate } from '@/lib/weekly-templates';
import { weekPeriodSpoken } from '@/lib/period';
import { zodiacName } from '@/lib/zodiac-names';
import { REUSED_PREFIX } from '@/lib/script-audit';
import { describeIssues, lintRequirements, lintScript } from '@/lib/script-lint';
import { GeminiService, GeneratedScript, isTransientGeminiError } from '@/services/gemini';
import { ContentQueue, GoogleSheetsService, WeeklyTransit } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Theme and promotion tasks reuse a hand-written script from `Evergreen_Scripts` as is.
 * The 65s expansion is paused with the TikTok queue (docs/TIKTOK-MANUAL.md).
 */
async function generateThemeScript(
  sheets: GoogleSheetsService,
  gemini: GeminiService,
  task: ContentQueue,
): Promise<{ script_30s: GeneratedScript; script_65s?: GeneratedScript; hashtags: string }> {
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
    const params = new URL(request.url).searchParams;
    const weekFilter = params.get('week');
    const langFilter = params.get('langs')?.split(',').filter(Boolean) ?? [];
    const taskFilter = params.get('tasks')?.split(',').filter(Boolean) ?? [];
    const pendingTasks = (await sheetsService.getPendingScripts()).filter(
      (task) =>
        (!weekFilter || task.week_id === weekFilter) &&
        (langFilter.length === 0 || langFilter.includes(task.lang_code)) &&
        (taskFilter.length === 0 || taskFilter.includes(task.task_id)),
    );
    const transitCache = new Map<string, Promise<WeeklyTransit | null>>();
    let succeeded = 0;
    const renderSoon: string[] = [];
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
            script_65s?: GeneratedScript;
            hashtags: string;
          };

          // Weekly readings of a template language are assembled from fixed sentences and promos
          // are approved texts reused as they are: neither is written or rewritten by Gemini.
          const templated =
            task.target_type === 'Zodiac_Sign' && Boolean(WEEKLY_TEMPLATES[task.lang_code]);
          const codeOnly = task.target_type === 'Promo' || templated;
          if (task.target_type === 'Theme' || task.target_type === 'Promo') {
            scriptData = await generateThemeScript(sheetsService, geminiService, task);
          } else if (templated) {
            const transit = await sheetsService.getWeeklyTransits(task.week_id);
            if (!transit) {
              throw new Error(`No transit data for week_id "${task.week_id}"`);
            }
            transitReference = transit.transit_data;
            const built = buildWeeklyFromTemplate(
              task.lang_code,
              transitReference,
              task.zodiac_sign ?? '',
              weekPeriodSpoken(task.week_id, task.lang_code) ?? '',
              Number(/W(\d+)/.exec(task.week_id)?.[1] ?? 0),
            );
            if (!built) {
              throw new Error(`No template placement for ${task.zodiac_sign} in ${task.week_id}`);
            }
            const tags = WEEKLY_TEMPLATE_HASHTAGS[task.lang_code];
            scriptData = {
              script_30s: { hook_text: built.hook_text, body_script: built.body_script, cta_text: '' },
              hashtags: tags ? tags(zodiacName(task.zodiac_sign, task.lang_code) ?? '').trim() : '',
            };
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
            lintScript(data.script_30s, task.lang_code, '30s', spokenPeriod, signName, {
              template: templated,
            }).map(
              (issue) => `(30s) ${describeIssues([issue])}`,
            );

          // The closing is owned by the app: a product promotion keeps the closing of its own
          // row, everything else speaks the shared one. A repair pass hands back a whole script,
          // so it is reapplied after every rewrite instead of trusting what came back.
          const isFixedScript = task.target_type === 'Theme' || task.target_type === 'Promo';
          const closingFor = (script: GeneratedScript, fixed: boolean) =>
            fixed
              ? evergreenClosing(task.theme_id ?? '', task.lang_code, script.cta_text)
              : fixedCta(task.lang_code);
          // The row's own closing, before the shared one replaces it for playback: a rewritten
          // row is written back with this column untouched.
          const sourceCta = scriptData.script_30s.cta_text;

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

          const requirements = lintRequirements(task.lang_code, '30s', spokenPeriod, signName);
          const maxRepairs = numberEnv('WEEKLY_GENERATE_MAX_REPAIRS', 2);

          // Lints, proofreads and rewrites a candidate, reporting why it was rejected instead of
          // throwing: a gate that can only reject leaves the slot unpublished, so every rejection
          // has to hand control back here and let another source fill the slot.
          const settle = async (
            candidate: typeof scriptData,
            fixed: boolean,
          ): Promise<{ data: typeof scriptData; failure?: string; reusedFrom?: string }> => {
            const withClosing = (script: GeneratedScript): GeneratedScript => ({
              ...script,
              cta_text: closingFor(candidate.script_30s, fixed),
            });
            let data = { ...candidate, script_30s: withClosing(candidate.script_30s) };
            let issues = lint(data);
            if (codeOnly) {
              return issues.length ? { data, failure: issues.join('; ') } : { data };
            }
            let verdict = await proofread(data.script_30s);

            for (let pass = 1; issues.length > 0 || verdict?.verdict !== 'ok'; pass += 1) {
              const reasons = [
                ...issues,
                verdict?.verdict !== 'ok' ? (verdict?.reason ?? 'reviewer gave no verdict') : '',
              ].filter(Boolean);
              if (pass > maxRepairs) {
                return {
                  data,
                  failure: `still reads badly after ${maxRepairs} rewrites: ${reasons.join('; ')}`,
                };
              }

              const repaired = await geminiService.repairScript(
                {
                  id: task.task_id,
                  hook: data.script_30s.hook_text,
                  body: data.script_30s.body_script,
                  cta: data.script_30s.cta_text,
                },
                task.lang_code,
                reasons,
                '30s',
                requirements,
              );
              data = { ...data, script_30s: withClosing(repaired) };
              issues = lint(data);
              verdict = await proofread(data.script_30s);
            }
            return { data };
          };

          // A fixed script that fails the gate is rewritten here and the Evergreen_Scripts row is
          // replaced with the text that passed, so the same row never blocks its slot again and
          // no slot waits for a hand-run `rewrite:evergreen`.
          let settled: Awaited<ReturnType<typeof settle>> = await settle(scriptData, isFixedScript);
          const rewroteFixedRow =
            isFixedScript &&
            !settled.failure &&
            (settled.data.script_30s.hook_text !== scriptData.script_30s.hook_text ||
              settled.data.script_30s.body_script !== scriptData.script_30s.body_script);

          if (settled.failure && !codeOnly) {
            // Nothing in the rewritten text passed, so the slot stops depending on this source:
            // the writer is given the week's own reference and asked for a fresh script. A weekly
            // reading cannot be borrowed from another week, so this is its real second chance.
            console.warn(`${task.task_id}: ${settled.failure}; generating a fresh script`);
            if (!transitReference) {
              if (!transitCache.has(task.week_id)) {
                transitCache.set(task.week_id, sheetsService.getWeeklyTransits(task.week_id));
              }
              transitReference = (await transitCache.get(task.week_id))?.transit_data ?? '';
            }
            const placements = task.zodiac_sign
              ? buildPlacementBrief(transitReference, task.zodiac_sign)
              : '';
            const fresh = await geminiService.generateScript({
              week_id: task.week_id,
              lang_code: task.lang_code,
              target_type: task.target_type,
              zodiac_sign: task.zodiac_sign,
              transit_reference: placements
                ? `${transitReference}\n\n${placements}`
                : transitReference,
              lint_feedback: settled.failure,
            });
            settled = await settle(fresh, isFixedScript);
          }

          if (settled.failure && !isFixedScript) {
            // A weekly reading is written from this week's sky, so no other text can stand in
            // for it; the row goes to script_error and the watchdog regenerates it.
            throw new Error(settled.failure);
          }
          if (settled.failure) {
            // Last resort for a fixed script: the same evergreen row as it passed in another week.
            const reuse = await sheetsService.findApprovedScript({
              lang_code: task.lang_code,
              zodiac_sign: task.zodiac_sign,
              taskIdContains: task.theme_id ?? 'sign-',
              excludeWeekId: task.week_id,
            });
            if (!reuse) {
              throw new Error(`${settled.failure}; no passed script to reuse for this slot`);
            }
            console.warn(`${task.task_id}: reusing ${reuse.task_id} to keep the slot`);
            settled = {
              reusedFrom: reuse.task_id,
              data: {
                script_30s: JSON.parse(reuse.script_30s_json) as GeneratedScript,
                hashtags: reuse.hashtags,
              },
            };
          }

          scriptData = settled.data;
          const savedReference = settled.reusedFrom
            ? `${REUSED_PREFIX}${settled.reusedFrom}`
            : transitReference;

          if (rewroteFixedRow && task.theme_id) {
            await sheetsService.updateEvergreenScripts([
              {
                scriptId: task.theme_id,
                lang_code: task.lang_code,
                hook: scriptData.script_30s.hook_text,
                body: scriptData.script_30s.body_script,
                cta: sourceCta,
              },
            ]);
          }

          await sheetsService.saveScriptOutput({
            task_id: task.task_id,
            week_id: task.week_id,
            lang_code: task.lang_code,
            zodiac_sign: task.zodiac_sign,
            transit_reference: savedReference,
            script_30s_json: JSON.stringify(scriptData.script_30s),
            script_65s_json: scriptData.script_65s ? JSON.stringify(scriptData.script_65s) : '',
            hashtags: scriptData.hashtags,
            created_at: new Date().toISOString(),
          });

          await sheetsService.updateScriptStatus(task.task_id, 'Script_Done');
          succeeded += 1;
          if (Date.parse(task.scheduled_post_time) - Date.now() < RENDER_NOW_WINDOW_MS) {
            renderSoon.push(task.task_id);
          }
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
        budgetMs: numberEnv('WEEKLY_GENERATE_BUDGET_MS', 240_000),
      }
    );

    const chainParam = Number(params.get('chain'));
    const chain = Number.isFinite(chainParam) && chainParam > 0 ? chainParam : 0;
    const unfinished = remainingTasks.length + deferred;
    const continued =
      unfinished > 0
        ? await triggerNextBatch('/api/cron/weekly-generate', chain, params)
        : false;

    // A script that lands close to its slot must not wait for the next 3-hourly render cron.
    const renderTriggered =
      renderSoon.length > 0
        ? await triggerNextBatch(
            '/api/cron/render-batch',
            0,
            new URLSearchParams({ tasks: renderSoon.join(',') }),
          )
        : false;

    return NextResponse.json({
      status: 'Weekly generation completed',
      render_triggered: renderTriggered ? renderSoon : [],
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
