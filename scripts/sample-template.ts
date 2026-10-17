/**
 * Prints the code-assembled weekly 30s readings for one week, without Gemini and without
 * writing to the sheet: `npm run sample:template -- <week> [--worries] [--local]`.
 * `--local` computes the transits from the ephemeris instead of reading them from the sheet.
 */
import { GoogleSheetsService } from '@/services/sheets';
import { buildTransitReference } from '@/lib/ephemeris';
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
  const transit = flags.includes('--local')
    ? { transit_data: buildTransitReference(week, isoWeekMonday(week)) }
    : await new GoogleSheetsService().getWeeklyTransits(week);
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

function isoWeekMonday(weekId: string): Date {
  const [, year, week] = /^(\d{4})-W(\d{2})$/.exec(weekId) ?? [];
  if (!year) throw new Error(`bad week id ${weekId}`);
  const jan4 = Date.UTC(Number(year), 0, 4);
  const day = new Date(jan4).getUTCDay() || 7;
  return new Date(jan4 + ((Number(week) - 1) * 7 - (day - 1)) * 86_400_000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
