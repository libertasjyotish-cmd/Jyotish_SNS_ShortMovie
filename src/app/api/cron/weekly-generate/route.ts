import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { numberEnv, runWithinBudget, triggerNextBatch } from '@/lib/batch';
import { evergreenClosing } from '@/lib/evergreen-cta';
import { buildEvergreenTemplateJa, EvergreenTemplate } from '@/lib/evergreen-template';
import { buildEvergreenTemplateEn } from '@/lib/evergreen-template-en';
import { buildEvergreenTemplateEs } from '@/lib/evergreen-template-es';
import { buildEvergreenTemplatePt } from '@/lib/evergreen-template-pt';
import { buildEvergreenTemplateId } from '@/lib/evergreen-template-id';
import { buildEvergreenTemplateFr } from '@/lib/evergreen-template-fr';
import { buildEvergreenTemplateDe } from '@/lib/evergreen-template-de';
import { buildEvergreenTemplateAr } from '@/lib/evergreen-template-ar';
import { fixedCta } from '@/lib/fixed-cta';
import { parseSignThemeId, SignThemeSeries } from '@/lib/sign-themes';
import { WEEKLY_TEMPLATE_HASHTAGS, buildWeeklyFromTemplate } from '@/lib/weekly-templates';
import { weekPeriodSpoken } from '@/lib/period';
import { zodiacName } from '@/lib/zodiac-names';
import { REUSED_PREFIX } from '@/lib/script-audit';
import { describeIssues, lintScript } from '@/lib/script-lint';
import type { GeneratedScript } from '@/services/gemini';
import { ContentQueue, GoogleSheetsService, Language } from '@/services/sheets';

/** Scripts finished this close to their slot are rendered straight away. */
const RENDER_NOW_WINDOW_MS = 36 * 60 * 60 * 1000;

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type ScriptData = { script_30s: GeneratedScript; script_65s?: GeneratedScript; hashtags: string };

const EVERGREEN_TEMPLATES: Record<
  Language,
  (series: SignThemeSeries, moonSign: string) => EvergreenTemplate | null
> = {
  ja: buildEvergreenTemplateJa,
  en: buildEvergreenTemplateEn,
  es: buildEvergreenTemplateEs,
  pt: buildEvergreenTemplatePt,
  id: buildEvergreenTemplateId,
  fr: buildEvergreenTemplateFr,
  de: buildEvergreenTemplateDe,
  ar: buildEvergreenTemplateAr,
};

/**
 * No script is written by a model: weekly readings and the Mon–Wed per-sign evergreens are
 * assembled from fixed sentences, and promos reuse their approved `Evergreen_Scripts` row as is.
 */
