/**
 * Rewrites the evergreen scripts that `review:scripts` rejects, re-checking each one with the
 * lint and the reviewer before it is allowed back into the sheet. Writes nothing without
 * --apply, so the replacement text can be read first.
 *
 * Usage: npm run rewrite:evergreen -- <lang> [--ids=W-07,R-07] [--out=file.json] [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { lintScript, scriptLength } from '@/lib/script-lint';
import {
  GeminiService,
  isTransientGeminiError,
  type GeneratedScript,
  type ReviewTarget,
} from '@/services/gemini';
import { GoogleSheetsService, type Language } from '@/services/sheets';

const ALL_LANGS: Language[] = ['ja', 'en', 'es', 'pt', 'id', 'ar', 'fr', 'de'];
/** Each pass costs a paid call, so a script that still fails after this is left for a human. */
const MAX_PASSES = 3;

interface Replacement {
  id: string;
  lang: Language;
  hook: string;
  body: string;
  cta: string;
}

function parseArgs(argv: string[]) {
  let lang: Language | undefined;
  let ids: Set<string> | undefined;
  let out = '/tmp/evergreen-rewrite.json';
  let apply = false;
  let resume: string | undefined;

  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg.startsWith('--ids=')) ids = new Set(arg.slice('--ids='.length).split(','));
    else if (arg.startsWith('--out=')) out = arg.slice('--out='.length);
    else if (arg.startsWith('--resume=')) resume = arg.slice('--resume='.length);
    else if (ALL_LANGS.includes(arg as Language)) lang = arg as Language;
    else throw new Error(`unknown argument: ${arg}`);
  }

  if (!lang) throw new Error(`usage: rewrite-evergreen <${ALL_LANGS.join('|')}> [--apply]`);
  return { lang, ids, out, apply, resume };
}

function asScript(target: { hook: string; body: string; cta: string }): GeneratedScript {
  return { hook_text: target.hook, body_script: target.body, cta_text: target.cta };
}

/** The spoken length the renderer has to fit, counted the way the lint counts it. */
function totalLength(script: GeneratedScript, lang: Language): number {
  return (
    scriptLength(script.hook_text, lang) +
    scriptLength(script.body_script, lang) +
    scriptLength(script.cta_text, lang)
  );
}

async function withRetry<T>(label: string, run: () => Promise<T>): Promise<T | undefined> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt === 3) {
        console.error(`${label}: ${error}`);
        return undefined;
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }
  return undefined;
}

async function main() {
  const { lang, ids, out, apply, resume } = parseArgs(process.argv.slice(2));
  const sheets = new GoogleSheetsService();
  const gemini = new GeminiService();

  const scripts = await sheets.getEvergreenScripts(lang);
  const selected = ids ? scripts.filter((script) => ids.has(script.script_id)) : scripts;
  if (selected.length === 0) throw new Error('no matching scripts in the sheet');

  const done: Replacement[] = resume ? JSON.parse(readFileSync(resume, 'utf8')) : [];
  const finished = new Set(done.map((replacement) => replacement.id));
  const failed: string[] = [];

  for (const script of selected) {
    if (finished.has(script.script_id)) continue;

    const target: ReviewTarget = {
      id: script.script_id,
      hook: script.hook,
      body: script.body,
      cta: script.cta,
    };
    const [verdict] = (await withRetry(`${script.script_id} review`, () =>
      gemini.reviewScripts([target], lang),
    )) ?? [undefined];
    if (!verdict) {
      failed.push(script.script_id);
      continue;
    }
    if (verdict.verdict === 'ok') {
      console.log(`${script.script_id}: already reads well, left alone`);
      continue;
    }

    let issues = [verdict.reason];
    let repaired: GeneratedScript | undefined;
    for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
      const candidate = await withRetry(`${script.script_id} repair`, () =>
        gemini.repairScript(target, lang, issues, '30s'),
      );
      if (!candidate) break;

      const lintIssues = lintScript(candidate, lang, '30s').map(
        (issue) => `${issue.field}/${issue.code}${issue.detail ? ` (${issue.detail})` : ''}`,
      );
      const [recheck] = (await withRetry(`${script.script_id} recheck`, () =>
        gemini.reviewScripts(
          [
            {
              id: script.script_id,
              hook: candidate.hook_text,
              body: candidate.body_script,
              cta: candidate.cta_text,
            },
          ],
          lang,
        ),
      )) ?? [undefined];

      if (lintIssues.length === 0 && recheck?.verdict === 'ok') {
        repaired = candidate;
        break;
      }
      issues = [...lintIssues, ...(recheck && recheck.verdict !== 'ok' ? [recheck.reason] : [])];
      console.log(`${script.script_id}: pass ${pass} rejected — ${issues.join('; ')}`);
    }

    if (!repaired) {
      failed.push(script.script_id);
      continue;
    }

    done.push({
      id: script.script_id,
      lang,
      hook: repaired.hook_text,
      body: repaired.body_script,
      cta: repaired.cta_text,
    });
    // Saved as we go: a run is dozens of paid calls and must survive being interrupted.
    writeFileSync(out, `${JSON.stringify(done, null, 2)}\n`);
    console.log(
      `${script.script_id}: rewritten (${totalLength(asScript(done[done.length - 1]), lang)})`,
    );
  }

  console.log(`\n${done.length} rewritten, ${failed.length} left unchanged`);
  if (failed.length > 0) console.log(`needs a human: ${failed.join(', ')}`);
  console.log(`replacement text: ${out}`);

  if (!apply) {
    console.log('nothing written to the sheet (pass --apply)');
    return;
  }
  await sheets.updateEvergreenScripts(
    done.map((replacement) => ({
      scriptId: replacement.id,
      lang_code: replacement.lang,
      hook: replacement.hook,
      body: replacement.body,
      cta: replacement.cta,
    })),
  );
  console.log(`${done.length} rows updated in Evergreen_Scripts`);
}

void main();
