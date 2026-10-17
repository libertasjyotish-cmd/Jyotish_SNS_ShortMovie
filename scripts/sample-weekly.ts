/**
 * Prints weekly 30s readings written with the code-built placement sentence, without writing
 * anything to the sheet: `npm run sample:weekly -- <lang> <week> <sign,...>`.
 */
import { GeminiService } from '@/services/gemini';
import { GoogleSheetsService, Language } from '@/services/sheets';
import { buildPlacementBrief, jaHouseGuide, placementSentence, placementsFor } from '@/lib/placements';
import { lintScript } from '@/lib/script-lint';
import { weekPeriodSpoken } from '@/lib/period';
import { zodiacName } from '@/lib/zodiac-names';
import { fixedCta } from '@/lib/fixed-cta';

async function main() {
  const [lang, week, signList] = process.argv.slice(2) as [Language, string, string];
  const transit = await new GoogleSheetsService().getWeeklyTransits(week);
  if (!transit) throw new Error(`no transit for ${week}`);
  const gemini = new GeminiService();
  const period = weekPeriodSpoken(week, lang) ?? "";

  for (const sign of signList.split(',')) {
    const moon = sign[0].toUpperCase() + sign.slice(1);
    const options = placementsFor(transit.transit_data, moon).flatMap((placement) => {
      const sentence = placementSentence(lang, period, moon, placement);
      const guide = lang === 'ja' ? jaHouseGuide(placement.house) : null;
      return sentence ? [{ planet: placement.planet, sentence, ...(guide ?? {}) }] : [];
    });
    const brief = buildPlacementBrief(transit.transit_data, moon);
    const content = await gemini.generateScript({
      week_id: week,
      lang_code: lang,
      target_type: 'Zodiac_Sign',
      zodiac_sign: sign,
      transit_reference: `${transit.transit_data}\n\n${brief}`,
      placement_options: options,
    });
    const script = { ...content.script_30s, cta_text: fixedCta(lang) };
    const issues = lintScript(script, lang, '30s', period, zodiacName(sign, lang));
    const [verdict] = await gemini.reviewScripts(
      [{ id: sign, hook: script.hook_text, body: script.body_script, cta: script.cta_text }],
      lang,
    );
    console.log(`■${zodiacName(sign, lang)}\nフック：${script.hook_text}\n本文：${script.body_script}`);
    console.log(`lint: ${issues.map((issue) => issue.code).join(',') || 'ok'} / review: ${verdict?.verdict} ${verdict?.reason ?? ''}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