async function buildScript(
  sheets: GoogleSheetsService,
  task: ContentQueue,
): Promise<{ data: ScriptData; template: boolean; transitReference: string }> {
  if (task.target_type === 'Zodiac_Sign') {
    const transit = await sheets.getWeeklyTransits(task.week_id);
    if (!transit) throw new Error(`No transit data for week_id "${task.week_id}"`);
    const built = buildWeeklyFromTemplate(
      task.lang_code,
      transit.transit_data,
      task.zodiac_sign ?? '',
      weekPeriodSpoken(task.week_id, task.lang_code) ?? '',
      Number(/W(\d+)/.exec(task.week_id)?.[1] ?? 0),
    );
    if (!built) {
      throw new Error(`No template placement for ${task.zodiac_sign} in ${task.week_id}`);
    }
    const tags = WEEKLY_TEMPLATE_HASHTAGS[task.lang_code];
    return {
      template: true,
      transitReference: transit.transit_data,
      data: {
        script_30s: { hook_text: built.hook_text, body_script: built.body_script, cta_text: '' },
        hashtags: tags ? tags(zodiacName(task.zodiac_sign, task.lang_code) ?? '').trim() : '',
      },
    };
  }

  if (!task.theme_id) throw new Error(`Theme task ${task.task_id} has no theme_id`);
  const rows = await sheets.getEvergreenScripts(task.lang_code);
  const source = rows.find((row) => row.script_id === task.theme_id);
  const signTheme = parseSignThemeId(task.theme_id);
  const template = signTheme
    ? EVERGREEN_TEMPLATES[task.lang_code]?.(
        signTheme.series,
        signTheme.sign.charAt(0).toUpperCase() + signTheme.sign.slice(1),
      ) ?? null
    : null;
  if (template) {
    const tags = WEEKLY_TEMPLATE_HASHTAGS[task.lang_code];
    return {
      template: true,
      transitReference: '',
      data: {
        script_30s: { hook_text: template.hook, body_script: template.body, cta_text: '' },
        hashtags:
          source?.hashtags ||
          (tags ? tags(zodiacName(signTheme?.sign, task.lang_code) ?? '').trim() : ''),
      },
    };
  }
  if (!source) {
    throw new Error(`No evergreen script "${task.theme_id}" for "${task.lang_code}"`);
  }
  return {
    template: false,
    transitReference: '',
    data: {
      script_30s: { hook_text: source.hook, body_script: source.body, cta_text: source.cta },
      hashtags: source.hashtags,
    },
  };
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheetsService = new GoogleSheetsService();
    const params = new URL(request.url).searchParams;
    const weekFilter = params.get('week');
    const langFilter = params.get('langs')?.split(',').filter(Boolean) ?? [];
    const taskFilter = params.get('tasks')?.split(',').filter(Boolean) ?? [];
    const matches = (task: ContentQueue) =>
      (!weekFilter || task.week_id === weekFilter) &&
      (langFilter.length === 0 || langFilter.includes(task.lang_code)) &&
      (taskFilter.length === 0 || taskFilter.includes(task.task_id));
    let rebuilt = 0;
    if (params.get('rebuild') === 'templates') {
      // Unposted Mon–Wed per-sign slots whose stored text predates the fixed templates are put
      // back in the queue once, together with their render, and rebuilt from the template below.
      const now = Date.now();
      const stale = (await sheetsService.getAllQueueTasks()).filter(
        (task) =>
          matches(task) &&
          task.target_type === 'Theme' &&
          Boolean(parseSignThemeId(task.theme_id ?? '')) &&
          (task.post_status || 'Pending') === 'Pending' &&
          task.render_status_30s !== 'Rendering' &&
          Date.parse(task.scheduled_post_time) > now,
      );
      await sheetsService.requeueScripts(
        stale.map((task) => ({ taskId: task.task_id, attempts: task.script_attempts ?? 0 })),
      );
      rebuilt = stale.length;
      params.delete('rebuild');
    }
    const pendingTasks = (await sheetsService.getPendingScripts()).filter(
      matches,
    );
    let succeeded = 0;
    const renderSoon: string[] = [];
    let failed = 0;
    const lintWarnings: string[] = [];

    const remainingTasks = await runWithinBudget(
      pendingTasks,
      async (task) => {
        try {
          const built = await buildScript(sheetsService, task);
          const isFixedScript = task.target_type !== 'Zodiac_Sign';
          const spokenPeriod = isFixedScript
            ? undefined
            : weekPeriodSpoken(task.week_id, task.lang_code);
          const signName = zodiacName(
            task.zodiac_sign ?? parseSignThemeId(task.theme_id ?? '')?.sign,
            task.lang_code,
          );
          // The closing is owned by the app: a product promotion keeps its own row's closing,
          // everything else speaks the shared one.
          const closing = isFixedScript
            ? evergreenClosing(task.theme_id ?? '', task.lang_code, built.data.script_30s.cta_text)
            : fixedCta(task.lang_code);
          const candidate: ScriptData = {
            ...built.data,
            script_30s: { ...built.data.script_30s, cta_text: closing },
          };
          const issues = lintScript(
            candidate.script_30s,
            task.lang_code,
            '30s',
            spokenPeriod,
            signName,
            { template: built.template },
          ).map((issue) => `(30s) ${describeIssues([issue])}`);

          let settled: { data: ScriptData; failure?: string; reusedFrom?: string } = issues.length
            ? { data: candidate, failure: issues.join('; ') }
            : { data: candidate };

          if (settled.failure && !isFixedScript) {
            // A weekly reading is written from this week's sky, so no other text can stand in.
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
          const transitReference = built.transitReference;
          const scriptData = settled.data;
          const savedReference = settled.reusedFrom
            ? `${REUSED_PREFIX}${settled.reusedFrom}`
            : transitReference;

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
    const unfinished = remainingTasks.length;
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
      rebuilt,
      render_triggered: renderTriggered ? renderSoon : [],
      processed: pendingTasks.length - remainingTasks.length,
      succeeded,
      failed,
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
