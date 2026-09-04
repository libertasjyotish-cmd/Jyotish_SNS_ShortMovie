import { ContentQueue, Pattern, RenderStatus } from '@/services/sheets';

/** A render whose callback should have arrived by now is treated as lost. */
export const RENDER_STALE_MINUTES = 30;
/** Renders retried this many times are left as `Error` for a human to look at. */
export const MAX_RENDER_ATTEMPTS = 3;
/** A post is only reported as missed once it is this far past its scheduled time. */
export const POST_OVERDUE_MINUTES = 90;

export interface RenderRecovery {
  taskId: string;
  pattern: Pattern;
  /** Why the render needs attention. */
  reason: 'stale' | 'error';
  attempts: number;
  /** `Pending` re-queues the render; `Error` gives up on it. */
  action: Extract<RenderStatus, 'Pending' | 'Error'>;
}

function elapsedMinutes(since: string | undefined, now: Date): number | undefined {
  if (!since) return undefined;
  const started = new Date(since).getTime();
  if (Number.isNaN(started)) return undefined;
  return (now.getTime() - started) / 60_000;
}

function renderState(task: ContentQueue, pattern: Pattern) {
  return pattern === '20s'
    ? {
        status: task.render_status_20s,
        startedAt: task.render_started_at_20s,
        attempts: task.render_attempts_20s,
      }
    : {
        status: task.render_status_65s,
        startedAt: task.render_started_at_65s,
        attempts: task.render_attempts_65s,
      };
}

/**
 * Finds renders that will never finish on their own: rows stuck on `Rendering` because the
 * Cloud Run callback never arrived, and rows already marked `Error`. Each one is re-queued
 * until `MAX_RENDER_ATTEMPTS` is reached, after which it is left as `Error`.
 */
export function planRenderRecovery(tasks: ContentQueue[], now: Date): RenderRecovery[] {
  const recoveries: RenderRecovery[] = [];

  for (const task of tasks) {
    if (task.script_status !== 'Script_Done') continue;

    for (const pattern of ['20s', '65s'] as Pattern[]) {
      const { status, startedAt, attempts } = renderState(task, pattern);
      // A row without a start stamp predates the watchdog, so it is stuck by definition.
      const minutes = elapsedMinutes(startedAt, now);
      const stale =
        status === 'Rendering' && (minutes === undefined || minutes >= RENDER_STALE_MINUTES);
      if (!stale && status !== 'Error') continue;

      recoveries.push({
        taskId: task.task_id,
        pattern,
        reason: stale ? 'stale' : 'error',
        attempts,
        action: attempts >= MAX_RENDER_ATTEMPTS ? 'Error' : 'Pending',
      });
    }
  }

  return recoveries;
}

/** Queue rows a human has to deal with, because retrying will not fix them. */
export function findBlockedTasks(tasks: ContentQueue[], now: Date): string[] {
  const blocked: string[] = [];

  for (const task of tasks) {
    if (task.script_status === 'Error') {
      blocked.push(`${task.task_id}: script generation failed`);
    }
    if (task.post_status === 'Error') {
      blocked.push(`${task.task_id}: posting failed`);
    }
    const overdue = elapsedMinutes(task.scheduled_post_time, now);
    if (task.post_status === 'Pending' && overdue !== undefined && overdue >= POST_OVERDUE_MINUTES) {
      blocked.push(
        `${task.task_id}: still unposted ${Math.round(overdue / 60)}h after ${task.scheduled_post_time}`,
      );
    }
  }

  return blocked;
}
