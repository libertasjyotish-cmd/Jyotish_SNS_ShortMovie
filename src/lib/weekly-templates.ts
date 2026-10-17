/**
 * Languages whose weekly 30s readings are assembled from fixed sentences instead of Gemini.
 * A sign's reading is built after the signs before it in zodiac order with one shared
 * `used` set, so the twelve signs of a week never ask the same question, whichever slot is
 * generated first.
 */
import { SIGNS, asSign } from '@/lib/placements';
import { buildWeeklyTemplateJa, TemplateScript } from '@/lib/weekly-template';
import { buildWeeklyTemplateEn } from '@/lib/weekly-template-en';
import { buildFromPack, LanguagePack } from '@/lib/weekly-template-pack';
import { ES } from '@/lib/weekly-template-es';
import { PT } from '@/lib/weekly-template-pt';
import { ID } from '@/lib/weekly-template-id';
import { AR } from '@/lib/weekly-template-ar';
import type { Language } from '@/services/sheets';

type Builder = typeof buildWeeklyTemplateJa;

export const WEEKLY_PACKS: Partial<Record<Language, LanguagePack>> = { es: ES, pt: PT, id: ID, ar: AR };

export const WEEKLY_TEMPLATES: Partial<Record<Language, Builder>> = {
  ja: buildWeeklyTemplateJa,
  en: buildWeeklyTemplateEn,
  ...Object.fromEntries(
    Object.entries(WEEKLY_PACKS).map(([lang, pack]) => [lang, buildFromPack(pack as LanguagePack)]),
  ),
};

export const WEEKLY_TEMPLATE_HASHTAGS: Partial<Record<Language, (sign: string) => string>> = {
  ja: (sign) => `#インド占星術 #月星座 #${sign}`,
  en: (sign) => `#VedicAstrology #MoonSign #${sign}`,
  es: (sign) => `#AstrologiaVedica #SignoLunar #${sign}`,
  pt: (sign) => `#AstrologiaVedica #SignoLunar #${sign}`,
  id: (sign) => `#AstrologiWeda #ZodiakBulan #${sign}`,
  ar: (sign) => `#التنجيم_الفيدي #البرج_القمري #${sign}`,
};

export function buildWeeklyFromTemplate(
  language: Language,
  reference: string,
  moonSign: string,
  spokenPeriod: string,
  weekNumber: number,
): TemplateScript | null {
  const build = WEEKLY_TEMPLATES[language];
  const moon = asSign(moonSign);
  if (!build || !moon) return null;
  const used = new Set<string>();
  for (const sign of SIGNS) {
    const script = build(reference, sign, spokenPeriod, weekNumber, used);
    if (sign === moon) return script;
  }
  return null;
}
