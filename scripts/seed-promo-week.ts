/**
 * Seeds the Thursday promotion slots of the running week. `weekly-plan` only fills the
 * following week and only while `PROMO_ENABLED` is on, so this is the path used to add
 * the week's sky event, or a product promotion, to a week already in flight.
 *
 * `npm run seed:promo -- <script-id> [lang...] [--apply]`
 */
import { isoWeekId, promoPostTime, PROMO_DAY, startOfIsoWeek } from '@/lib/schedule';
import { ContentQueue, GoogleSheetsService, Language, LANGUAGES } from '@/services/sheets';

const scriptId = process.argv[2];
const args = process.argv.slice(3).filter((arg) => !arg.startsWith('--'));
const langs = (args.length ? args : LANGUAGES) as Language[];
const apply = process.argv.includes('--apply');

async function main() {
  if (!scriptId) throw new Error('usage: seed-promo-week <script-id> [lang...] [--apply]');

  const sheets = new GoogleSheetsService();
  const weekStart = startOfIsoWeek(new Date());
  const weekId = isoWeekId(weekStart);
  const planned = await sheets.getQueueTasks(weekId);
  const existing = new Set(planned.map((task) => task.task_id));

  const tasks: ContentQueue[] = [];
  for (const lang of langs) {
    const scripts = await sheets.getEvergreenScripts(lang);
    const source = scripts.find((script) => script.script_id === scriptId);
    if (!source) {
      console.log(`no evergreen script "${scriptId}" for ${lang}`);
      continue;
    }
    // The slot index decides the posting hour, so an added promotion goes after the ones
    // the week already carries instead of on top of them.
    const slot = planned.filter(
      (task) => task.lang_code === lang && task.target_type === 'Promo',
    ).length;
    const task: ContentQueue = {
      week_id: weekId,
      day_of_week: PROMO_DAY,
      lang_code: lang,
      target_type: 'Promo',
      theme_id: source.script_id,
      task_id: `${weekId}-${lang}-${source.script_id}`,
      script_status: 'Pending',
      script_attempts: 0,
      render_status_30s: 'Pending',
      render_status_65s: 'Pending',
      render_attempts_30s: 0,
      render_attempts_65s: 0,
      post_status: 'Pending',
      scheduled_post_time: promoPostTime(weekStart, lang, slot),
    };
    if (existing.has(task.task_id)) {
      console.log(`exists ${task.task_id}`);
      continue;
    }
    tasks.push(task);
  }

  console.log(
    `week ${weekId}: ${tasks.length} promo tasks to add`,
    tasks.map((task) => `${task.task_id}@${task.scheduled_post_time}`),
  );
  if (!apply || !tasks.length) return;

  await sheets.addQueueTasks(tasks);
  await sheets.markEvergreenUsedMany(
    tasks.map((task) => ({ scriptId, lang_code: task.lang_code, weekId })),
  );
  console.log('added');
}

void main();
