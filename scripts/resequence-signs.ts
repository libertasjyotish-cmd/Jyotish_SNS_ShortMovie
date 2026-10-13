/**
 * Puts the week's remaining sign slots back in zodiac order.
 *
 * Each Mon-Wed series starts again at Aries, so a week that lost a day replays signs that have
 * already been published (Aries right after Gemini). This parks the unposted sign rows and
 * refills the same slots with the signs the week has not published yet, in zodiac order.
 *
 *   npm run resequence:signs -- [--week=2026-W42] [--langs=ja,en] [--apply]
 */
import { DayOfWeek, isoWeekId, startOfIsoWeek } from '@/lib/schedule';
import { ZODIAC_SIGNS, ZodiacSign } from '@/lib/zodiac-names';
import { plannedLanguages } from '@/lib/plan-languages';
import { seriesForWeek, signThemeScriptId } from '@/lib/sign-themes';
import { ContentQueue, GoogleSheetsService, Language } from '@/services/sheets';

function arg(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const weekId = arg('week') ?? isoWeekId(startOfIsoWeek(new Date()));
  const langs = (arg('langs')?.split(',') as Language[] | undefined) ?? plannedLanguages();

  const sheets = new GoogleSheetsService();
  const tasks = await sheets.getQueueTasks(weekId);

  const hold: string[] = [];
  const add: { task: ContentQueue; scriptId: string }[] = [];

  for (const lang of langs) {
    const signRows = tasks
      .filter((task) => task.lang_code === lang && task.target_type === 'Theme' && task.zodiac_sign)
      .filter((task) => task.post_status !== 'Hold');
    const done = new Set<ZodiacSign>(
      signRows
        .filter((task) => task.post_status === 'Posted')
        .map((task) => task.zodiac_sign?.toLowerCase() as ZodiacSign),
    );
    const open = signRows
      .filter((task) => task.post_status !== 'Posted')
      .sort((a, b) => a.scheduled_post_time.localeCompare(b.scheduled_post_time));
    const wanted = ZODIAC_SIGNS.filter((sign) => !done.has(sign)).slice(0, open.length);

    // A slot can take the id another unposted slot is giving up, so the moves are worked out
    // first and only ids outside the vacated set count as collisions.
    const moves = open
      .map((task, index) => ({ task, sign: wanted[index] }))
      .filter(({ task, sign }) => sign && task.zodiac_sign?.toLowerCase() !== sign);
    const vacated = new Set(moves.map(({ task }) => task.task_id));

    moves.forEach(({ task, sign }) => {
      const series = seriesForWeek(weekId);
      if (!sign) return;
      const scriptId = signThemeScriptId(series, sign);
      const taskId = `${weekId}-${lang}-${scriptId}`;
      if (tasks.some((existing) => existing.task_id === taskId && !vacated.has(taskId))) return;
      hold.push(task.task_id);
      add.push({
        scriptId,
        task: {
          ...task,
          task_id: taskId,
          theme_id: scriptId,
          zodiac_sign: sign,
          script_status: 'Pending',
          script_attempts: 0,
          render_status_30s: 'Pending',
          render_status_65s: 'Pending',
          render_attempts_30s: 0,
          render_attempts_65s: 0,
          post_status: 'Pending',
        },
      });
      console.log(`${task.task_id} -> ${taskId} @ ${task.scheduled_post_time}`);
    });
  }

  console.log(`${hold.length} slots to resequence in ${weekId}`);
  if (!apply) {
    console.log('dry run; pass --apply to write');
    return;
  }
  await sheets.holdTasks(hold);
  await sheets.addQueueTasks(add.map(({ task }) => task));
  await sheets.markEvergreenUsedMany(
    add.map(({ task, scriptId }) => ({ scriptId, lang_code: task.lang_code, weekId })),
  );
  console.log(`resequenced ${add.length} slots`);
}

void main();
