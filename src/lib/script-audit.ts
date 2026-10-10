import { weekPeriodSpoken } from '@/lib/period';
import { describeIssues, lintScript } from '@/lib/script-lint';
import { MAX_SCRIPT_ATTEMPTS } from '@/lib/watchdog';
import { zodiacName } from '@/lib/zodiac-names';
import type { ContentQueue, GoogleSheetsService, ScriptOutput } from '@/services/sheets';

export interface AuditedScript {
  taskId: string;
  attempts: number;
  action: 'Pending' | 'Error';
  reason: string;
}

/**
 * Re-reads a stored script with the current lint. A rule added after a script was written would
 * otherwise never reach it: the generator only looks at rows it is about to write, so the sheet
 * keeps whatever passed the rules of the week it was made in.
 */
export function auditStoredScripts(
  tasks: ContentQueue[],
  outputs: ScriptOutput[],
): AuditedScript[] {
  const byTask = new Map(outputs.map((output) => [output.task_id, output]));
  const audited: AuditedScript[] = [];

  for (const task of tasks) {
    // A published video cannot be replaced, and a row still being written is the generator's.
    if (task.post_status === 'Posted' || task.post_status === 'Hold') continue;
    if (task.script_status !== 'Script_Done') continue;
    const output = byTask.get(task.task_id);
    if (!output?.script_30s_json) continue;

    let script: { hook_text: string; body_script: string; cta_text: string };
    try {
      script = JSON.parse(output.script_30s_json);
    } catch {
      continue;
    }

    const spokenPeriod =
      task.target_type === 'Zodiac_Sign' ? weekPeriodSpoken(task.week_id, task.lang_code) : undefined;
    const issues = lintScript(
      script,
      task.lang_code,
      '30s',
      spokenPeriod,
      zodiacName(task.zodiac_sign, task.lang_code),
    );
    if (issues.length === 0) continue;

    audited.push({
      taskId: task.task_id,
      attempts: task.script_attempts + 1,
      action: task.script_attempts >= MAX_SCRIPT_ATTEMPTS ? 'Error' : 'Pending',
      reason: describeIssues(issues),
    });
  }

  return audited;
}

/** Loads the script rows the audit needs for the weeks that still have unposted slots. */
export async function storedScriptsOf(
  sheets: GoogleSheetsService,
  tasks: ContentQueue[],
): Promise<ScriptOutput[]> {
  const weeks = Array.from(
    new Set(
      tasks
        .filter((task) => task.post_status !== 'Posted' && task.post_status !== 'Hold')
        .map((task) => task.week_id),
    ),
  );
  const outputs = await Promise.all(weeks.map((week) => sheets.getScriptOutputsByWeek(week)));
  return outputs.flat();
}
