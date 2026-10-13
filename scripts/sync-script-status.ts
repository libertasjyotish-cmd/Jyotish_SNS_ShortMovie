/**
 * Marks queue rows Script_Done when a passed script is already stored for them.
 *
 * Retired duplicates share the task_id of the live slot, so a status written to the wrong row
 * left slots waiting for a script that had in fact been generated and paid for.
 *
 * Usage: npm run sync:script-status -- --week=2026-W42 [--ids=<task_id,…>] [--apply]
 */
import { GoogleSheetsService } from '../src/services/sheets';

function arg(name: string): string | undefined {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit?.split('=').slice(1).join('=');
}

async function main() {
  const week = arg('week');
  if (!week) throw new Error('--week=<iso-week> is required');
  const ids = arg('ids')?.split(',').filter(Boolean);
  const apply = process.argv.includes('--apply');

  const sheets = new GoogleSheetsService();
  const [tasks, outputs] = await Promise.all([
    sheets.getQueueTasks(week),
    sheets.getScriptOutputsByWeek(week),
  ]);
  const stored = new Set(
    outputs.filter((output) => output.script_30s_json).map((output) => output.task_id),
  );

  const fixable = tasks.filter(
    (task) =>
      (task.post_status || 'Pending') !== 'Hold' &&
      ['Pending', 'Error'].includes(task.script_status || 'Pending') &&
      stored.has(task.task_id) &&
      (!ids || ids.includes(task.task_id)),
  );

  for (const task of fixable) {
    console.log(`${task.task_id}\t${task.script_status} -> Script_Done`);
    if (apply) await sheets.updateScriptStatus(task.task_id, 'Script_Done');
  }
  console.log(`${fixable.length} row(s)${apply ? ' updated' : ' (dry run)'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
