/**
 * Asserts that every reading day carries `THEME_SLOTS` videos per language at distinct times:
 * the Monday to Wednesday evergreen days must be scheduled exactly like the Friday to Sunday
 * reading days. A single theme video a day at a fixed 18:00 was the old shape of the week and
 * must not come back. `PROMO_DAY` (Thursday) is deliberately different: one or two product
 * promotions at `PROMO_HOURS`, so it is checked against `PROMO_SLOTS` instead.
 */
import { LANGUAGES } from '../src/lib/languages';
import {
  DayOfWeek,
  PROMO_DAY,
  PROMO_SLOTS,
  THEME_DAYS,
  THEME_SLOTS,
  ZODIAC_DAYS,
  promoPostTime,
  scheduledPostTime,
  startOfIsoWeek,
} from '../src/lib/schedule';

const weekStart = startOfIsoWeek(new Date(Date.UTC(2026, 9, 12)));
const failures: string[] = [];

const days: DayOfWeek[] = [
  ...THEME_DAYS.filter((day) => day !== PROMO_DAY),
  ...ZODIAC_DAYS.map(({ day }) => day),
];

for (const lang of LANGUAGES) {
  for (const day of days) {
    const times = Array.from({ length: THEME_SLOTS }, (_, slot) =>
      scheduledPostTime(weekStart, day, lang, slot),
    );
    if (new Set(times).size !== THEME_SLOTS) {
      failures.push(`${lang}/${day}: ${times.join(', ')}`);
    }
  }

  const promoTimes = Array.from({ length: PROMO_SLOTS }, (_, slot) =>
    promoPostTime(weekStart, lang, slot),
  );
  if (new Set(promoTimes).size !== PROMO_SLOTS) {
    failures.push(`${lang}/${PROMO_DAY}: ${promoTimes.join(', ')}`);
  }
}

if (failures.length) {
  console.error('posting hours broken:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log('posting hours ok');
