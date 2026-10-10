/**
 * Prints every stored script of a week in one language, with its post status, so the wording can be
 * read and approved before anything is rendered or posted.
 *
 * Usage: npm run dump:week -- <lang> [week_id] [--unposted]
 */
import { GoogleSheetsService } from '@/services/sheets';
import { isoWeekId } from '@/lib/schedule';

type Script = { hook_text?: string; body_script?: string; cta_text?: string };

function parse(json: string): Script {
  try {
    return JSON.parse(json) as Script;
  } catch {
    return {};
  }
}

async function main() {
  const args = process.argv.slice(2);
  const unpostedOnly = args.includes('--unposted');
  const rest = args.filter((arg) => !arg.startsWith('--'));
  const lang = rest[0] ?? 'ja';
  const weekId = rest[1] ?? isoWeekId(new Date());

  const sheets = new GoogleSheetsService();
  const [outputs, tasks] = await Promise.all([
    sheets.getScriptOutputsByWeek(weekId),
    sheets.getQueueTasks(weekId),
  ]);
  const statusOf = new Map(tasks.map((task) => [task.task_id, task.post_status || 'Pending']));

  const rows = outputs
    .filter((output) => output.lang_code === lang)
    .filter((output) => !unpostedOnly || statusOf.get(output.task_id) !== 'Posted');

  console.log(`${weekId} ${lang}: ${rows.length} script(s)`);
  for (const output of rows) {
    const script = parse(output.script_30s_json);
    console.log(`\n--- ${output.task_id} [${statusOf.get(output.task_id) ?? 'unknown'}]`);
    console.log(`hook: ${script.hook_text ?? ''}`);
    console.log(`body: ${script.body_script ?? ''}`);
    console.log(`cta : ${script.cta_text ?? ''}`);
  }
}

void main();
