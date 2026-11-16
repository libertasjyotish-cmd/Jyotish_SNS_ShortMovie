/**
 * Renders a week's sign-theme videos again before they air, for when the way a video is built
 * changed after the week was rendered (e.g. the four signs of a day sharing one background).
 *
 * Only rows that have not started posting and air at least `--hours` from now are taken: the
 * video and cover keep their storage paths and are cached for an hour, so a slot closer than
 * that could still be served the old file. Each row is rendered once more by the normal
 * render-batch chain; nothing is posted here. Dry-run unless `--apply` is given.
 *
 *   npm run rerender:sign-week -- --week=2026-W47 [--hours=3] [--apply]
 */
import { pickBackground } from '@/lib/render';
import { parseSignThemeId } from '@/lib/sign-themes';
import { GoogleSheetsService } from '@/services/sheets';

function arg(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const weekId = arg('week');
  if (!weekId) throw new Error('pass --week=<YYYY-Www>');
  const from = Date.now() + Number(arg('hours') ?? 3) * 3_600_000;

  const sheets = new GoogleSheetsService();
  const tasks = (await sheets.getQueueTasks(weekId))
    .filter(
      (task) =>
        parseSignThemeId(task.theme_id ?? '') &&
        task.post_status !== 'Posted' &&
        task.post_status !== 'Hold' &&
        (task.posted_refs?.length ?? 0) === 0 &&
        task.render_status_30s === 'Rendered' &&
        Date.parse(task.scheduled_post_time) >= from,
    )
    .sort((a, b) => Date.parse(a.scheduled_post_time) - Date.parse(b.scheduled_post_time));

  for (const task of tasks) {
    const [output, assets] = await Promise.all([
      sheets.getRenderOutput(task.task_id),
      sheets.getBackgroundAssets({
        lang_code: task.lang_code,
        day_of_week: task.day_of_week,
        pattern: '30s',
      }),
    ]);
    const next = pickBackground(task.task_id, assets, task.day_of_week);
    const name = (url?: string) => url?.split('/').pop() ?? '-';
    console.log(
      `${task.task_id} ${task.scheduled_post_time} ${name(output?.background_url)} -> ${name(next)}`,
    );
  }
  console.log(`\n${tasks.length} row(s).`);
  if (!apply) {
    console.log('Dry run. Re-run with --apply to send them back to the renderer.');
    return;
  }
  await sheets.resetRenders(tasks.map((task) => task.task_id));
  console.log('Reset. The next render-batch run renders them in post order.');
}

void main();
