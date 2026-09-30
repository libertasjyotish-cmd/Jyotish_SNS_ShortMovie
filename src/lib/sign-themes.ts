/**
 * Evergreen videos aimed at one Moon sign.
 *
 * The Monday to Wednesday slots used to carry explanations of how Jyotish works, which no one
 * searches for and which never name whose life they describe. They now carry three series that
 * are tied to a sign instead, so each one is found the same way the weekly readings are: by a
 * viewer looking up their own sign. The script id spells out both parts, `sign-compat-aries`,
 * so the queue, the title and the label on the video can all be derived from it.
 */

import { DayOfWeek } from '@/lib/schedule';
import { ZODIAC_SIGNS, ZodiacSign } from '@/lib/zodiac-names';

export const SIGN_THEME_SERIES = ['compat', 'nature', 'sidereal'] as const;

export type SignThemeSeries = (typeof SIGN_THEME_SERIES)[number];

const ID_PREFIX = 'sign-';

/**
 * One series per weekday, so a viewer who follows the channel meets the same kind of video on
 * the same day and twelve weeks pass before a sign repeats. Thursday is left to the promotion.
 */
export const SERIES_BY_DAY: Partial<Record<DayOfWeek, SignThemeSeries>> = {
  Mon: 'compat',
  Tue: 'nature',
  Wed: 'sidereal',
};

export function signThemeScriptId(series: SignThemeSeries, sign: ZodiacSign): string {
  return `${ID_PREFIX}${series}-${sign}`;
}

/** The series and sign of a sign-targeted evergreen script, or undefined for any other id. */
export function parseSignThemeId(
  script_id: string,
): { series: SignThemeSeries; sign: ZodiacSign } | undefined {
  if (!script_id.startsWith(ID_PREFIX)) return undefined;
  const [series, sign] = script_id.slice(ID_PREFIX.length).split('-');
  if (!SIGN_THEME_SERIES.includes(series as SignThemeSeries)) return undefined;
  if (!ZODIAC_SIGNS.includes(sign as ZodiacSign)) return undefined;
  return { series: series as SignThemeSeries, sign: sign as ZodiacSign };
}
