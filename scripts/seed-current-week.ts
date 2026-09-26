/**
 * Seeds the queue for the running week for one language, for the days that have not
 * been posted yet. `weekly-plan` only ever fills the following week, so this is the
 * one-off path used to start a language mid-week.
 */
import {
  DayOfWeek,
  isoWeekId,
  scheduledPostTime,
  startOfIsoWeek,
  ZODIAC_DAYS,
} from '@/lib/schedule';
import { ContentQueue, GoogleSheetsService, Language } from '@/services/sheets';

const lang = (process.argv[2] ?? 'en') as Language;
const themeDays = (process.argv[3] ?? 'Wed,Thu').split(',').filter(Boolean) as DayOfWeek[];
const apply = process.argv.includes('--apply');

async function main() {
  const sheets = new GoogleSheetsService();
  const weekStart = startOfIsoWeek(new Date());
  const weekId = isoWeekId(weekStart);
  const existing = new Set((await sheets.getQueueTasks(weekId)).map((task) => task.task_id));
  const themes = await sheets.getEvergreenScripts(lang);

  const tasks: { task: ContentQueue; theme_id?: string }[] = [];

  for (const day of themeDays) {
    const theme = themes
      .filter((script) => script.day_of_week === day && !script.script_id.startsWith('promo-'))
      .sort((a, b) => a.last_used_week.localeCompare(b.last_used_week))[0];
    if (!theme) {
      console.log(`no evergreen theme for ${lang}/${day}`);
      continue;
    }
    tasks.push({
      theme_id: theme.script_id,
      task: {
        week_id: weekId,
        day_of_week: day,
        lang_code: lang,
        target_type: 'Theme',
        theme_id: theme.script_id,
        task_id: `${weekId}-${lang}-${theme.script_id}`,
        script_status: 'Pending',
        render_status_30s: 'Pending',
        render_status_65s: 'Pending',
        render_attempts_30s: 0,
        render_attempts_65s: 0,
        post_status: 'Pending',
        scheduled_post_time: scheduledPostTime(weekStart, day, lang),
      },
    });
  }

  for (const { day, signs } of ZODIAC_DAYS) {
    for (let slot = 0; slot < signs.length; slot += 1) {
      const sign = signs[slot];
      tasks.push({
        task: {
          week_id: weekId,
          day_of_week: day,
          lang_code: lang,
          target_type: 'Zodiac_Sign',
          zodiac_sign: sign,
          task_id: `${weekId}-${lang}-${sign.toLowerCase()}`,
          script_status: 'Pending',
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

  const missing = tasks.filter(({ task }) => !existing.has(task.task_id));
  console.log(
    `week ${weekId}: ${missing.length} tasks to add`,
    missing.map(({ task }) => `${task.task_id}@${task.scheduled_post_time}`),
  );
  if (!apply) return;

  for (const { task, theme_id } of missing) {
    await sheets.addQueueTask(task);
    if (theme_id) await sheets.markEvergreenUsed(theme_id, lang, weekId);
    console.log(`added ${task.task_id}`);
  }
}

void main();
