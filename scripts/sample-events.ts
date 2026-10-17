/**
 * Prints the code-assembled ja sky-event scripts for a date range, without Gemini and without
 * writing to the sheet: `npx tsx scripts/sample-events.ts [from YYYY-MM-DD] [to YYYY-MM-DD]`.
 * Fast-planet ingresses are skipped; every other event without wording is listed as missing.
 */
import { buildEventTemplateJa } from '@/lib/event-template-ja';
import { lintScript } from '@/lib/script-lint';
import { fixedCta } from '@/lib/fixed-cta';
import { SkyEvent, isReentry, sameEventNeighbours, scanSkyEvents } from '@/lib/sky-events';

const [from, to] = [process.argv[2] ?? new Date().toISOString().slice(0, 10), process.argv[3] ?? '2028-01-01'];
const start = new Date(`${from}T00:00:00Z`);
const end = new Date(`${to}T00:00:00Z`);
const wide = scanSkyEvents(new Date(Date.UTC(start.getUTCFullYear() - 60, 0, 1)), new Date(Date.UTC(end.getUTCFullYear() + 60, 0, 1)));
const FAST = new Set(['Mercury', 'Venus', 'Mars']);
const inScope = (e: SkyEvent) => !(FAST.has(e.planet) && ['ingress', 'exalted', 'debilitated'].includes(e.type));
const events = wide.filter((e) => e.date >= start && e.date < end && inScope(e));
/** An exaltation/debilitation is also an ingress on the same day; say it once, as the rarer event. */
const shadowed = (e: SkyEvent) =>
  e.type === 'ingress' && events.some((o) => o !== e && o.planet === e.planet && o.sign === e.sign && o.date.getTime() === e.date.getTime());
const picked = events.filter((x) => !shadowed(x) && !isReentry(x, wide));
let ok = 0;
for (const e of picked) {
  const head = `${e.date.toISOString().slice(0, 10)} ${e.type} ${e.planet} ${e.sign}`;
  const script = buildEventTemplateJa(e, sameEventNeighbours(e, wide));
  if (!script) {
    console.log(`■${head}: 型なし（動画にしない）\n`);
    continue;
  }
  const issues = lintScript({ hook_text: script.hook, body_script: script.body, cta_text: fixedCta('ja') }, 'ja', '30s', undefined, undefined, { template: true });
  if (!issues.length) ok += 1;
  console.log(`■${head}（締め込み${(script.hook + script.body + fixedCta('ja')).length}字、lint: ${issues.map((i) => i.code).join(',') || 'ok'}）`);
  console.log(`フック：${script.hook}\n本文：${script.body}\n`);
}
console.log(`lint ok: ${ok}`);
