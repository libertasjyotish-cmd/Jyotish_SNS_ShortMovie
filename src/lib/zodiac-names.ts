/**
 * Sign names in each audience's own language.
 *
 * The queue stores the English name, but a viewer scrolling past a reading only knows their
 * sign by its local name, so the label on the video, the caption and the title use this.
 */

import { Language } from '@/lib/languages';

export const ZODIAC_SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

const NAMES: Record<Language, Record<ZodiacSign, string>> = {
  ja: {
    aries: '牡羊座',
    taurus: '牡牛座',
    gemini: '双子座',
    cancer: '蟹座',
    leo: '獅子座',
    virgo: '乙女座',
    libra: '天秤座',
    scorpio: '蠍座',
    sagittarius: '射手座',
    capricorn: '山羊座',
    aquarius: '水瓶座',
    pisces: '魚座',
  },
  en: {
    aries: 'Aries',
    taurus: 'Taurus',
    gemini: 'Gemini',
    cancer: 'Cancer',
    leo: 'Leo',
    virgo: 'Virgo',
    libra: 'Libra',
    scorpio: 'Scorpio',
    sagittarius: 'Sagittarius',
    capricorn: 'Capricorn',
    aquarius: 'Aquarius',
    pisces: 'Pisces',
  },
  es: {
    aries: 'Aries',
    taurus: 'Tauro',
    gemini: 'Géminis',
    cancer: 'Cáncer',
    leo: 'Leo',
    virgo: 'Virgo',
    libra: 'Libra',
    scorpio: 'Escorpio',
    sagittarius: 'Sagitario',
    capricorn: 'Capricornio',
    aquarius: 'Acuario',
    pisces: 'Piscis',
  },
  pt: {
    aries: 'Áries',
    taurus: 'Touro',
    gemini: 'Gêmeos',
    cancer: 'Câncer',
    leo: 'Leão',
    virgo: 'Virgem',
    libra: 'Libra',
    scorpio: 'Escorpião',
    sagittarius: 'Sagitário',
    capricorn: 'Capricórnio',
    aquarius: 'Aquário',
    pisces: 'Peixes',
  },
  id: {
    aries: 'Aries',
    taurus: 'Taurus',
    gemini: 'Gemini',
    cancer: 'Cancer',
    leo: 'Leo',
    virgo: 'Virgo',
    libra: 'Libra',
    scorpio: 'Scorpio',
    sagittarius: 'Sagitarius',
    capricorn: 'Capricorn',
    aquarius: 'Aquarius',
    pisces: 'Pisces',
  },
  ar: {
    aries: 'الحمل',
    taurus: 'الثور',
    gemini: 'الجوزاء',
    cancer: 'السرطان',
    leo: 'الأسد',
    virgo: 'العذراء',
    libra: 'الميزان',
    scorpio: 'العقرب',
    sagittarius: 'القوس',
    capricorn: 'الجدي',
    aquarius: 'الدلو',
    pisces: 'الحوت',
  },
  fr: {
    aries: 'Bélier',
    taurus: 'Taureau',
    gemini: 'Gémeaux',
    cancer: 'Cancer',
    leo: 'Lion',
    virgo: 'Vierge',
    libra: 'Balance',
    scorpio: 'Scorpion',
    sagittarius: 'Sagittaire',
    capricorn: 'Capricorne',
    aquarius: 'Verseau',
    pisces: 'Poissons',
  },
  de: {
    aries: 'Widder',
    taurus: 'Stier',
    gemini: 'Zwillinge',
    cancer: 'Krebs',
    leo: 'Löwe',
    virgo: 'Jungfrau',
    libra: 'Waage',
    scorpio: 'Skorpion',
    sagittarius: 'Schütze',
    capricorn: 'Steinbock',
    aquarius: 'Wassermann',
    pisces: 'Fische',
  },
};

/** Falls back to the stored name when the queue holds something outside the twelve. */
export function zodiacName(sign: string | undefined, lang: Language): string | undefined {
  if (!sign) return undefined;
  const key = sign.trim().toLowerCase() as ZodiacSign;
  return NAMES[lang][key] ?? sign;
}
