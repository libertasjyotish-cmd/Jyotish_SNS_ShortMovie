import { NextResponse } from 'next/server';
import { sendAlert } from '@/lib/alert';
import { isCronAuthorized } from '@/lib/auth';
import { runRenderBatch } from '@/lib/render-batch';
import { MAX_RENDER_ATTEMPTS, findBlockedTasks, planRenderRecovery } from '@/lib/watchdog';
import { CreatomateService } from '@/services/creatomate';
import { GoogleSheetsService } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Keeps the pipeline moving without anyone watching it: re-queues renders whose Cloud Run
 * callback never arrived or that failed, starts them again, and reports whatever retrying
 * cannot fix.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheets = new GoogleSheetsService();
    const now = new Date();
    const tasks = await sheets.getAllQueueTasks();
    const recoveries = planRenderRecovery(tasks, now);
    const alerts: string[] = [];

    for (const recovery of recoveries) {
      await sheets.updateRenderStatus(recovery.taskId, recovery.pattern, recovery.action);
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

    alerts.push(...findBlockedTasks(tasks, now));
    const alerted = await sendAlert(
      alerts.length > 0 ? ['Jyotish SNS pipeline needs attention:', ...alerts] : [],
    );

    return NextResponse.json({
      status: 'Watchdog completed',
      requeued,
      gaveUp: recoveries.length - requeued,
      retriggered: batch?.triggered ?? 0,
      alerts,
      alerted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Watchdog failed:', message);
    await sendAlert([`Jyotish SNS watchdog failed: ${message}`]);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
