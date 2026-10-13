/**
 * Asserts that a day's evergreen slots are taken in zodiac order.
 *
 * A week once shipped leo at noon, taurus at 15:00 and aries at 18:00 because the picker only
 * sorted by `last_used_week`, which every unused script shares.
 *
 * Usage: npm run check:sign-order
 */
import { compareSignThemePick, SERIES_BY_DAY, signThemeScriptId } from '../src/lib/sign-themes';
import { DayOfWeek } from '../src/lib/schedule';
import { ZODIAC_SIGNS } from '../src/lib/zodiac-names';

const failures: string[] = [];

for (const [day, series] of Object.entries(SERIES_BY_DAY) as [DayOfWeek, 'compat'][]) {
  // The sheet hands the scripts back in whatever order the rows sit in.
  const scripts = [...ZODIAC_SIGNS]
    .map((sign) => ({ script_id: signThemeScriptId(series, sign), last_used_week: '' }))
    .reverse();
  const picked = scripts.sort(compareSignThemePick).map((script) => script.script_id);
  const expected = ZODIAC_SIGNS.map((sign) => signThemeScriptId(series, sign));
  if (picked.join(',') !== expected.join(',')) {
    failures.push(`${day}: ${picked.join(', ')}`);
  }
}

// A script used in an earlier week still waits behind the ones never used.
const mixed = [
  { script_id: signThemeScriptId('nature', 'aries'), last_used_week: '2026-W40' },
  { script_id: signThemeScriptId('nature', 'virgo'), last_used_week: '' },
].sort(compareSignThemePick);
if (mixed[0].script_id !== signThemeScriptId('nature', 'virgo')) {
  failures.push(`used script picked before an unused one: ${mixed[0].script_id}`);
}

if (failures.length) {
  console.error('sign order broken:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log('sign order ok');
