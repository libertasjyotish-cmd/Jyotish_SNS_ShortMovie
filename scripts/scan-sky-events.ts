/**
 * Lists every sky event the event-video templates must cover, with how often each recurs.
 *   npx tsx scripts/scan-sky-events.ts [startYear] [endYear] [--list|--rarity]
 */
import { DAY, SkyEvent, sameEventNeighbours, scanSkyEvents } from '@/lib/sky-events';

{
  const nums = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);
  const [y0, y1] = [nums[0] ?? 2026, nums[1] ?? 2028];
  const events = scanSkyEvents(new Date(Date.UTC(y0, 0, 1)), new Date(Date.UTC(y1, 0, 1)));
  if (process.argv.includes('--rarity')) {
    const wide = scanSkyEvents(new Date(Date.UTC(y0 - 60, 0, 1)), new Date(Date.UTC(y1 + 60, 0, 1)));
    for (const e of events) {
      const { prev: before, next: after } = sameEventNeighbours(e, wide);
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
