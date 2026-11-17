/**
 * Guards that no two videos published on the same day share a background clip. A viewer meets the
 * day's posts side by side in one feed, so a repeated clip reads as the same video posted twice -
 * which is what happened on the Thursday that carries two promotions plus a theme video, because
 * the pick was derived from the weekday alone.
 */
import { TIMES_OF_DAY, pickBackground } from '@/lib/render';
import {
  PROMO_SCRIPT_PREFIX,
  THEME_DAYS,
  ZODIAC_DAYS,
  shuffledSlot,
  type DayOfWeek,
} from '@/lib/schedule';
import { SIGNS_BY_DAY } from '@/lib/sign-themes';
import type { BackgroundAsset } from '@/services/sheets';

/** A library the size of the real one, with the same kind of lopsided look/brightness stock. */
const ASSETS: BackgroundAsset[] = Array.from({ length: 40 }, (_, index) => ({
  asset_id: `asset-${String(index).padStart(2, '0')}`,
  video_url: `https://example.com/bg-${index}.mp4`,
  visual_group: `group-${index % 6}`,
  brightness: index % 9 === 0 ? 170 : index % 3 === 0 ? 110 : 60,
  enabled: true,
}));

/** The same library with every clip tagged with the time of day it shows. */
const TIMED_ASSETS: BackgroundAsset[] = ASSETS.map((asset, index) => ({
  ...asset,
  time_of_day: TIMES_OF_DAY[index % TIMES_OF_DAY.length],
}));

const WEEKS = ['2026-W41', '2026-W42', '2026-W43', '2026-W44', '2026-W47', '2026-W48'];
const LANG = 'ja';

/** Task ids a week puts out, by the day they go out on. */
function taskIdsByDay(week: string): Map<DayOfWeek, string[]> {
  const byDay = new Map<DayOfWeek, string[]>();
  for (const day of THEME_DAYS) {
    byDay.set(day, [`${week}-${LANG}-S-0${THEME_DAYS.indexOf(day) + 1}`]);
  }
  // The sign-series days carry four sign-themed videos instead of one theme.
  for (const [day, signs] of Object.entries(SIGNS_BY_DAY) as [DayOfWeek, readonly string[]][]) {
    byDay.set(day, signs.map((sign) => `${week}-${LANG}-sign-money-${sign.toLowerCase()}`));
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

for (const assets of [ASSETS, TIMED_ASSETS]) {
  for (const week of WEEKS) {
    for (const [day, all] of Array.from(taskIdsByDay(week))) {
      // A real Thursday carries two promotions; the untagged library is held to all three.
      const taskIds = assets === TIMED_ASSETS ? all.filter((id) => !id.includes('-event-')) : all;
      const seen = new Map<string, string>();
      for (const taskId of taskIds) {
        const url = pickBackground(taskId, assets, day, taskIds);
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
}

// With tagged clips, two sign videos next to each other in the feed never show the same time of day,
// across the end of a day too. The posting week of `week` carries its sign-theme days and
// promotions and the readings of the week after it.
const timeOf = new Map(TIMED_ASSETS.map((asset) => [asset.video_url, asset.time_of_day]));
const POSTING_WEEKS = ['2026-W47', '2026-W48', '2026-W49', '2026-W50', '2026-W51', '2026-W52'];
const feed: string[] = [];
for (const week of POSTING_WEEKS) {
  const next = `${week.slice(0, 6)}${String(Number(week.slice(6)) + 1).padStart(2, '0')}`;
  const own = taskIdsByDay(week);
  const readings = taskIdsByDay(next);
  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as DayOfWeek[]) {
    const ids = (day === 'Fri' || day === 'Sat' || day === 'Sun' ? readings : own).get(day) ?? [];
    const owner = day === 'Fri' || day === 'Sat' || day === 'Sun' ? next : week;
    // The day's signs go out in their rotated slot order, not in sign order.
    const posted =
      day === 'Thu'
        ? ids.filter((id) => id.includes(PROMO_SCRIPT_PREFIX) && !id.includes('-event-'))
        : ids
            .map((id, slot) => ({ id, at: shuffledSlot(owner, day, slot) }))
            .sort((a, b) => a.at - b.at)
            .map(({ id }) => id);
    for (const id of posted) {
      const time = timeOf.get(pickBackground(id, TIMED_ASSETS, day, posted) ?? '');
      feed.push(`${id} ${time}`);
    }
  }
}
// Promotions take a clip at random, so only two sign videos next to each other are held to it.
for (let i = 1; i < feed.length; i += 1) {
  if (feed[i].includes(PROMO_SCRIPT_PREFIX) || feed[i - 1].includes(PROMO_SCRIPT_PREFIX)) continue;
  if (feed[i].split(' ')[1] === feed[i - 1].split(' ')[1]) {
    failures.push(`${feed[i - 1]} and ${feed[i]} sit next to each other with the same time of day`);
  }
}

if (failures.length > 0) {
  console.error('Background checks failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Background checks passed for ${WEEKS.length} weeks.`);
