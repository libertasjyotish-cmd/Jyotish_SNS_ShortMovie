/**
 * The sky-event calendar behind the Thursday event videos: which events are spoken at all, which
 * Thursday carries each one, and the script for it in every language. Everything is calculated
 * from the ephemeris and assembled from fixed sentences; no model writes any of it.
 */
import { buildEventTemplateJa } from '@/lib/event-template-ja';
import { buildEventTemplateIntl } from '@/lib/event-template-intl';
import type { EvergreenTemplate } from '@/lib/evergreen-template';
import { DAY, SkyEvent, isReentry, sameEventNeighbours, scanSkyEvents } from '@/lib/sky-events';
import { EVENT_SCRIPT_PREFIX, PROMO_DAY, PROMO_SLOTS } from '@/lib/schedule';
import type { Language } from '@/services/sheets';

const FAST = new Set(['Mercury', 'Venus', 'Mars']);
/** Fast planets change sign every few weeks, so their plain sign changes are not events. */
const inScope = (e: SkyEvent) => !(FAST.has(e.planet) && e.type === 'ingress');

/** Wide enough to find the previous and the next time of a rare event. */
function widePool(around: Date): SkyEvent[] {
  const y = around.getUTCFullYear();
  return scanSkyEvents(new Date(Date.UTC(y - 60, 0, 1)), new Date(Date.UTC(y + 60, 0, 1)));
}

let cache: { year: number; pool: SkyEvent[] } | undefined;
function poolFor(date: Date): SkyEvent[] {
  if (!cache || cache.year !== date.getUTCFullYear()) cache = { year: date.getUTCFullYear(), pool: widePool(date) };
  return cache.pool;
}

/** Events with approved wording in `[start, end)`, one per occurrence. */
export function calendarEvents(start: Date, end: Date, pool = poolFor(start)): SkyEvent[] {
  const events = pool.filter((e) => e.date >= start && e.date < end && inScope(e));
  // An exaltation/debilitation is also an ingress on the same day; say it once, as the rarer event.
  const shadowed = (e: SkyEvent) =>
    e.type === 'ingress' &&
    events.some((o) => o !== e && o.planet === e.planet && o.sign === e.sign && o.date.getTime() === e.date.getTime());
  return events.filter((e) => !shadowed(e) && !isReentry(e, pool) && buildEventTemplateJa(e, {}) !== null);
}

const DAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/**
 * The events a week's Thursday announces: everything from that Thursday up to the next one, so
 * each event is posted once, on the Thursday on or before it.
 */
export function eventsForWeek(weekStart: Date): SkyEvent[] {
  const thursday = new Date(weekStart.getTime() + DAY_INDEX[PROMO_DAY] * DAY);
  return calendarEvents(thursday, new Date(thursday.getTime() + 7 * DAY)).slice(0, PROMO_SLOTS);
}

/** `promo-event-2026-10-25-retrograde-mercury`. */
export function eventScriptId(e: SkyEvent): string {
  return `${EVENT_SCRIPT_PREFIX}${e.date.toISOString().slice(0, 10)}-${e.type}-${e.planet.toLowerCase()}`;
}

export function eventFromScriptId(scriptId: string): SkyEvent | undefined {
  const m = /^promo-event-(\d{4}-\d{2}-\d{2})-([a-z-]+)-([a-z-]+)$/.exec(scriptId);
  if (!m) return undefined;
  const day = new Date(`${m[1]}T00:00:00Z`);
  return calendarEvents(new Date(day.getTime() - DAY), new Date(day.getTime() + 2 * DAY), poolFor(day)).find(
    (e) => eventScriptId(e) === scriptId,
  );
}

export function buildEventScript(lang: Language, e: SkyEvent): EvergreenTemplate | null {
  const around = sameEventNeighbours(e, poolFor(e.date));
  return lang === 'ja' ? buildEventTemplateJa(e, around) : buildEventTemplateIntl(lang, e, around);
}
