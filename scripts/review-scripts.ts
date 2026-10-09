/**
 * Reads the narration that is actually in the sheet and reports every script that does not
 * read as fluent prose in its own language. The lint only measures length and required
 * keywords, so broken sentences used to reach production unnoticed.
 *
 * Usage: npm run review:scripts -- [lang...] [--file=scripts.json] [--week=2026-W42] [--ids=W-07,R-07]
 */
import { readFileSync } from 'node:fs';

import { GeminiService, isTransientGeminiError, type ReviewTarget } from '@/services/gemini';
import { GoogleSheetsService, type Language } from '@/services/sheets';

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

  for (const arg of argv) {
    if (arg.startsWith('--file=')) file = arg.slice('--file='.length);
    else if (arg.startsWith('--week=')) week = arg.slice('--week='.length);
    else if (arg.startsWith('--ids=')) ids = new Set(arg.slice('--ids='.length).split(','));
    else if (ALL_LANGS.includes(arg as Language)) langs.push(arg as Language);
    else throw new Error(`unknown argument: ${arg}`);
  }

  return { langs: langs.length > 0 ? langs : ALL_LANGS, file, week, ids };
}

/** The scripts a planned week will actually publish, as opposed to the evergreen stock. */
async function targetsFromWeek(weekId: string): Promise<Map<Language, ReviewTarget[]>> {
  const outputs = await new GoogleSheetsService().getScriptOutputsByWeek(weekId);
  const byLang = new Map<Language, ReviewTarget[]>();
  for (const output of outputs) {
    if (!output.script_30s_json) continue;
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
  const { langs, file, week, ids } = parseArgs(process.argv.slice(2));
  const fileTargets = file
    ? targetsFromFile(file)
    : week
      ? await targetsFromWeek(week)
      : undefined;
  const gemini = new GeminiService();
  let flagged = 0;

  for (const lang of langs) {
    let targets = fileTargets ? (fileTargets.get(lang) ?? []) : await targetsFromSheet(lang);
    if (ids) targets = targets.filter((target) => ids.has(target.id));
    if (targets.length === 0) continue;

    const batches: ReviewTarget[][] = [];
    for (let index = 0; index < targets.length; index += BATCH_SIZE) {
      batches.push(targets.slice(index, index + BATCH_SIZE));
    }

    const problems: string[] = [];
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
