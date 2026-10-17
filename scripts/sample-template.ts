/**
 * Prints the code-assembled weekly 30s readings for one week, without Gemini and without
 * writing to the sheet: `npm run sample:template -- <week> [--worries]`.
 */
import { GoogleSheetsService } from '@/services/sheets';
import { SIGNS } from '@/lib/placements';
import { buildWeeklyTemplateJa, listJaWorries } from '@/lib/weekly-template';
import { lintScript } from '@/lib/script-lint';
import { weekPeriodSpoken } from '@/lib/period';
import { fixedCta } from '@/lib/fixed-cta';
import { zodiacName } from '@/lib/zodiac-names';

async function main() {
  const [week, flag] = process.argv.slice(2);
  const transit = await new GoogleSheetsService().getWeeklyTransits(week);
  if (!transit) throw new Error(`no transit for ${week}`);
  const period = weekPeriodSpoken(week, 'ja') ?? '';
  const weekNumber = Number(/W(\d+)/.exec(week)?.[1] ?? 0);
  const used = new Set<string>();
  for (const sign of SIGNS) {
    const script = buildWeeklyTemplateJa(transit.transit_data, sign, period, weekNumber, used);
    if (!script) {
      console.log(`■${sign}: no placement`);
      continue;
    }
    const issues = lintScript(
      { hook_text: script.hook_text, body_script: script.body_script, cta_text: fixedCta('ja') },
      'ja',
      '30s',
      period,
      zodiacName(sign.toLowerCase(), 'ja'),
    );
    const chars = (script.hook_text + script.body_script).length;
    console.log(`■${zodiacName(sign.toLowerCase(), 'ja')}（${script.house}ハウス・${script.planet}、${chars}字、lint: ${issues.map((i) => i.code).join(',') || 'ok'}）`);
    console.log(`フック：${script.hook_text}\n本文：${script.body_script}\n`);
  }
  if (flag === '--worries') console.log(listJaWorries().join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
