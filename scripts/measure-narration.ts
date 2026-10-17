/**
 * Read-only: how long the rendered 30s narration actually runs per language against its
 * length, so the per-language length caps can be set to the same seconds.
 * `npm run measure:narration -- <week...>`
 */
import { GoogleSheetsService } from '@/services/sheets';
import { scriptLength } from '@/lib/script-lint';
import type { Language } from '@/services/sheets';

async function main() {
  const weeks = process.argv.slice(2);
  const sheets = new GoogleSheetsService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const load = (name: string) => (sheets as any).loadTable(name);
  const renders = new Map<string, number>();
  for (const row of (await load('Render_Outputs')).rows) {
    const seconds = Number(row.values.duration_30s);
    if (row.values.task_id && seconds > 0) renders.set(row.values.task_id, seconds);
  }
  const byLang = new Map<string, { len: number; sec: number }[]>();
  for (const week of weeks) {
    for (const out of await sheets.getScriptOutputsByWeek(week)) {
      const seconds = renders.get(out.task_id);
      if (!seconds || !out.script_30s_json) continue;
      const s = JSON.parse(out.script_30s_json);
      const text = [s.hook_text, s.body_script, s.cta_text].filter(Boolean).join(' ');
      const list = byLang.get(out.lang_code) ?? [];
      list.push({ len: scriptLength(text, out.lang_code as Language), sec: seconds });
      byLang.set(out.lang_code, list);
    }
  }
  const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  for (const [lang, list] of Array.from(byLang.entries())) {
    const rate = median(list.map((r) => r.len / r.sec));
    console.log(
      `${lang}\tn=${list.length}\tlen median ${median(list.map((r) => r.len))} (${Math.min(...list.map((r) => r.len))}-${Math.max(...list.map((r) => r.len))})\tsec median ${median(list.map((r) => r.sec)).toFixed(1)} (${Math.min(...list.map((r) => r.sec)).toFixed(1)}-${Math.max(...list.map((r) => r.sec)).toFixed(1)})\tunits/sec ${rate.toFixed(2)}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
