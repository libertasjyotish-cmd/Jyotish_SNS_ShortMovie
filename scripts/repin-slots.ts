/**
 * Puts a day's sign slots back on the canonical posting hours (local 12/15/18/21) in zodiac order.
 *
 * Catching a late week up with --start/--gap leaves the slots at arbitrary times, so a day can end
 * up with two videos on the same hour and no 12:00 slot at all. This re-pins the day's unposted
 * sign rows to the four hours the schedule defines for that language.
 *
 *   npm run repin:slots -- [--date=2026-10-14] [--langs=ja,en] [--apply]
 */
import {
  DAY_OFFSET,
  DayOfWeek,
  isoWeekId,
  scheduledPostTime,
  startOfIsoWeek,
} from '@/lib/schedule';
import { plannedLanguages } from '@/lib/plan-languages';
import { ZODIAC_SIGNS, ZodiacSign } from '@/lib/zodiac-names';
import { GoogleSheetsService, Language } from '@/services/sheets';

function arg(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
}

function dayOfWeek(date: Date): DayOfWeek {
  const offset = Math.round(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      startOfIsoWeek(date).getTime()) /
      86_400_000,
  );
  const day = (Object.keys(DAY_OFFSET) as DayOfWeek[]).find((name) => DAY_OFFSET[name] === offset);
  if (!day) throw new Error(`no weekday for ${date.toISOString()}`);
  return day;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const date = arg('date') ? new Date(`${arg('date')}T00:00:00Z`) : new Date();
  const langs = (arg('langs')?.split(',') as Language[] | undefined) ?? plannedLanguages();
  const weekStart = startOfIsoWeek(date);
  const weekId = isoWeekId(weekStart);
  const day = dayOfWeek(date);
  const dayStr = date.toISOString().slice(0, 10);

  const sheets = new GoogleSheetsService();
  const tasks = await sheets.getAllQueueTasks();
  const updates: { taskId: string; scheduledPostTime: string }[] = [];

  for (const lang of langs) {
    const rows = tasks
      .filter((task) => task.lang_code === lang && Boolean(task.zodiac_sign))
      .filter((task) => (task.post_status || 'Pending') === 'Pending')
      .filter((task) => task.scheduled_post_time.slice(0, 10) === dayStr)
      .sort(
        (a, b) =>
          ZODIAC_SIGNS.indexOf(a.zodiac_sign?.toLowerCase() as ZodiacSign) -
          ZODIAC_SIGNS.indexOf(b.zodiac_sign?.toLowerCase() as ZodiacSign),
      );

    rows.forEach((task, slot) => {
      const wanted = scheduledPostTime(weekStart, day, lang, slot);
      if (wanted === task.scheduled_post_time) return;
      updates.push({ taskId: task.task_id, scheduledPostTime: wanted });
      console.log(`${task.task_id}: ${task.scheduled_post_time} -> ${wanted}`);
    });
  }

  console.log(`${updates.length} slots to re-pin on ${dayStr} (${weekId} ${day})`);
  if (!apply) {
    console.log('dry run; pass --apply to write');
    return;
  }
  await sheets.rescheduleTasks(updates);
  console.log(`re-pinned ${updates.length} slots`);
}

void main();
