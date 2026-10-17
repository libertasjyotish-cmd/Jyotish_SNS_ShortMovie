import { sendAlert } from '@/lib/alert';
import { triggerNextBatch } from '@/lib/batch';
import { isDispatchEnabledFor } from '@/lib/dispatch-gate';
import { plannedLanguages } from '@/lib/plan-languages';
import { runRenderBatch } from '@/lib/render-batch';
import { REUSED_PREFIX, auditStoredScripts, storedScriptsOf } from '@/lib/script-audit';
import { isoWeekId, nextWeekStart } from '@/lib/schedule';
import {
  MAX_RENDER_ATTEMPTS,
  MAX_SCRIPT_ATTEMPTS,
  POST_OVERDUE_MINUTES,
  findBlockedTasks,
  findSlotsToFill,
  justCrossed,
  findIncompletePlan,
  planRenderRecovery,
  planScriptRecovery,
} from '@/lib/watchdog';
import { CreatomateService } from '@/services/creatomate';
import { ContentQueue, GoogleSheetsService } from '@/services/sheets';

export interface WatchdogResult {
  requeued: number;
  gaveUp: number;
  retriggered: number;
  stillPending: number;
  renderFailed: number;
  renderErrors: string[];
  pendingScripts: number;
  requeuedScripts: number;
  auditedScripts: number;
  filledSlots: string[];
  generationResumed: boolean;
  replanTriggered: boolean;
  alerts: string[];
  alerted: boolean;
}

/**
 * Re-queues renders whose Cloud Run callback never arrived or that failed, starts them
 * again, and reports whatever retrying cannot fix.
 */
