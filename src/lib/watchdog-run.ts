import { sendAlert } from '@/lib/alert';
import { triggerNextBatch } from '@/lib/batch';
import { isDispatchEnabledFor } from '@/lib/dispatch-gate';
import { plannedLanguages } from '@/lib/plan-languages';
import { runRenderBatch } from '@/lib/render-batch';
import { auditStoredScripts, storedScriptsOf } from '@/lib/script-audit';
import { isoWeekId, nextWeekStart } from '@/lib/schedule';
import {
  MAX_RENDER_ATTEMPTS,
  MAX_SCRIPT_ATTEMPTS,
  findBlockedTasks,
  findIncompletePlan,
  planRenderRecovery,
  planScriptRecovery,
} from '@/lib/watchdog';
import { CreatomateService } from '@/services/creatomate';
import { GoogleSheetsService } from '@/services/sheets';

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
  generationResumed: boolean;
  replanTriggered: boolean;
  alerts: string[];
  alerted: boolean;
}

/**
 * Re-queues renders whose Cloud Run callback never arrived or that failed, starts them
 * again, and reports whatever retrying cannot fix.
 */
export async function runWatchdog(sheets: GoogleSheetsService, now: Date): Promise<WatchdogResult> {
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

  alerts.push(...findBlockedTasks(tasks, now, { isDispatchEnabledFor }));

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
  const generationResumed =
    pendingScripts > 0 ? await triggerNextBatch('/api/cron/weekly-generate', 0) : false;

  const alerted = await sendAlert(
    alerts.length > 0 ? ['Jyotish SNS pipeline needs attention:', ...alerts] : [],
  );

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
    generationResumed,
    replanTriggered,
    alerts,
    alerted,
  };
}
