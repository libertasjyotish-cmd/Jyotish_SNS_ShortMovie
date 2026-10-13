/**
 * Asserts that every content day carries `THEME_SLOTS` videos per language at distinct times:
 * the Monday to Wednesday evergreen days must be scheduled exactly like the Friday to Sunday
 * reading days. A single theme video a day at a fixed 18:00 was the old shape of the week and
 * must not come back.
 */
import { LANGUAGES } from '../src/lib/languages';
import {
  DayOfWeek,
  THEME_DAYS,
  THEME_SLOTS,
  ZODIAC_DAYS,
  scheduledPostTime,
  startOfIsoWeek,
} from '../src/lib/schedule';

const weekStart = startOfIsoWeek(new Date(Date.UTC(2026, 9, 12)));
const failures: string[] = [];

const days: DayOfWeek[] = [...THEME_DAYS, ...ZODIAC_DAYS.map(({ day }) => day)];

for (const lang of LANGUAGES) {
  for (const day of days) {
    const times = Array.from({ length: THEME_SLOTS }, (_, slot) =>
      scheduledPostTime(weekStart, day, lang, slot),
    );
    if (new Set(times).size !== THEME_SLOTS) {
      failures.push(`${lang}/${day}: ${times.join(', ')}`);
    }
  }
}

if (failures.length) {
  console.error('posting hours broken:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log('posting hours ok');
