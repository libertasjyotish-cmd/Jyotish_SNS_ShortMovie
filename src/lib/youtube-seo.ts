import { Language } from '@/services/sheets';

const BRAND = 'Libertas Jyotish';
const TITLE_LIMIT = 100;

/**
 * YouTube weighs the opening words of a title most, and viewers search for the format
 * ("aries weekly horoscope"), not the brand, so the searched phrase leads every title.
 */
export const TITLE_KEYWORDS: Record<Language, { weekly: string; theme: string }> = {
  ja: { weekly: '今週の運勢', theme: 'インド占星術' },
  en: { weekly: 'Weekly Horoscope', theme: 'Vedic Astrology' },
  es: { weekly: 'Horóscopo Semanal', theme: 'Astrología Védica' },
  pt: { weekly: 'Horóscopo Semanal', theme: 'Astrologia Védica' },
  id: { weekly: 'Horoskop Mingguan', theme: 'Astrologi Veda' },
  ar: { weekly: 'حظك هذا الأسبوع', theme: 'التنجيم الفيدي' },
  fr: { weekly: 'Horoscope Hebdomadaire', theme: 'Astrologie Védique' },
  de: { weekly: 'Wochenhoroskop', theme: 'Vedische Astrologie' },
};

/** Tags carry the spellings a title has no room for, including the untranslated Sanskrit terms. */
export const VIDEO_TAGS: Record<Language, string[]> = {
  ja: ['インド占星術', 'ジョーティシュ', '月星座', 'ナクシャトラ', '週間占い', '今週の運勢', '占星術', 'Jyotish', 'Vedic Astrology'],
  en: ['vedic astrology', 'jyotish', 'moon sign', 'nakshatra', 'sidereal astrology', 'weekly horoscope', 'indian astrology', 'rashi', 'dasha'],
  es: ['astrología védica', 'jyotish', 'signo lunar', 'nakshatra', 'astrología sideral', 'horóscopo semanal', 'astrología hindú', 'rashi', 'dasha'],
  pt: ['astrologia védica', 'jyotish', 'signo lunar', 'nakshatra', 'astrologia sideral', 'horóscopo semanal', 'astrologia indiana', 'rashi', 'dasha'],
  id: ['astrologi veda', 'jyotish', 'zodiak bulan', 'nakshatra', 'astrologi sideral', 'horoskop mingguan', 'astrologi india', 'rashi', 'dasha'],
  ar: ['التنجيم الفيدي', 'جيوتيش', 'برج القمر', 'ناكشاترا', 'الابراج', 'حظك هذا الاسبوع', 'التنجيم الهندي', 'راشي', 'داشا'],
  fr: ['astrologie védique', 'jyotish', 'signe lunaire', 'nakshatra', 'astrologie sidérale', 'horoscope hebdomadaire', 'astrologie indienne', 'rashi', 'dasha'],
  de: ['vedische astrologie', 'jyotish', 'mondzeichen', 'nakshatra', 'siderische astrologie', 'wochenhoroskop', 'indische astrologie', 'rashi', 'dasha'],
};

export interface TitleParams {
  lang: Language;
  /** Sign name for a weekly reading; empty for an evergreen theme. */
  zodiacSign?: string;
  hook: string;
  /** Dated week a sign reading covers. */
  period?: string;
}

/** The brand is dropped rather than truncated when the searchable part fills the title. */
export function buildYouTubeTitle({ lang, zodiacSign, hook, period }: TitleParams): string {
  const keywords = TITLE_KEYWORDS[lang];
  const lead = zodiacSign
    ? [zodiacSign, keywords.weekly, period].filter(Boolean).join(' ')
    : keywords.theme;
  const head = hook ? `${lead}: ${hook}` : lead;
  const withBrand = `${head} | ${BRAND}`;
  return (withBrand.length <= TITLE_LIMIT ? withBrand : head).slice(0, TITLE_LIMIT);
}
