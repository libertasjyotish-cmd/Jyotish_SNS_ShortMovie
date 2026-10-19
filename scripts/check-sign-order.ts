import { reuseCycle, voiceForTask } from '@/lib/reuse-cycle';
/**
 * Asserts that a weekday always carries the same four signs in zodiac order and that the whole
 * week runs one series, which the next weeks rotate through.
 *
 * A week once shipped leo at noon, taurus at 15:00 and aries at 18:00 because the picker only
 * sorted by `last_used_week`, which every unused script shares. Tying the series to the weekday
 * instead of the week was the other half of it: aries through cancer then only ever met the
 * compatibility series.
 *
 * Usage: npm run check:sign-order
 */
import {
  SIGN_THEME_SERIES,
  SIGNS_BY_DAY,
  seriesForWeek,
  signThemeSlotScriptId,
  parseSignThemeId,
} from '../src/lib/sign-themes';
import { DayOfWeek, THEME_SLOTS } from '../src/lib/schedule';
import { ZODIAC_SIGNS } from '../src/lib/zodiac-names';

const failures: string[] = [];
const weekId = '2026-W42';

const days = Object.keys(SIGNS_BY_DAY) as DayOfWeek[];
const covered: string[] = [];

days.forEach((day, index) => {
  for (let slot = 0; slot < THEME_SLOTS; slot += 1) {
    const scriptId = signThemeSlotScriptId(weekId, day, slot);
    const parsed = scriptId ? parseSignThemeId(scriptId) : undefined;
    const expectedSign = ZODIAC_SIGNS[index * THEME_SLOTS + slot];
    if (!parsed || parsed.sign !== expectedSign) {
      failures.push(`${day} slot ${slot}: ${scriptId ?? 'none'} (want ${expectedSign})`);
      continue;
    }
    if (parsed.series !== seriesForWeek(weekId)) {
      failures.push(`${day} slot ${slot}: series ${parsed.series} is not the week's series`);
    }
    covered.push(parsed.sign);
  }
});

if (covered.length !== ZODIAC_SIGNS.length) {
  failures.push(`a week covers ${covered.length} signs, want ${ZODIAC_SIGNS.length}`);
}

// Consecutive weeks move on, so a sign does not meet the same script again for twelve weeks.
const weeks = Array.from({ length: SIGN_THEME_SERIES.length }, (_, offset) =>
  seriesForWeek(`2026-W${31 + offset}`),
);
if (new Set(weeks).size !== SIGN_THEME_SERIES.length) {
  failures.push(`${weeks.length} weeks run ${weeks.join(', ')} instead of every series once`);
}

if (seriesForWeek('2026-W43') !== 'compat') {
  failures.push(`2026-W43 runs ${seriesForWeek('2026-W43')}, want compat`);
}

// The first pass keeps the default narrator; only a repeat changes voice, and only to a male one.
for (const week of ['2026-W43', '2026-W53', '2027-W01']) {
  if (reuseCycle(week) !== 0) failures.push(`${week} is cycle ${reuseCycle(week)}, want 0`);
}
if (reuseCycle('2027-W03') !== 1) failures.push(`2027-W03 is cycle ${reuseCycle('2027-W03')}, want 1`);
if (voiceForTask('2026-W43-ja-libra', 'ja') !== undefined) {
  failures.push('2026-W43 ja is read by a rotated voice instead of the default');
}

if (failures.length) {
  console.error('sign order broken:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log('sign order ok');
