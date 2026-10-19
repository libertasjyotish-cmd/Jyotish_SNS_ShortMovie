/**
 * Replans a week's Mon-Wed sign slots from scratch: every slot gets the sign its weekday fixes
 * (Mon = Aries..Cancer, Tue = Leo..Scorpio, Wed = Sagittarius..Pisces) and the week's series,
 * with a fresh Pending row so `weekly-generate` writes it from the code-built template.
 *
 * Rows that have started posting stay as they are and their sign is not planned again; every
 * other live sign row of the week is parked as Hold.
 *
 *   npm run restart:sign-week -- --week=2026-W43 [--langs=ja,en] [--apply]
 */
import { DayOfWeek, scheduledPostTime, THEME_SLOTS, weekStartFromId } from '@/lib/schedule';
import { plannedLanguages } from '@/lib/plan-languages';
import { parseSignThemeId, SIGNS_BY_DAY, signThemeSlotScriptId } from '@/lib/sign-themes';
import { ContentQueue, GoogleSheetsService, Language } from '@/services/sheets';

function arg(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
}

function started(task: ContentQueue): boolean {
  return task.post_status === 'Posted' || (task.posted_refs?.length ?? 0) > 0;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const weekId = arg('week');
  const weekStart = weekId ? weekStartFromId(weekId) : undefined;
  if (!weekId || !weekStart) throw new Error('pass --week=<YYYY-Www>');
  const langs = (arg('langs')?.split(',') as Language[] | undefined) ?? plannedLanguages();

  const sheets = new GoogleSheetsService();
  const tasks = await sheets.getQueueTasks(weekId);
  const hold: string[] = [];
  const add: ContentQueue[] = [];

  for (const lang of langs) {
    const live = tasks.filter(
      (task) =>
        task.lang_code === lang &&
        task.target_type === 'Theme' &&
        parseSignThemeId(task.theme_id ?? '') &&
        task.post_status !== 'Hold',
    );
    const kept = live.filter(started);
    const keptSigns = new Set(kept.map((task) => parseSignThemeId(task.theme_id ?? '')?.sign));
    hold.push(...live.filter((task) => !started(task)).map((task) => task.task_id));

    for (const day of Object.keys(SIGNS_BY_DAY) as DayOfWeek[]) {
      for (let slot = 0; slot < THEME_SLOTS; slot += 1) {
        const scriptId = signThemeSlotScriptId(weekId, day, slot);
        const sign = scriptId ? parseSignThemeId(scriptId)?.sign : undefined;
        if (!scriptId || !sign || keptSigns.has(sign)) continue;
        add.push({
          week_id: weekId,
          day_of_week: day,
          lang_code: lang,
          target_type: 'Theme',
          theme_id: scriptId,
          zodiac_sign: sign,
          task_id: `${weekId}-${lang}-${scriptId}`,
          script_status: 'Pending',
          script_attempts: 0,
          render_status_30s: 'Pending',
          render_status_65s: 'Pending',
          render_attempts_30s: 0,
          render_attempts_65s: 0,
          post_status: 'Pending',
          scheduled_post_time: scheduledPostTime(weekStart, day, lang, slot),
        });
      }
    }
    for (const task of kept) console.log(`keep ${task.task_id} (${task.post_status})`);
  }

  for (const id of hold) console.log(`hold ${id}`);
  for (const task of add) console.log(`add  ${task.task_id} @ ${task.scheduled_post_time}`);
  console.log(`${weekId}: hold ${hold.length}, add ${add.length}`);
  if (!apply) {
    console.log('dry run; pass --apply to write');
    return;
  }
  // Hold first: the new rows reuse task_ids, and a status must land on the live row.
  await sheets.holdTasks(hold);
  await sheets.addQueueTasks(add);
  console.log(`restarted ${add.length} slots`);
}

void main();
