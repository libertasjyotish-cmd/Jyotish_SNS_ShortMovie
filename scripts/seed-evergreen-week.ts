/**
 * Fills the missing sign-targeted evergreen slots of a week that has already been planned.
 * `weekly-plan` only ever fills next week, so a week planned before a slot-count change keeps
 * the old number of videos per day; this tops it up to `THEME_SLOTS` without touching the
 * rows that already exist.
 *
 *   npm run seed:evergreen -- [--week=2026-W42] [--days=Tue,Wed] [--slots=Tue:5,Wed:4]
 *                             [--langs=ja,en] [--apply]
 *
 * A day that has to carry a sign beyond its four slots takes it as an extra video at an
 * explicit time:
 *
 *   npm run seed:evergreen -- --week=2026-W42 --langs=ja --day=Wed --sign=pisces
 *                             --at=2026-10-14T14:00:00Z [--series=sidereal] --apply
 */
import {
  DayOfWeek,
  isoWeekId,
  scheduledPostTime,
  startOfIsoWeek,
  THEME_DAYS,
  THEME_SLOTS,
} from '@/lib/schedule';
import { plannedLanguages } from '@/lib/plan-languages';
import {
  parseSignThemeId,
  seriesForWeek,
  SIGNS_BY_DAY,
  signThemeScriptId,
  signThemeSlotScriptId,
  SignThemeSeries,
} from '@/lib/sign-themes';
import { ZodiacSign } from '@/lib/zodiac-names';
import { ContentQueue, GoogleSheetsService, Language } from '@/services/sheets';

function arg(name: string): string | undefined {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit?.split('=')[1];
}

function weekStartOf(weekId: string | undefined): Date {
  if (!weekId) return startOfIsoWeek(new Date());
  let start = startOfIsoWeek(new Date());
  // Walk forward or backward a year at most; the queue never holds weeks beyond that.
  for (let step = -53; step <= 53; step += 1) {
    const candidate = new Date(start.getTime() + step * 7 * 24 * 60 * 60 * 1000);
    if (isoWeekId(candidate) === weekId) return startOfIsoWeek(candidate);
  }
  throw new Error(`week ${weekId} is not within a year of today`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const weekId = arg('week');
  const weekStart = weekStartOf(weekId);
  const resolvedWeek = isoWeekId(weekStart);
  const days = (arg('days')?.split(',') as DayOfWeek[] | undefined) ?? THEME_DAYS;
  const langs = (arg('langs')?.split(',') as Language[] | undefined) ?? plannedLanguages();
  // A week that lost a day to a late start can carry the missing signs on the days that are
  // left, so the per-day count is overridable.
  const slotsPerDay = new Map<string, number>();
  for (const pair of arg('slots')?.split(',') ?? []) {
    const [day, count] = pair.split(':');
    slotsPerDay.set(day, Number(count));
  }

  const extraSign = arg('sign') as ZodiacSign | undefined;
  const extraAt = arg('at');
  const extraDay = (arg('day') as DayOfWeek | undefined) ?? days[days.length - 1];
  // A week whose slots were planned before a series change keeps its own series, so it is
  // overridable rather than taken from the week id.
  const extraSeries = (arg('series') as SignThemeSeries | undefined) ?? seriesForWeek(resolvedWeek);

  const sheets = new GoogleSheetsService();
  const plannedTasks = await sheets.getQueueTasks(resolvedWeek);
  const existing = new Set(plannedTasks.map((task) => task.task_id));
  const filled = new Map<string, number>();
  // Retired rows (duplicates, rows a resequence replaced) are not slots the day still holds.
  for (const task of plannedTasks.filter(
    (task) => task.target_type === 'Theme' && task.post_status !== 'Hold',
  )) {
    const key = `${task.lang_code}/${task.day_of_week}`;
    filled.set(key, (filled.get(key) ?? 0) + 1);
  }

  const pending: { task: ContentQueue; scriptId: string }[] = [];

  if (extraSign) {
    if (!extraAt) throw new Error('--sign needs --at=<ISO time>');
    for (const lang of langs) {
      const scriptId = signThemeScriptId(extraSeries, extraSign);
      const taskId = `${resolvedWeek}-${lang}-${scriptId}`;
      if (existing.has(taskId)) {
        console.log(`${taskId} already planned`);
        continue;
      }
      pending.push({
        scriptId,
        task: {
          week_id: resolvedWeek,
          day_of_week: extraDay,
          lang_code: lang,
          target_type: 'Theme',
          theme_id: scriptId,
          zodiac_sign: extraSign,
          task_id: taskId,
          script_status: 'Pending',
          script_attempts: 0,
          render_status_30s: 'Pending',
          render_status_65s: 'Pending',
          render_attempts_30s: 0,
          render_attempts_65s: 0,
          post_status: 'Pending',
          scheduled_post_time: new Date(extraAt).toISOString(),
        },
      });
    }
  }

  for (const lang of extraSign ? [] : langs) {
    const scripts = await sheets.getEvergreenScripts(lang);
    const taken = new Set<string>();

    for (const day of days) {
      if (!SIGNS_BY_DAY[day]) continue;
      const planned = filled.get(`${lang}/${day}`) ?? 0;
      const slots = slotsPerDay.get(day) ?? THEME_SLOTS;

      for (let slot = planned; slot < slots; slot += 1) {
        const scriptId = signThemeSlotScriptId(resolvedWeek, day, slot);
        const theme = scripts.find(
          (script) =>
            script.script_id === scriptId &&
            !taken.has(script.script_id) &&
            !existing.has(`${resolvedWeek}-${lang}-${script.script_id}`),
        );
        if (!theme) {
          console.log(`no free evergreen script for ${lang}/${day}`);
          break;
        }
        taken.add(theme.script_id);

        pending.push({
          scriptId: theme.script_id,
          task: {
            week_id: resolvedWeek,
            day_of_week: day,
            lang_code: lang,
            target_type: 'Theme',
            theme_id: theme.script_id,
            zodiac_sign: parseSignThemeId(theme.script_id)?.sign,
            task_id: `${resolvedWeek}-${lang}-${theme.script_id}`,
            script_status: 'Pending',
            script_attempts: 0,
            render_status_30s: 'Pending',
            render_status_65s: 'Pending',
            render_attempts_30s: 0,
            render_attempts_65s: 0,
            post_status: 'Pending',
            scheduled_post_time: scheduledPostTime(weekStart, day, lang, slot),
          },
        });
      }
    }
  }

  console.log(`week ${resolvedWeek}: ${pending.length} evergreen slots to add`);
  for (const { task } of pending) {
    console.log(`  ${task.task_id} @ ${task.scheduled_post_time}`);
  }
  if (!apply) {
    console.log('dry run; pass --apply to write');
    return;
  }

  // Sheets caps writes at 60 per minute per user, so the whole batch goes in two calls.
  await sheets.addQueueTasks(pending.map(({ task }) => task));
  await sheets.markEvergreenUsedMany(
    pending.map(({ task, scriptId }) => ({
      scriptId,
      lang_code: task.lang_code,
      weekId: resolvedWeek,
    })),
  );
  console.log(`added ${pending.length} tasks`);
}

void main();
