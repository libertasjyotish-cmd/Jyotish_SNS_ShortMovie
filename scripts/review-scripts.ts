/**
 * Reads the narration that is actually in the sheet and reports every script that does not
 * read as fluent prose in its own language. The lint only measures length and required
 * keywords, so broken sentences used to reach production unnoticed.
 *
 * Usage: npm run review:scripts -- [lang...] [--file=scripts.json] [--week=2026-W42] [--ids=W-07,R-07] [--unposted] [--lint-only]
 */
import { readFileSync } from 'node:fs';

import { GeminiService, isTransientGeminiError, type ReviewTarget } from '@/services/gemini';
import { GoogleSheetsService, type Language } from '@/services/sheets';
import { describeIssues, lintScript, type ScriptIssue } from '@/lib/script-lint';
import { zodiacName } from '@/lib/zodiac-names';
import { weekPeriodSpoken } from '@/lib/period';

const ALL_LANGS: Language[] = ['ja', 'en', 'es', 'pt', 'id', 'ar', 'fr', 'de'];
/** Small enough that one bad response costs little, large enough to keep the call count down. */
const BATCH_SIZE = 8;
/** The reasoning model takes a minute or two per batch, so the whole set is reviewed in parallel. */
const CONCURRENCY = 4;

interface FileEntry {
  id: string;
  lang: Language;
  hook: string;
  body: string;
  cta: string;
}

function parseArgs(argv: string[]) {
  const langs: Language[] = [];
  let file: string | undefined;
  let week: string | undefined;
  let ids: Set<string> | undefined;
  let unposted = false;
  let lintOnly = false;

  for (const arg of argv) {
    if (arg === '--unposted') unposted = true;
    else if (arg === '--lint-only') lintOnly = true;
    else if (arg.startsWith('--file=')) file = arg.slice('--file='.length);
    else if (arg.startsWith('--week=')) week = arg.slice('--week='.length);
    else if (arg.startsWith('--ids=')) ids = new Set(arg.slice('--ids='.length).split(','));
    else if (ALL_LANGS.includes(arg as Language)) langs.push(arg as Language);
    else throw new Error(`unknown argument: ${arg}`);
  }

  return { langs: langs.length > 0 ? langs : ALL_LANGS, file, week, ids, unposted, lintOnly };
}

/**
 * A target carries its sign so the lint can tell whether the hook names it, and the spoken week
 * so the length bounds match the ones generation was held to.
 */
type Target = ReviewTarget & { sign?: string; period?: string };

/** The scripts a planned week will actually publish, as opposed to the evergreen stock. */
async function targetsFromWeek(
  weekId: string,
  unposted: boolean,
): Promise<Map<Language, Target[]>> {
  const sheets = new GoogleSheetsService();
  const [outputs, tasks] = await Promise.all([
    sheets.getScriptOutputsByWeek(weekId),
    sheets.getQueueTasks(weekId),
  ]);
  const posted = new Set(
    unposted
      ? tasks.filter((task) => task.post_status === 'Posted').map((task) => task.task_id)
      : [],
  );
  const signs = new Map(tasks.map((task) => [task.task_id, task.zodiac_sign]));
  // Only the weekly readings speak the week they cover; evergreen rows carry a sign but no period.
  const weekly = new Set(
    tasks.filter((task) => task.target_type === 'Zodiac_Sign').map((task) => task.task_id),
  );
  const byLang = new Map<Language, Target[]>();
  for (const output of outputs) {
    if (!output.script_30s_json) continue;
    // A published video cannot be replaced, so re-judging it only spends review calls.
    if (posted.has(output.task_id)) continue;
    const script = JSON.parse(output.script_30s_json) as {
      hook_text: string;
      body_script: string;
      cta_text: string;
    };
    const list = byLang.get(output.lang_code) ?? [];
    list.push({
      id: output.task_id,
      hook: script.hook_text,
      body: script.body_script,
      cta: script.cta_text,
      promo: output.task_id.includes('promo'),
      sign: zodiacName(signs.get(output.task_id), output.lang_code),
      period: weekly.has(output.task_id)
        ? weekPeriodSpoken(weekId, output.lang_code)
        : undefined,
    });
    byLang.set(output.lang_code, list);
  }
  return byLang;
}

