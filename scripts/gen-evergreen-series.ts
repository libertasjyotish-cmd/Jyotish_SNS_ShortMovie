/**
 * Writes the evergreen per-sign scripts of one weekly series, lints and reviews each one, and
 * saves them to the sheet. Twelve series of twelve signs rotate over twelve weeks, so a series
 * that has no rows yet is generated here before the week it is due.
 *
 * Usage: npm run gen:evergreen -- <series> <lang...> [--signs=aries,leo] [--out=file.json] [--apply]
 *
 * Every script is saved to --out the moment it passes, so a run that dies partway resumes with
 * --resume=file.json and pays for nothing twice. Nothing reaches the sheet without --apply.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { lintEvergreenEntry } from '@/lib/evergreen-cta';
import { lintRequirements } from '@/lib/script-lint';
import {
  SIGN_THEME_SERIES,
  SIGNS_BY_DAY,
  signThemeScriptId,
  type SignThemeSeries,
} from '@/lib/sign-themes';
import { SERIES_KEYWORDS } from '@/lib/youtube-seo';
import { ZODIAC_SIGNS, zodiacName, type ZodiacSign } from '@/lib/zodiac-names';
import { GeminiService, isTransientGeminiError, type ReviewTarget } from '@/services/gemini';
import { GoogleSheetsService, type EvergreenScript, type Language } from '@/services/sheets';

const ALL_LANGS: Language[] = ['ja', 'en', 'es', 'pt', 'id', 'ar', 'fr', 'de'];
/** Each pass costs a paid call, so a script that still fails after this is left for a human. */
const MAX_PASSES = 3;

interface Entry {
  id: string;
  lang: Language;
  sign: ZodiacSign;
  hook: string;
  body: string;
  cta: string;
}

function dayOfSign(sign: ZodiacSign): string {
  const day = (Object.keys(SIGNS_BY_DAY) as (keyof typeof SIGNS_BY_DAY)[]).find((candidate) =>
    SIGNS_BY_DAY[candidate]?.includes(sign),
  );
  if (!day) throw new Error(`no weekday carries ${sign}`);
  return day;
}

function parseArgs(argv: string[]) {
  const langs: Language[] = [];
  let series: SignThemeSeries | undefined;
  let signs: ZodiacSign[] = [...ZODIAC_SIGNS];
  let out = '/tmp/evergreen-series.json';
  let resume: string | undefined;
  let apply = false;

  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg.startsWith('--out=')) out = arg.slice('--out='.length);
    else if (arg.startsWith('--resume=')) resume = arg.slice('--resume='.length);
    else if (arg.startsWith('--signs=')) {
      signs = arg
        .slice('--signs='.length)
        .split(',')
        .map((name) => name.trim() as ZodiacSign);
    } else if (SIGN_THEME_SERIES.includes(arg as SignThemeSeries)) series = arg as SignThemeSeries;
    else if (ALL_LANGS.includes(arg as Language)) langs.push(arg as Language);
    else throw new Error(`unknown argument: ${arg}`);
  }

  if (!series) throw new Error(`pass a series: ${SIGN_THEME_SERIES.join(', ')}`);
  if (langs.length === 0) langs.push('ja');
  const unknown = signs.filter((sign) => !ZODIAC_SIGNS.includes(sign));
  if (unknown.length > 0) throw new Error(`unknown signs: ${unknown.join(', ')}`);

  return { series, langs, signs, out, resume, apply };
}

async function withRetry<T>(label: string, run: () => Promise<T>): Promise<T | undefined> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt === 3) {
        console.error(`${label}: ${(error as Error).message}`);
        return undefined;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
    }
  }
  return undefined;
}

async function writeOne(
  gemini: GeminiService,
  series: SignThemeSeries,
  sign: ZodiacSign,
  lang: Language,
): Promise<Entry | undefined> {
  const id = signThemeScriptId(series, sign);
  const theme = SERIES_KEYWORDS[lang][series];
  const signName = zodiacName(sign, lang) ?? sign;

  let draft = await withRetry(`${lang} ${id} generate`, () =>
    gemini.generateSignThemeScript(theme, signName, lang),
  );
  if (!draft) return undefined;

  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    const entry: Entry = { id, lang, sign, hook: draft.hook_text, body: draft.body_script, cta: '' };
    const issues = lintEvergreenEntry(entry);
    let rejected = issues.map((issue) => `${issue.field}: ${issue.code}`);

    if (rejected.length === 0) {
      const target: ReviewTarget = { id, hook: entry.hook, body: entry.body, cta: entry.cta };
      const verdicts = await withRetry(`${lang} ${id} review`, () =>
        gemini.reviewScripts([target], lang),
      );
      const verdict = verdicts?.[0];
      if (!verdict) return undefined;
      if (verdict.verdict === 'ok') return entry;
      rejected = [verdict.reason];
    }

    console.log(`${lang} ${id} pass ${pass}: ${rejected.join('; ')}`);
    if (pass === MAX_PASSES) return undefined;

    const repaired = await withRetry(`${lang} ${id} repair`, () =>
      gemini.repairScript(
        { id, hook: entry.hook, body: entry.body, cta: entry.cta },
        lang,
        rejected,
        '30s',
        lintRequirements(lang, '30s', undefined, signName),
      ),
    );
    if (!repaired) return undefined;
    draft = repaired;
  }

  return undefined;
}

async function main() {
  const { series, langs, signs, out, resume, apply } = parseArgs(process.argv.slice(2));
  const done: Entry[] = resume && existsSync(resume) ? JSON.parse(readFileSync(resume, 'utf8')) : [];
  const gemini = new GeminiService();
  const sheets = new GoogleSheetsService();

  for (const lang of langs) {
    const existing = new Set(
      (await sheets.getEvergreenScripts(lang)).map((script) => script.script_id),
    );

    for (const sign of signs) {
      const id = signThemeScriptId(series, sign);
      if (existing.has(id)) {
        console.log(`${lang} ${id}: already in the sheet`);
        continue;
      }
      if (done.some((entry) => entry.id === id && entry.lang === lang)) continue;

      const entry = await writeOne(gemini, series, sign, lang);
      if (!entry) {
        console.error(`${lang} ${id}: not written`);
        continue;
      }
      done.push(entry);
      writeFileSync(out, JSON.stringify(done, null, 2));
      console.log(`${lang} ${id}: ok`);
    }
  }

  console.log(`${done.length} scripts in ${out}`);
  if (!apply) {
    console.log('dry run; pass --apply to write them to Evergreen_Scripts');
    return;
  }

  const rows: EvergreenScript[] = done.map((entry) => ({
    script_id: entry.id,
    day_of_week: dayOfSign(entry.sign),
    lang_code: entry.lang,
    hook: entry.hook,
    body: entry.body,
    cta: entry.cta,
    hashtags: '',
    enabled: true,
    last_used_week: '',
    week_id: '',
  }));
  await sheets.addEvergreenScripts(rows);
  console.log(`wrote ${rows.length} rows to Evergreen_Scripts`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