export async function runWatchdog(
  sheets: GoogleSheetsService,
  now: Date,
  { notify = true }: { notify?: boolean } = {},
): Promise<WatchdogResult> {
  const tasks = await sheets.getAllQueueTasks();
  const recoveries = planRenderRecovery(tasks, now);
  const alerts: string[] = [];

  await sheets.updateRenderStatuses(
    recoveries.map(({ taskId, pattern, action }) => ({ taskId, pattern, status: action })),
  );

  for (const recovery of recoveries) {
    const label = `${recovery.taskId} (${recovery.pattern})`;
    if (recovery.action === 'Error') {
      alerts.push(
        `${label}: render gave up after ${MAX_RENDER_ATTEMPTS} attempts (${recovery.reason})`,
      );
    } else {
      console.log(`Re-queued ${label} after ${recovery.reason}, attempt ${recovery.attempts}`);
    }
  }

  const requeued = recoveries.filter((recovery) => recovery.action === 'Pending').length;
  const batch = requeued > 0 ? await runRenderBatch(sheets, new CreatomateService()) : undefined;

  // A failed generation is never looked at again by the generator, so it is put back in the
  // queue here until the attempt limit says the failure is not transient.
  const scriptRecoveries = planScriptRecovery(tasks);
  const requeuedScripts = scriptRecoveries.filter((recovery) => recovery.action === 'Pending');
  await sheets.requeueScripts(requeuedScripts);
  for (const recovery of scriptRecoveries) {
    if (recovery.action === 'Error') {
      alerts.push(
        `${recovery.taskId}: script generation failed ${MAX_SCRIPT_ATTEMPTS} times`,
      );
    }
  }

  // Rules are tightened after scripts are already in the sheet, so every unposted row is read
  // back through the current lint and the ones that no longer pass are written again.
  const audited = auditStoredScripts(tasks, await storedScriptsOf(sheets, tasks));
  const requeuedAudit = audited.filter((entry) => entry.action === 'Pending');
  await sheets.requeueScripts(
    requeuedAudit.map(({ taskId, attempts }) => ({ taskId, attempts })),
  );
  for (const entry of audited) {
    if (entry.action === 'Error') {
      alerts.push(`${entry.taskId}: script still fails the lint after rewrites (${entry.reason})`);
    } else {
      console.log(`Re-queued ${entry.taskId} for rewrite: ${entry.reason}`);
    }
  }

  // A slot whose script is still missing shortly before it airs borrows a passed script for the
  // same sign and language, so a generator outage never costs a post.
  const filledSlots: string[] = [];
  const urgent: string[] = [];
  const weeklyToWrite: ContentQueue[] = [];
  for (const task of findSlotsToFill(tasks, now)) {
    if (task.target_type !== 'Theme' && task.target_type !== 'Promo') {
      // A weekly reading cannot be borrowed from another week: it is regenerated first.
      weeklyToWrite.push(task);
      continue;
    }
    const reuse = await sheets.findApprovedScript({
      lang_code: task.lang_code,
      zodiac_sign: task.zodiac_sign,
      taskIdContains: task.theme_id ?? 'sign-',
      excludeWeekId: task.week_id,
    });
    if (!reuse) {
      const line = `${task.task_id}: no script and nothing passed to borrow for the ${task.scheduled_post_time} slot`;
      alerts.push(line);
      urgent.push(line);
      continue;
    }
    await sheets.saveScriptOutput({
      ...reuse,
      task_id: task.task_id,
      week_id: task.week_id,
      lang_code: task.lang_code,
      zodiac_sign: task.zodiac_sign,
      transit_reference: `${REUSED_PREFIX}${reuse.task_id}`,
      created_at: now.toISOString(),
    });
    await sheets.updateScriptStatus(task.task_id, 'Script_Done');
    filledSlots.push(task.task_id);
    console.warn(`${task.task_id}: script still missing near its slot, filled from ${reuse.task_id}`);
  }
  if (filledSlots.length > 0) await runRenderBatch(sheets, new CreatomateService());

  const blocked = findBlockedTasks(tasks, now, { isDispatchEnabledFor });
  alerts.push(...blocked);
  urgent.push(
    ...tasks
      .filter((task) => justCrossed(task.scheduled_post_time, POST_OVERDUE_MINUTES, now))
      .map((task) => task.task_id)
      .flatMap((id) => blocked.filter((line) => line.startsWith(`${id}:`))),
  );

  // A plan that died partway through leaves the week short of slots. Planning is idempotent,
  // so running it again fills the gap instead of waiting for next Monday's cron.
  const languages = plannedLanguages();
  const nextWeekId = isoWeekId(nextWeekStart(now));
  const planGaps = findIncompletePlan(tasks, nextWeekId, languages);
  const replanTriggered =
    planGaps.length > 0 ? await triggerNextBatch('/api/cron/weekly-plan', 0) : false;
  // The current week can no longer be filled by planning, so what is missing there is reported.
  alerts.push(...findIncompletePlan(tasks, isoWeekId(now), languages));

  // The generation chain hands its remainder to a fresh invocation, so a single lost
  // invocation leaves the week half written until the next weekly cron. Restarting it here
  // picks the backlog up the same day.
  const pendingScripts =
    tasks.filter((task) => task.script_status === 'Pending').length +
    requeuedScripts.length +
    requeuedAudit.length;
  // Weekly readings close to their slot are retried even past MAX_SCRIPT_ATTEMPTS and are
  // generated alone, ahead of the rest of the backlog.
  const weeklyErrors = weeklyToWrite.filter((task) => task.script_status === 'Error');
  await sheets.requeueScripts(
    weeklyErrors.map((task) => ({ taskId: task.task_id, attempts: task.script_attempts + 1 })),
  );
  const urgentParams =
    weeklyToWrite.length > 0
      ? new URLSearchParams({ tasks: weeklyToWrite.map((task) => task.task_id).join(',') })
      : undefined;
  const generationResumed =
    pendingScripts + weeklyToWrite.length > 0
      ? await triggerNextBatch('/api/cron/weekly-generate', 0, urgentParams)
      : false;

  // Recovery runs with every dispatch (96×/day); the mail about what still cannot be fixed is
  // sent only by the daily watchdog cron, or the same report arrives every 15 minutes.
  // What recovery could not fix is mailed the moment it happens; each case falls in exactly one
  // 15-minute dispatch window, so it arrives once instead of every run.
  const report = notify ? alerts : urgent;
  const alerted =
    report.length > 0
      ? await sendAlert(['Jyotish SNS pipeline needs attention:', ...report])
      : false;

  return {
    requeued,
    gaveUp: recoveries.length - requeued,
    retriggered: batch?.triggered ?? 0,
    stillPending: batch?.remaining ?? 0,
    renderFailed: batch?.failed ?? 0,
    renderErrors: batch?.errors ?? [],
    pendingScripts,
    requeuedScripts: requeuedScripts.length,
    auditedScripts: requeuedAudit.length,
    filledSlots,
    generationResumed,
    replanTriggered,
    alerts,
    alerted,
  };
}