async function targetsFromSheet(lang: Language): Promise<ReviewTarget[]> {
  const scripts = await new GoogleSheetsService().getEvergreenScripts(lang);
  return scripts.map((script) => ({
    id: script.script_id,
    hook: script.hook,
    body: script.body,
    cta: script.cta,
    promo: script.script_id.includes('promo'),
  }));
}

function targetsFromFile(file: string): Map<Language, ReviewTarget[]> {
  const entries: FileEntry[] = JSON.parse(readFileSync(file, 'utf8'));
  const byLang = new Map<Language, ReviewTarget[]>();
  for (const entry of entries) {
    const list = byLang.get(entry.lang) ?? [];
    list.push({ id: entry.id, hook: entry.hook, body: entry.body, cta: entry.cta });
    byLang.set(entry.lang, list);
  }
  return byLang;
}

/**
 * Wording the lint can decide on its own, including whether the hook names the sign the task is
 * for. Only the spoken week is left to the pipeline, which is the side that knows it.
 */
function mechanicalIssues(target: Target, lang: Language): ScriptIssue[] {
  return lintScript(
    { hook_text: target.hook, body_script: target.body, cta_text: target.cta },
    lang,
    '30s',
    target.period,
    target.sign,
  ).filter((issue) => issue.code !== 'missing_period');
}

async function reviewBatch(gemini: GeminiService, batch: ReviewTarget[], lang: Language) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await gemini.reviewScripts(batch, lang);
    } catch (error) {
      // A whole language is hundreds of paid calls; a transient 503 must not lose the run.
      if (!isTransientGeminiError(error) || attempt === 3) {
        console.error(`${lang}: review failed for ${batch.map((t) => t.id).join(',')}:`, error);
        return [];
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }
  return [];
}

async function main() {
  const { langs, file, week, ids, unposted, lintOnly } = parseArgs(process.argv.slice(2));
  const fileTargets = file
    ? targetsFromFile(file)
    : week
      ? await targetsFromWeek(week, unposted)
      : undefined;
  const gemini = new GeminiService();
  let flagged = 0;

  for (const lang of langs) {
    let targets = fileTargets ? (fileTargets.get(lang) ?? []) : await targetsFromSheet(lang);
    if (ids) targets = targets.filter((target) => ids.has(target.id));
    if (targets.length === 0) continue;

    // The mechanical checks are free and catch what no reviewer should have to argue about
    // (「○室」, a URL in the narration), so they run first and the script is not sent for review.
    const problems: string[] = [];
    const reviewable: ReviewTarget[] = [];
    for (const target of targets) {
      const issues = mechanicalIssues(target, lang);
      if (issues.length > 0) problems.push(`  ${target.id} broken: ${describeIssues(issues)}`);
      else reviewable.push(target);
    }

    // --lint-only answers "does anything break a rule we can check for free" without paid calls.
    if (lintOnly) reviewable.length = 0;

    const batches: ReviewTarget[][] = [];
    for (let index = 0; index < reviewable.length; index += BATCH_SIZE) {
      batches.push(reviewable.slice(index, index + BATCH_SIZE));
    }

    for (let index = 0; index < batches.length; index += CONCURRENCY) {
      const results = await Promise.all(
        batches
          .slice(index, index + CONCURRENCY)
          .map((batch) => reviewBatch(gemini, batch, lang)),
      );
      for (const verdict of results.flat()) {
        if (verdict.verdict === 'ok') continue;
        problems.push(`  ${verdict.id} ${verdict.verdict}: ${verdict.reason}`);
      }
    }

    flagged += problems.length;
    console.log(`${lang}: ${targets.length} scripts, ${problems.length} flagged`);
    for (const problem of problems) console.log(problem);
  }

  if (flagged > 0) {
    console.error(`\n${flagged} scripts do not read as native prose`);
    process.exit(1);
  }
  console.log('\nall reviewed scripts read as native prose');
}

void main();
