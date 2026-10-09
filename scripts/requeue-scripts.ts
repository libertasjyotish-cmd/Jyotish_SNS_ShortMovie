/**
 * Puts named tasks back through generation, so a script the reviewer rejected is rewritten and
 * its video rebuilt instead of shipping as it is.
 *
 * Usage: npm run requeue:scripts -- --ids=<task_id,...> [--apply]
 *        npm run requeue:scripts -- --from-review=<review output> [--apply]
 *
 * Already posted tasks are left alone: their video is public and re-rendering it costs money
 * without changing what anyone saw.
 */
import { readFileSync } from 'node:fs';
import { GoogleSheetsService } from '@/services/sheets';

function parseArgs(argv: string[]): { ids: string[]; apply: boolean } {
  const ids: string[] = [];
  let apply = false;
  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg.startsWith('--ids=')) ids.push(...arg.slice('--ids='.length).split(','));
    else if (arg.startsWith('--from-review=')) {
      const text = readFileSync(arg.slice('--from-review='.length), 'utf8');
      for (const line of text.split('\n')) {
        const match = /^\s+(\S+)\s+(?:awkward|broken):/.exec(line);
        if (match) ids.push(match[1]);
      }
    } else throw new Error(`unknown argument: ${arg}`);
  }
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) throw new Error('no task ids given');
  return { ids: unique, apply };
}

async function main(): Promise<void> {
  const { ids, apply } = parseArgs(process.argv.slice(2));
  const weeks = Array.from(new Set(ids.map((id) => /^(\d{4}-W\d{2})/.exec(id)?.[1] ?? '')));
  if (weeks.some((week) => !week)) throw new Error('task ids must start with a week like 2026-W42');

  const sheets = new GoogleSheetsService();
  const queue = (await Promise.all(weeks.map((week) => sheets.getQueueTasks(week)))).flat();
  const tasks = queue.filter((task) => ids.includes(task.task_id));

  const missing = ids.filter((id) => !tasks.some((task) => task.task_id === id));
  const posted = tasks.filter((task) => task.post_status === 'Posted');
  const targets = tasks.filter((task) => task.post_status !== 'Posted');

  for (const id of missing) console.log(`missing ${id}`);
  for (const task of posted) console.log(`skip ${task.task_id} (already posted)`);
  for (const task of targets) console.log(`requeue ${task.task_id}`);
  console.log(`${targets.length} to requeue, ${posted.length} posted, ${missing.length} missing`);

  if (!apply) {
    console.log('dry run; pass --apply to write');
    return;
  }
  await sheets.requeueScripts(targets.map((task) => ({ taskId: task.task_id, attempts: 0 })));
  await sheets.updateRenderStatuses(
    targets.map((task) => ({ taskId: task.task_id, pattern: '30s' as const, status: 'Pending' as const })),
  );
  console.log('requeued');
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
