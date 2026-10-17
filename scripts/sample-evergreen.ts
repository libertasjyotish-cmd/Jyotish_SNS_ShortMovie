/**
 * Prints the code-assembled Mon–Wed per-sign evergreen scripts of one series, without Gemini
 * and without writing to the sheet: `npx tsx scripts/sample-evergreen.ts <series>`.
 */
import { SIGNS } from '@/lib/placements';
import { buildEvergreenTemplateJa } from '@/lib/evergreen-template';
import { lintScript } from '@/lib/script-lint';
import { fixedCta } from '@/lib/fixed-cta';
import { zodiacName } from '@/lib/zodiac-names';
import type { SignThemeSeries } from '@/lib/sign-themes';

const series = (process.argv[2] ?? 'work') as SignThemeSeries;
for (const sign of SIGNS) {
  const script = buildEvergreenTemplateJa(series, sign);
  if (!script) {
    console.log(`■${sign}: no template for ${series}`);
    continue;
  }
  const issues = lintScript(
    { hook_text: script.hook, body_script: script.body, cta_text: fixedCta('ja') },
    'ja',
    '30s',
    undefined,
    zodiacName(sign.toLowerCase(), 'ja'),
    { template: true },
  );
  const chars = (script.hook + script.body + fixedCta('ja')).length;
  console.log(`■${zodiacName(sign.toLowerCase(), 'ja')}（締め込み${chars}字、lint: ${issues.map((i) => i.code).join(',') || 'ok'}）`);
  console.log(`フック：${script.hook}\n本文：${script.body}\n`);
}
