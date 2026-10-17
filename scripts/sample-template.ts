/**
 * Prints the code-assembled weekly 30s readings for one week, without Gemini and without
 * writing to the sheet: `npm run sample:template -- <week> [--worries]`.
 */
import { GoogleSheetsService } from '@/services/sheets';
import { SIGNS } from '@/lib/placements';
import { buildWeeklyTemplateJa, listJaWorries } from '@/lib/weekly-template';
import { listEnWorries } from '@/lib/weekly-template-en';
import { WEEKLY_PACKS, WEEKLY_TEMPLATES } from '@/lib/weekly-templates';
import { listPackWorries } from '@/lib/weekly-template-pack';
import type { Language } from '@/services/sheets';
import { lintScript } from '@/lib/script-lint';
import { weekPeriodSpoken } from '@/lib/period';
import { fixedCta } from '@/lib/fixed-cta';
import { zodiacName } from '@/lib/zodiac-names';

async function main() {
  const [week, ...flags] = process.argv.slice(2);
  const flag = flags.find((f) => f.startsWith('--worries'));
  const lang = (flags.find((f) => f.startsWith('--lang='))?.slice(7) ??
    (flags.includes('--en') ? 'en' : 'ja')) as Language;
  const build = WEEKLY_TEMPLATES[lang];
  if (!build) throw new Error(`no weekly template for ${lang}`);
  const transit = await new GoogleSheetsService().getWeeklyTransits(week);
  if (!transit) throw new Error(`no transit for ${week}`);
  const period = weekPeriodSpoken(week, lang) ?? '';
  const weekNumber = Number(/W(\d+)/.exec(week)?.[1] ?? 0);
  const used = new Set<string>();
  for (const sign of SIGNS) {
    const script = build(transit.transit_data, sign, period, weekNumber, used);
    if (!script) {
      console.log(`■${sign}: no placement`);
      continue;
    }
    const issues = lintScript(
      { hook_text: script.hook_text, body_script: script.body_script, cta_text: fixedCta(lang) },
      lang,
      '30s',
      period,
      zodiacName(sign.toLowerCase(), lang),
      { template: true },
    );
    const chars = lang !== 'ja' ? `${(script.hook_text + ' ' + script.body_script).split(/\s+/).length} words` : `${(script.hook_text + script.body_script).length}字`;
    console.log(`■${zodiacName(sign.toLowerCase(), 'ja')}（${script.house}ハウス・${script.planet}、${chars}、lint: ${issues.map((i) => i.code).join(',') || 'ok'}）`);
    console.log(`フック：${script.hook_text}\n本文：${script.body_script}\n`);
  }
  if (flag) console.log((lang === 'ja' ? listJaWorries() : lang === 'en' ? listEnWorries() : listPackWorries(WEEKLY_PACKS[lang]!)).join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
