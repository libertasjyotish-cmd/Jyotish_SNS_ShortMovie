/**
 * Runs the watchdog's stored-script audit by hand, so a rule added today can be applied to the
 * scripts already in the sheet without waiting for the nightly cron.
 *
 * Usage: npm run audit:scripts -- [lang...] [--week=2026-W42] [--apply]
 *
 * Without --apply nothing is written: it only lists which rows no longer pass the lint.
 */
import { auditStoredScripts, storedScriptsOf } from '@/lib/script-audit';
import { GoogleSheetsService, type Language } from '@/services/sheets';

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const weekArg = args.find((arg) => arg.startsWith('--week='))?.slice('--week='.length);
  const langs = new Set(args.filter((arg) => !arg.startsWith('--')) as Language[]);

  const sheets = new GoogleSheetsService();
  const tasks = (await sheets.getAllQueueTasks()).filter(
    (task) =>
      (langs.size === 0 || langs.has(task.lang_code)) && (!weekArg || task.week_id === weekArg),
  );
  const audited = auditStoredScripts(tasks, await storedScriptsOf(sheets, tasks));

  for (const entry of audited) console.log(`${entry.taskId} ${entry.action}: ${entry.reason}`);
  console.log(`${audited.length} row(s) fail the current lint of ${tasks.length} checked`);

  if (!apply) {
    console.log('nothing requeued (pass --apply)');
    return;
  }
  const requeued = audited.filter((entry) => entry.action === 'Pending');
  await sheets.requeueScripts(requeued.map(({ taskId, attempts }) => ({ taskId, attempts })));
  console.log(`${requeued.length} row(s) requeued for rewrite`);
}

void main();
