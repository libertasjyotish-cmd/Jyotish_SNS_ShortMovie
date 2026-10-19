/**
 * Prints the code-assembled sky-event scripts of the calendar for a date range and lints them,
 * without Gemini and without the sheet:
 * `npx tsx scripts/sample-events.ts [from YYYY-MM-DD] [to YYYY-MM-DD] [--lang=ja,en,…]`.
 */
import { buildEventScript, calendarEvents, eventScriptId } from '@/lib/event-calendar';
import { lintScript } from '@/lib/script-lint';
import { fixedCta } from '@/lib/fixed-cta';
import type { Language } from '@/services/sheets';

const args = process.argv.slice(2);
const [from, to] = args.filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const langs = (args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'ja').split(',') as Language[];
const start = new Date(`${from ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`);
const end = new Date(`${to ?? '2028-01-01'}T00:00:00Z`);
let ok = 0;
let bad = 0;
for (const e of calendarEvents(start, end)) {
  for (const lang of langs) {
    const script = buildEventScript(lang, e);
    if (!script) {
      bad += 1;
      console.log(`■${eventScriptId(e)} [${lang}]: 型なし\n`);
      continue;
    }
    const issues = lintScript({ hook_text: script.hook, body_script: script.body, cta_text: fixedCta(lang) }, lang, '30s', undefined, undefined, { template: true });
    if (issues.length) bad += 1; else ok += 1;
    console.log(`■${eventScriptId(e)} [${lang}] lint: ${issues.map((i) => `${i.code}${i.detail ? `(${i.detail})` : ''}`).join(',') || 'ok'}`);
    console.log(`${script.hook}\n${script.body}\n`);
  }
}
console.log(`lint ok: ${ok}, ng: ${bad}`);
if (bad) process.exitCode = 1;
