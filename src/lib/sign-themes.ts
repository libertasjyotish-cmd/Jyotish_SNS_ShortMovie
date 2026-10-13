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
 * The four signs each weekday carries, so the same sign is always spoken to on the same day and
 * the twelve signs of a week run in zodiac order. Thursday is left to the promotion.
 */
export const SIGNS_BY_DAY: Partial<Record<DayOfWeek, readonly ZodiacSign[]>> = {
  Mon: ZODIAC_SIGNS.slice(0, 4),
  Tue: ZODIAC_SIGNS.slice(4, 8),
  Wed: ZODIAC_SIGNS.slice(8, 12),
};

/**
 * The series a week runs. One series covers all twelve signs of the week and the next week moves
 * on to the next series, so a viewer never meets a different kind of video four signs later.
 */
export function seriesForWeek(weekId: string): SignThemeSeries {
  const [year, week] = weekId.split('-W').map(Number);
  // The offset keeps 2026-W43 on `nature`, the series that follows what W42 already shipped.
  const index = (year * 53 + week + 1) % SIGN_THEME_SERIES.length;
  return SIGN_THEME_SERIES[index];
}

/** The script a slot of a sign-series day must carry, or undefined for any other day. */
export function signThemeSlotScriptId(
  weekId: string,
  day: DayOfWeek,
  slot: number,
): string | undefined {
  const sign = SIGNS_BY_DAY[day]?.[slot];
  return sign ? signThemeScriptId(seriesForWeek(weekId), sign) : undefined;
}

export function signThemeScriptId(series: SignThemeSeries, sign: ZodiacSign): string {
  return `${ID_PREFIX}${series}-${sign}`;
}

/**
 * Order in which the evergreen scripts of a day are taken: the ones waiting longest first and,
 * among those, the zodiac order. Without the second key the slots of a day came out scrambled
 * (leo at noon, taurus at 15:00, aries at 18:00) because every unused script shares the same
 * empty `last_used_week`.
 */
export function compareSignThemePick(
  a: { script_id: string; last_used_week: string },
  b: { script_id: string; last_used_week: string },
): number {
  const byUse = (a.last_used_week || '').localeCompare(b.last_used_week || '');
  if (byUse !== 0) return byUse;
  return signThemeOrder(a.script_id) - signThemeOrder(b.script_id);
}

/** Position of a script's sign in the zodiac, or last for a script without one. */
export function signThemeOrder(script_id: string): number {
  const sign = parseSignThemeId(script_id)?.sign;
  return sign ? ZODIAC_SIGNS.indexOf(sign) : ZODIAC_SIGNS.length;
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
