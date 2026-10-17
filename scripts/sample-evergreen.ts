/**
 * Prints the code-assembled Mon–Wed per-sign evergreen scripts of one series, without Gemini
 * and without writing to the sheet: `npx tsx scripts/sample-evergreen.ts <series>`.
 */
import { SIGNS } from '@/lib/placements';
import { buildEvergreenTemplateJa } from '@/lib/evergreen-template';
import { buildEvergreenTemplateEn } from '@/lib/evergreen-template-en';
import { buildEvergreenTemplateEs } from '@/lib/evergreen-template-es';
import { buildEvergreenTemplatePt } from '@/lib/evergreen-template-pt';
import { buildEvergreenTemplateId } from '@/lib/evergreen-template-id';
import type { Language } from '@/lib/languages';
import { lintScript } from '@/lib/script-lint';
import { fixedCta } from '@/lib/fixed-cta';
import { zodiacName } from '@/lib/zodiac-names';
import type { SignThemeSeries } from '@/lib/sign-themes';

const series = (process.argv[2] ?? 'work') as SignThemeSeries;
const lang = ((process.argv.find((a) => a.startsWith('--lang=')) ?? '--lang=ja').slice(7)) as Language;
const BUILD = { ja: buildEvergreenTemplateJa, en: buildEvergreenTemplateEn, es: buildEvergreenTemplateEs, pt: buildEvergreenTemplatePt, id: buildEvergreenTemplateId } as Partial<Record<Language, typeof buildEvergreenTemplateJa>>;
for (const sign of SIGNS) {
  const script = BUILD[lang]?.(series, sign) ?? null;
  if (!script) {
    console.log(`■${sign}: no template for ${series}`);
    continue;
  }
  const issues = lintScript(
    { hook_text: script.hook, body_script: script.body, cta_text: fixedCta(lang) },
    lang,
    '30s',
    undefined,
    zodiacName(sign.toLowerCase(), lang),
    { template: true },
  );
  const chars = lang === 'ja' ? `${(script.hook + script.body + fixedCta(lang)).length}字` : `${(script.hook + ' ' + script.body + ' ' + fixedCta(lang)).split(/\s+/).length} words`;
  console.log(`■${zodiacName(sign.toLowerCase(), lang)}（締め込み${chars}、lint: ${issues.map((i) => i.code).join(',') || 'ok'}）`);
  console.log(`フック：${script.hook}\n本文：${script.body}\n`);
}
