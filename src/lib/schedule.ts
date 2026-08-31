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
 * Local posting time per day, in JST hours and minutes. `daily-dispatch` runs once a
 * day at 18:00 JST and posts everything already due, so every slot sits on that hour.
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

const DAY_OFFSET: Record<DayOfWeek, number> = {
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

/** ISO timestamp of the posting slot for `day` of the week starting at `weekStart`. */
export function scheduledPostTime(weekStart: Date, day: DayOfWeek): string {
  const [hour, minute] = POST_TIME_JST[day];
  const time = new Date(weekStart.getTime() + DAY_OFFSET[day] * MS_PER_DAY);
  time.setUTCHours(hour - JST_OFFSET_HOURS, minute, 0, 0);
  return time.toISOString();
}
