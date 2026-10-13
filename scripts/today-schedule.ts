/**
 * Prints the posting schedule of one day (default today, UTC date) across all languages, with each
 * slot's script/render/post state, so "what goes out today and what is blocked" is one command.
 *
 * Usage: npm run schedule:today -- [YYYY-MM-DD] [lang...]
 */
import { GoogleSheetsService } from '@/services/sheets';
import type { ContentQueue } from '@/services/sheets';

function blockedBy(task: ContentQueue): string {
  if ((task.post_status || 'Pending') !== 'Pending') return task.post_status;
  if (task.script_status === 'Error') return 'script_error';
  if (task.script_status !== 'Script_Done') return 'script_pending';
  if (task.render_status_30s === 'Error') return 'render_error';
  if (task.render_status_30s !== 'Rendered') return 'render_pending';
  return 'ready';
}

async function main() {
  const args = process.argv.slice(2);
  const day = args.find((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg)) ?? new Date().toISOString().slice(0, 10);
  const langs = args.filter((arg) => /^[a-z]{2}$/.test(arg));

  const sheets = new GoogleSheetsService();
  const tasks = (await sheets.getAllQueueTasks())
    .filter((task) => task.scheduled_post_time.slice(0, 10) === day)
    .filter((task) => langs.length === 0 || langs.includes(task.lang_code))
    .filter((task) => (task.post_status || 'Pending') !== 'Hold')
    .sort((a, b) => Date.parse(a.scheduled_post_time) - Date.parse(b.scheduled_post_time));

  console.log(`${day} (UTC date) ${tasks.length} slots`);
  for (const task of tasks) {
    const jst = new Date(Date.parse(task.scheduled_post_time) + 9 * 3_600_000)
      .toISOString()
      .slice(11, 16);
    console.log(
      [
        task.scheduled_post_time.slice(11, 16) + 'Z',
        jst + ' JST',
        task.lang_code,
        task.task_id,
        blockedBy(task),
      ].join('\t'),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
