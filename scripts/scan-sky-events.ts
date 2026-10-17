/**
 * Lists every sky event the event-video templates must cover, with how often each recurs.
 *   npx tsx scripts/scan-sky-events.ts [startYear] [endYear] [--list]
 */
import { Body, NextGlobalSolarEclipse, NextLunarEclipse, SearchGlobalSolarEclipse, SearchLunarEclipse } from 'astronomy-engine';
import { meanNodeLongitude, siderealLongitude, signOf } from '@/lib/ephemeris';

export interface SkyEvent { date: Date; type: string; planet: string; sign: string }

const BODIES: [string, Body][] = [
  ['Mars', Body.Mars], ['Mercury', Body.Mercury], ['Jupiter', Body.Jupiter], ['Venus', Body.Venus], ['Saturn', Body.Saturn],
];
const EXALT: Record<string, string> = { Mars: 'Capricorn', Mercury: 'Virgo', Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra' };
const DEBIL: Record<string, string> = { Mars: 'Cancer', Mercury: 'Pisces', Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries' };
const DAY = 86_400_000;
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

if (require.main === module) {
  const nums = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
  const [y0, y1] = [nums[0] ?? 2026, nums[1] ?? 2028];
  const events = scanSkyEvents(new Date(Date.UTC(y0, 0, 1)), new Date(Date.UTC(y1, 0, 1)));
  if (process.argv.includes('--rarity')) {
    const wide = scanSkyEvents(new Date(Date.UTC(y0 - 60, 0, 1)), new Date(Date.UTC(y1 + 60, 0, 1)));
    const slow = (e: SkyEvent) => (e.planet === 'Saturn' ? 3 : /Jupiter|Rahu/.test(e.planet) ? 1.5 : 0) * 365.25 * DAY;
    for (const e of events) {
      const same = wide.filter((w) => w.type === e.type && w.planet === e.planet && w.sign === e.sign);
      const before = same.filter((w) => w.date.getTime() < e.date.getTime() - slow(e)).pop();
      const after = same.find((w) => w.date.getTime() > e.date.getTime() + slow(e));
      const y = (w?: SkyEvent) => (w ? w.date.toISOString().slice(0, 7) : '-');
      console.log(`${e.date.toISOString().slice(0, 10)}  ${e.type} ${e.planet} ${e.sign}  prev ${y(before)}  next ${y(after)}`);
    }
    process.exit(0);
  }
  if (process.argv.includes('--list')) for (const e of events) console.log(e.date.toISOString().slice(0, 10), e.type, e.planet, e.sign);
  const years = y1 - y0;
  const byType = new Map<string, number>();
  const bySign = new Map<string, Date[]>();
  for (const e of events) {
    const k = `${e.type} ${e.planet}`;
    byType.set(k, (byType.get(k) ?? 0) + 1);
    const ks = `${k} ${e.sign}`;
    bySign.set(ks, [...(bySign.get(ks) ?? []), e.date]);
  }
  console.log(`${y0}-${y1}: ${events.length} events`);
  for (const [k, n] of Array.from(byType).sort((a, b) => b[1] - a[1])) {
    const gaps = Array.from(bySign).filter(([ks]) => ks.startsWith(`${k} `)).flatMap(([, ds]) => ds.slice(1).map((d, i) => (d.getTime() - ds[i].getTime()) / (365.25 * DAY))).filter((g) => !/Jupiter|Saturn/.test(k) || g > 1.5);
    const same = gaps.length ? (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1) : '-';
    console.log(`${k.padEnd(32)} ${String(n).padStart(4)}  per year ${(n / years).toFixed(2).padStart(5)}  same sign again ~${same}y`);
  }
}
