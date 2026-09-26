/**
 * Weekly publishing calendar.
 *
 * A week runs Monday to Sunday (ISO 8601), matching the `week_id` used across the
 * sheets. Monday to Thursday carry evergreen theme videos that apply to every Moon
 * sign; Friday to Sunday carry the twelve sign-specific readings for that same week,
 * four per day, so even the Sunday batch still covers the days ahead.
 */

import { Language } from '@/lib/languages';

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
 * Where the audience of each language is. Posting times are wall-clock times there, so an
 * English video lands in an American or British evening instead of the middle of its night.
 * English and Spanish carry two markets, and their slots are split between them.
 */
export const AUDIENCE_MARKETS: Record<Language, string[]> = {
  ja: ['Asia/Tokyo'],
  en: ['Europe/London', 'America/New_York'],
  es: ['Europe/Madrid', 'America/Mexico_City'],
  pt: ['America/Sao_Paulo'],
  id: ['Asia/Jakarta'],
  ar: ['Asia/Dubai'],
  fr: ['Europe/Paris'],
  de: ['Europe/Berlin'],
};

/**
 * The four sign readings of a day go out hours apart instead of together: posts released at
 * the same minute compete with each other for the same audience, which costs each one part of
 * the first-hour reach the platforms decide distribution from. A single-market language
 * spreads them over its own day; a two-market one gives each market the two evening hours
 * that carry the most watch time there.
 */
const ZODIAC_HOURS_ONE_MARKET = [12, 15, 18, 21];
const ZODIAC_HOURS_TWO_MARKETS = [18, 21];

/** Local posting time of the one theme video a day. */
const THEME_HOUR = 18;

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
const MS_PER_MINUTE = 60_000;

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

/**
 * Monday of the week the sign readings of `weekStart` are posted in: they go out on the
 * Friday to Sunday before the week they cover, so the reading is still ahead of the viewer.
 */
export function zodiacPostWeekStart(weekStart: Date): Date {
  return new Date(weekStart.getTime() - 7 * MS_PER_DAY);
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

/** Monday 00:00 UTC of `2026-W40`, or undefined when the id is not an ISO week. */
export function weekStartFromId(weekId: string): Date | undefined {
  const parsed = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!parsed) return undefined;
  const [, year, week] = parsed;
  // January 4th always falls in ISO week 1.
  const firstMonday = startOfIsoWeek(new Date(Date.UTC(Number(year), 0, 4)));
  return new Date(firstMonday.getTime() + (Number(week) - 1) * 7 * MS_PER_DAY);
}

/** Minutes `timeZone` is ahead of UTC at `instant`, daylight saving included. */
function zoneOffsetMinutes(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  // Intl prints midnight as hour 24 in some runtimes.
  const asUtc = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour') % 24,
    field('minute'),
    field('second'),
  );
  return Math.round((asUtc - instant.getTime()) / MS_PER_MINUTE);
}

/** The instant at which `timeZone` reads `hour:minute` on the UTC calendar day of `day`. */
function localTimeToUtc(day: Date, hour: number, minute: number, timeZone: string): Date {
  const wallClock = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    hour,
    minute,
  );
  // The offset itself depends on the instant, so the first guess is corrected once, which
  // is enough for every zone except the hour a DST change skips.
  const guess = new Date(wallClock - zoneOffsetMinutes(timeZone, new Date(wallClock)) * MS_PER_MINUTE);
  return new Date(wallClock - zoneOffsetMinutes(timeZone, guess) * MS_PER_MINUTE);
}

/**
 * Market and local hour of the `slot`-th sign reading of a day, or of the day's theme video
 * when `slot` is undefined. Two-market languages alternate: the readings by slot, and the
 * theme videos by weekday, so over Monday to Thursday each market gets two of them.
 */
function postingSlot(lang: Language, day: DayOfWeek, slot?: number): [string, number] {
  const markets = AUDIENCE_MARKETS[lang];
  if (slot === undefined) {
    return [markets[DAY_OFFSET[day] % markets.length], THEME_HOUR];
  }
  if (markets.length === 1) {
    return [markets[0], ZODIAC_HOURS_ONE_MARKET[slot % ZODIAC_HOURS_ONE_MARKET.length]];
  }
  const hours = ZODIAC_HOURS_TWO_MARKETS;
  return [markets[slot % markets.length], hours[Math.floor(slot / markets.length) % hours.length]];
}

/**
 * ISO timestamp of the posting slot for `day` of the week starting at `weekStart`, in the
 * time zone of the market it is aimed at. `slot` picks one of the day's four sign readings;
 * theme videos omit it and take the single slot of their day.
 */
export function scheduledPostTime(
  weekStart: Date,
  day: DayOfWeek,
  lang: Language,
  slot?: number,
): string {
  const [timeZone, hour] = postingSlot(lang, day, slot);
  const date = new Date(weekStart.getTime() + DAY_OFFSET[day] * MS_PER_DAY);
  return localTimeToUtc(date, hour, 0, timeZone).toISOString();
}
