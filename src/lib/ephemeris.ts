/**
 * Sidereal (Lahiri) transit reference for a week.
 *
 * Every factual statement in a weekly script has to come from this text, so it is
 * computed rather than written by hand: geocentric ecliptic longitudes at 00:00 UT,
 * shifted by the Lahiri ayanamsa, for each day of the week.
 */
import { Body, Ecliptic, GeoVector } from 'astronomy-engine';

const SIGNS = [
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

/** Order follows the classical Navagraha listing used in the existing sheet rows. */
const PLANETS: { label: string; body: Body }[] = [
  { label: 'Sun', body: Body.Sun },
  { label: 'Moon', body: Body.Moon },
  { label: 'Mars', body: Body.Mars },
  { label: 'Mercury', body: Body.Mercury },
  { label: 'Jupiter', body: Body.Jupiter },
  { label: 'Venus', body: Body.Venus },
  { label: 'Saturn', body: Body.Saturn },
];

const MS_PER_DAY = 86_400_000;
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
/** Lahiri ayanamsa at J2000.0: 23°51'11.6". */
const AYANAMSA_J2000 = 23.85322;

function julianCenturies(date: Date): number {
  return (date.getTime() - J2000) / (36525 * MS_PER_DAY);
}

/**
 * Lahiri ayanamsa: its J2000 value plus IAU 2006 general precession in longitude,
 * which keeps it within a fraction of an arcminute of Swiss Ephemeris for our range.
 */
export function ayanamsa(date: Date): number {
  const t = julianCenturies(date);
  return AYANAMSA_J2000 + (5028.796195 * t + 1.1054348 * t * t) / 3600;
}

function normalize(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Mean lunar node (Rahu), the point Jyotish uses for the shadow planets. */
function meanNodeLongitude(date: Date): number {
  const t = julianCenturies(date);
  return normalize(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t);
}

export function siderealLongitude(body: Body, date: Date): number {
  const { elon } = Ecliptic(GeoVector(body, date, true));
  return normalize(elon - ayanamsa(date));
}

export function signOf(longitude: number): string {
  return SIGNS[Math.floor(normalize(longitude) / 30) % 12];
}

function degreesInSign(longitude: number): number {
  return normalize(longitude) % 30;
}

function formatPosition(longitude: number): string {
  return `${signOf(longitude)} ${degreesInSign(longitude).toFixed(1)}deg`;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDay(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/** True when the longitude decreases, i.e. the planet appears to move backwards. */
function isRetrograde(first: number, last: number): boolean {
  const delta = ((last - first + 540) % 360) - 180;
  return delta < 0;
}

function ingressNotes(longitudes: number[], days: Date[]): string {
  const notes: string[] = [];
  for (let index = 1; index < longitudes.length; index += 1) {
    if (signOf(longitudes[index]) !== signOf(longitudes[index - 1])) {
      notes.push(`Enters ${signOf(longitudes[index])} on ${formatDay(days[index])}`);
    }
  }
  return notes.length > 0 ? ` ${notes.join('. ')}.` : '';
}

function describe(label: string, longitudes: number[], days: Date[], alwaysRetrograde = false): string {
  const first = longitudes[0];
  const last = longitudes[longitudes.length - 1];
  const retrograde = alwaysRetrograde
    ? ' (always retrograde)'
    : isRetrograde(first, last)
      ? ' retrograde'
      : '';
  return `${label}: ${formatPosition(first)} -> ${formatPosition(last)}${retrograde}.${ingressNotes(longitudes, days)}`;
}

/**
 * Builds the `transit_data` text for the week starting at `weekStart` (Monday 00:00 UT).
 * Positions are sampled once per day, Monday through Sunday.
 */
export function buildTransitReference(weekId: string, weekStart: Date): string {
  const days = Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * MS_PER_DAY));
  const header =
    `Week ${weekId} (${formatDay(days[0])}-${days[6].getUTCDate()}, ${days[6].getUTCFullYear()}), ` +
    'sidereal Lahiri, geocentric, 00:00 UT.';

  const lines = PLANETS.map(({ label, body }) =>
    describe(label, days.map((day) => siderealLongitude(body, day)), days),
  );
  lines.push(
    describe('Rahu', days.map((day) => normalize(meanNodeLongitude(day) - ayanamsa(day))), days, true),
  );

  return [header, ...lines].join('\n');
}
