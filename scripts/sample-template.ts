/**
 * Prints the code-assembled weekly 30s readings for one week, without Gemini and without
 * writing to the sheet: `npm run sample:template -- <week> [--worries]`.
 */
import { GoogleSheetsService } from '@/services/sheets';
import { SIGNS } from '@/lib/placements';
import { buildWeeklyTemplateJa, listJaWorries } from '@/lib/weekly-template';
import { buildWeeklyTemplateEn, listEnWorries } from '@/lib/weekly-template-en';
import { lintScript } from '@/lib/script-lint';
import { weekPeriodSpoken } from '@/lib/period';
import { fixedCta } from '@/lib/fixed-cta';
import { zodiacName } from '@/lib/zodiac-names';

async function main() {
  const [week, ...flags] = process.argv.slice(2);
  const flag = flags.find((f) => f.startsWith('--worries'));
  const lang = flags.includes('--en') ? 'en' : 'ja';
  const build = lang === 'en' ? buildWeeklyTemplateEn : buildWeeklyTemplateJa;
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
    const chars = lang === 'en' ? `${(script.hook_text + ' ' + script.body_script).split(/\s+/).length} words` : `${(script.hook_text + script.body_script).length}字`;
    console.log(`■${zodiacName(sign.toLowerCase(), 'ja')}（${script.house}ハウス・${script.planet}、${chars}、lint: ${issues.map((i) => i.code).join(',') || 'ok'}）`);
    console.log(`フック：${script.hook_text}\n本文：${script.body_script}\n`);
  }
  if (flag) console.log((lang === 'en' ? listEnWorries() : listJaWorries()).join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
