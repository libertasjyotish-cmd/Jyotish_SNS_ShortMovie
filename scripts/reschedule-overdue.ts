/**
 * Spreads the post time of tasks whose slot already passed over the next hours, so a week that
 * was held back (script rewrite, render backlog) still publishes instead of ageing out to Hold.
 *
 * Usage: npm run reschedule:overdue -- [--week=2026-W42] [--gap=30] [--start=+15] [--apply]
 *
 * Without --apply nothing is written: it only lists the new times.
 */
import { GoogleSheetsService } from '@/services/sheets';

function minutesArg(args: string[], name: string, fallback: number): number {
  const raw = args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const value = Number(raw?.replace('+', ''));
  return Number.isFinite(value) ? value : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const week = args.find((arg) => arg.startsWith('--week='))?.slice('--week='.length);
  const gap = minutesArg(args, 'gap', 30);
  const start = minutesArg(args, 'start', 15);

  const sheets = new GoogleSheetsService();
  const now = Date.now();
  const overdue = (await sheets.getAllQueueTasks())
    .filter(
      (task) =>
        (!week || task.week_id === week) &&
        (task.post_status || 'Pending') === 'Pending' &&
        Date.parse(task.scheduled_post_time) < now,
    )
    .sort((a, b) => Date.parse(a.scheduled_post_time) - Date.parse(b.scheduled_post_time));

  const updates = overdue.map((task, index) => ({
    taskId: task.task_id,
    scheduledPostTime: new Date(now + (start + index * gap) * 60_000).toISOString(),
  }));

  for (const update of updates) {
    console.log(`${update.taskId} -> ${update.scheduledPostTime}`);
  }
  console.log(`${updates.length} overdue task(s), ${gap} min apart`);

  if (!apply) {
    console.log('nothing written (pass --apply)');
    return;
  }
  await sheets.rescheduleTasks(updates);
  console.log(`${updates.length} task(s) rescheduled`);
}

void main();
