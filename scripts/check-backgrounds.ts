/**
 * Guards that no two videos published on the same day share a background clip. A viewer meets the
 * day's posts side by side in one feed, so a repeated clip reads as the same video posted twice -
 * which is what happened on the Thursday that carries two promotions plus a theme video, because
 * the pick was derived from the weekday alone.
 */
import { pickBackground } from '@/lib/render';
import { PROMO_SCRIPT_PREFIX, THEME_DAYS, ZODIAC_DAYS, type DayOfWeek } from '@/lib/schedule';
import type { BackgroundAsset } from '@/services/sheets';

/** A library the size of the real one, with the same kind of lopsided look/brightness stock. */
const ASSETS: BackgroundAsset[] = Array.from({ length: 40 }, (_, index) => ({
  asset_id: `asset-${String(index).padStart(2, '0')}`,
  video_url: `https://example.com/bg-${index}.mp4`,
  visual_group: `group-${index % 6}`,
  brightness: index % 9 === 0 ? 170 : index % 3 === 0 ? 110 : 60,
  enabled: true,
}));

const WEEKS = ['2026-W41', '2026-W42', '2026-W43', '2026-W44'];
const LANG = 'ja';

/** Task ids a week puts out, by the day they go out on. */
function taskIdsByDay(week: string): Map<DayOfWeek, string[]> {
  const byDay = new Map<DayOfWeek, string[]>();
  for (const day of THEME_DAYS) {
    byDay.set(day, [`${week}-${LANG}-S-0${THEME_DAYS.indexOf(day) + 1}`]);
  }
  // Thursday also carries the two promotions: an event one in the weeks an event falls in,
  // otherwise two product ones.
  byDay.get('Thu')?.push(
    `${week}-${LANG}-${PROMO_SCRIPT_PREFIX}event-newmoon-01`,
    `${week}-${LANG}-${PROMO_SCRIPT_PREFIX}yearly-01`,
    `${week}-${LANG}-${PROMO_SCRIPT_PREFIX}career-01`,
  );
  for (const { day, signs } of ZODIAC_DAYS) {
    byDay.set(day, signs.map((sign) => `${week}-${LANG}-${sign.toLowerCase()}`));
  }
  return byDay;
}

const failures: string[] = [];

for (const week of WEEKS) {
  for (const [day, taskIds] of Array.from(taskIdsByDay(week))) {
    const seen = new Map<string, string>();
    for (const taskId of taskIds) {
      const url = pickBackground(taskId, ASSETS, day, taskIds);
      if (!url) {
        failures.push(`${taskId}: no background picked`);
        continue;
      }
      const other = seen.get(url);
      if (other) failures.push(`${week} ${day}: ${taskId} shares its background with ${other}`);
      seen.set(url, taskId);
    }
  }
}

if (failures.length > 0) {
  console.error('Background checks failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Background checks passed for ${WEEKS.length} weeks.`);
