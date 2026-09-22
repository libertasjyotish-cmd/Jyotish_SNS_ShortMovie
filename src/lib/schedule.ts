/**
 * Weekly publishing calendar.
 *
 * A week runs Monday to Sunday (ISO 8601), matching the `week_id` used across the
 * sheets. Monday to Thursday carry evergreen theme videos that apply to every Moon
 * sign; Friday to Sunday carry the twelve sign-specific readings for that same week,
 * four per day, so even the Sunday batch still covers the days ahead.
 */

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const THEME_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu'];

/**
 * Day the Kāl Kundali promotion takes over from the theme video. It only applies while
 * `PROMO_ENABLED` is on; until then the day carries a theme like the rest of the week.
 */
export const PROMO_DAY: DayOfWeek = 'Thu';

/** `Evergreen_Scripts` rows whose `script_id` starts with this hold promotion copy. */
export const PROMO_SCRIPT_PREFIX = 'promo-';

export function isPromoScriptId(script_id: string): boolean {
  return script_id.startsWith(PROMO_SCRIPT_PREFIX);
}

export const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

/** Four signs per day, Friday through Sunday. */
export const ZODIAC_DAYS: { day: DayOfWeek; signs: ZodiacSign[] }[] = [
  { day: 'Fri', signs: ZODIAC_SIGNS.slice(0, 4) as ZodiacSign[] },
  { day: 'Sat', signs: ZODIAC_SIGNS.slice(4, 8) as ZodiacSign[] },
  { day: 'Sun', signs: ZODIAC_SIGNS.slice(8, 12) as ZodiacSign[] },
];

/**
 * Local posting time per day, in JST hours and minutes, for the one theme video a day.
 * `daily-dispatch` posts everything already due, so a slot only has to fall on one of
 * the hours it runs.
 */
const POST_TIME_JST: Record<DayOfWeek, [number, number]> = {
  Mon: [18, 0],
  Tue: [18, 0],
  Wed: [18, 0],
  Thu: [18, 0],
  Fri: [18, 0],
  Sat: [18, 0],
  Sun: [18, 0],
};

/**
 * The four sign readings of a day go out three hours apart instead of together: posts
 * released at the same minute compete with each other for the same audience, which costs
 * each one part of the first-hour reach the platforms decide distribution from.
 */
export const ZODIAC_SLOTS_JST: [number, number][] = [
  [12, 0],
  [15, 0],
  [18, 0],
  [21, 0],
];

export const DAY_OFFSET: Record<DayOfWeek, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

const MS_PER_DAY = 86_400_000;
const JST_OFFSET_HOURS = 9;

function utcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Monday 00:00 UTC of the ISO week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
  const day = utcDate(date);
  // getUTCDay(): Sunday is 0, so shift it to the end of the week.
  const weekday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - weekday * MS_PER_DAY);
}

export function nextWeekStart(date: Date): Date {
  return new Date(startOfIsoWeek(date).getTime() + 7 * MS_PER_DAY);
}

/** `2026-W36` for the ISO week containing `date`. */
export function isoWeekId(date: Date): string {
  const monday = startOfIsoWeek(date);
  const thursday = new Date(monday.getTime() + 3 * MS_PER_DAY);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstMonday = startOfIsoWeek(firstThursday);
  const week = Math.round((thursday.getTime() - firstMonday.getTime()) / (7 * MS_PER_DAY)) + 1;
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * ISO timestamp of the posting slot for `day` of the week starting at `weekStart`.
 * `slot` picks one of `ZODIAC_SLOTS_JST` for the sign readings; theme videos omit it and
 * take the single slot of their day.
 */
export function scheduledPostTime(weekStart: Date, day: DayOfWeek, slot?: number): string {
  const [hour, minute] =
    slot === undefined ? POST_TIME_JST[day] : ZODIAC_SLOTS_JST[slot % ZODIAC_SLOTS_JST.length];
  const time = new Date(weekStart.getTime() + DAY_OFFSET[day] * MS_PER_DAY);
  time.setUTCHours(hour - JST_OFFSET_HOURS, minute, 0, 0);
  return time.toISOString();
}
