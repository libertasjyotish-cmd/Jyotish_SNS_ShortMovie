/** Sky events (ingress, stations, exaltation, Jupiter–Saturn conjunction, eclipses) found day by day from the ephemeris. */
import { Body, NextGlobalSolarEclipse, NextLunarEclipse, SearchGlobalSolarEclipse, SearchLunarEclipse } from 'astronomy-engine';
import { meanNodeLongitude, siderealLongitude, signOf } from '@/lib/ephemeris';

export interface SkyEvent { date: Date; type: string; planet: string; sign: string }

const BODIES: [string, Body][] = [
  ['Mars', Body.Mars], ['Mercury', Body.Mercury], ['Jupiter', Body.Jupiter], ['Venus', Body.Venus], ['Saturn', Body.Saturn],
];
const EXALT: Record<string, string> = { Mars: 'Capricorn', Mercury: 'Virgo', Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra' };
const DEBIL: Record<string, string> = { Mars: 'Cancer', Mercury: 'Pisces', Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries' };
export const DAY = 86_400_000;
const diff = (a: number, b: number) => ((a - b + 540) % 360) - 180;

export function scanSkyEvents(start: Date, end: Date): SkyEvent[] {
  const out: SkyEvent[] = [];
  const prev: Record<string, { lon: number; dir: number }> = {};
  let prevNode = -1;
  for (let t = start.getTime(); t < end.getTime(); t += DAY) {
    const d = new Date(t);
    const lons: Record<string, number> = {};
    for (const [name, body] of BODIES) {
      const lon = siderealLongitude(body, d);
      lons[name] = lon;
      const p = prev[name];
      if (p) {
        const dir = Math.sign(diff(lon, p.lon));
        if (signOf(lon) !== signOf(p.lon)) {
          const sign = signOf(lon);
          out.push({ date: d, type: 'ingress', planet: name, sign });
          if (EXALT[name] === sign) out.push({ date: d, type: 'exalted', planet: name, sign });
          if (DEBIL[name] === sign) out.push({ date: d, type: 'debilitated', planet: name, sign });
        }
        if (p.dir !== 0 && dir !== 0 && dir !== p.dir) out.push({ date: d, type: dir < 0 ? 'retrograde' : 'direct', planet: name, sign: signOf(lon) });
        prev[name] = { lon, dir: dir || p.dir };
      } else prev[name] = { lon, dir: 0 };
    }
    const rahu = siderealNode(d);
    if (prevNode >= 0 && signOf(rahu) !== signOf(prevNode)) out.push({ date: d, type: 'ingress', planet: 'Rahu', sign: signOf(rahu) });
    prevNode = rahu;
    const js = Math.abs(diff(lons.Jupiter, lons.Saturn));
    if (prev.__js && prev.__js.lon > 1 && js <= 1) out.push({ date: d, type: 'conjunction', planet: 'Jupiter-Saturn', sign: signOf(lons.Jupiter) });
    prev.__js = { lon: js, dir: 0 };
  }
  for (let e = SearchLunarEclipse(start); e.peak.date < end; e = NextLunarEclipse(e.peak)) {
    if (e.kind !== 'penumbral') out.push({ date: e.peak.date, type: `lunar-eclipse-${e.kind}`, planet: 'Moon', sign: signOf(siderealLongitude(Body.Moon, e.peak.date)) });
  }
  for (let e = SearchGlobalSolarEclipse(start); e.peak.date < end; e = NextGlobalSolarEclipse(e.peak)) {
    out.push({ date: e.peak.date, type: `solar-eclipse-${e.kind}`, planet: 'Sun', sign: signOf(siderealLongitude(Body.Sun, e.peak.date)) });
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function siderealNode(d: Date): number {
  const tropical = meanNodeLongitude(d);
  const t = (d.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * DAY);
  const aya = 23.85322 + (5028.796195 * t + 1.1054348 * t * t) / 3600;
  return ((tropical - aya) % 360 + 360) % 360;
}


const stayGap = (planet: string) => (planet === 'Saturn' ? 3 : /Jupiter|Rahu/.test(planet) ? 1.5 : 0) * 365.25 * DAY;

/** A slow planet stepping back into a sign it already entered during the same stay (after a retrograde loop). */
export function isReentry(event: SkyEvent, pool: SkyEvent[]): boolean {
  if (!['ingress', 'exalted', 'debilitated'].includes(event.type)) return false;
  const t = event.date.getTime();
  return pool.some(
    (w) => w.type === event.type && w.planet === event.planet && w.sign === event.sign && w.date.getTime() < t && w.date.getTime() >= t - stayGap(event.planet),
  );
}

/** Same type/planet/sign before and after `event`, skipping back-and-forth passes of the same stay. */
export function sameEventNeighbours(event: SkyEvent, pool: SkyEvent[]): { prev?: SkyEvent; next?: SkyEvent } {
  const gap = stayGap(event.planet);
  const same = pool.filter((w) => w.type === event.type && w.planet === event.planet && w.sign === event.sign);
  return {
    prev: same.filter((w) => w.date.getTime() < event.date.getTime() - gap).pop(),
    next: same.find((w) => w.date.getTime() > event.date.getTime() + gap),
  };
}
