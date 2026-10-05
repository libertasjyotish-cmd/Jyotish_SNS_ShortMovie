import { SCHEDULED_PATTERNS } from '@/lib/patterns';
import { THEME_DAYS, ZODIAC_DAYS } from '@/lib/schedule';
import { ContentQueue, Language, Pattern, RenderStatus } from '@/services/sheets';

/** Slots the weekly plan creates per language: the theme days plus the twelve Moon signs. */
export const SLOTS_PER_LANGUAGE =
  THEME_DAYS.length + ZODIAC_DAYS.reduce((total, { signs }) => total + signs.length, 0);

/** A render whose callback should have arrived by now is treated as lost. */
export const RENDER_STALE_MINUTES = 30;
/** Renders retried this many times are left as `Error` for a human to look at. */
export const MAX_RENDER_ATTEMPTS = 3;
/** Script generations retried this many times are left as `Error` for a human to look at. */
export const MAX_SCRIPT_ATTEMPTS = 3;
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

export interface ScriptRecovery {
  taskId: string;
  attempts: number;
  /** `Pending` puts the task back in front of the generator; `Error` gives up on it. */
  action: 'Pending' | 'Error';
}

/**
 * Finds generations that failed. Nothing else ever looks at them again, so a transient Gemini
 * error silently costs the week a video unless they are put back in the queue here.
 */
export function planScriptRecovery(tasks: ContentQueue[]): ScriptRecovery[] {
  return tasks
    .filter((task) => task.script_status === 'Error')
    .map((task) => ({
      taskId: task.task_id,
      attempts: task.script_attempts + 1,
      action: task.script_attempts >= MAX_SCRIPT_ATTEMPTS ? ('Error' as const) : ('Pending' as const),
    }));
}

function elapsedMinutes(since: string | undefined, now: Date): number | undefined {
  if (!since) return undefined;
  const started = new Date(since).getTime();
  if (Number.isNaN(started)) return undefined;
  return (now.getTime() - started) / 60_000;
}

function renderState(task: ContentQueue, pattern: Pattern) {
  return pattern === '30s'
    ? {
        status: task.render_status_30s,
        startedAt: task.render_started_at_30s,
        attempts: task.render_attempts_30s,
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
 * until `MAX_RENDER_ATTEMPTS` is reached, after which it is left as `Error`. Patterns the
 * pipeline does not render are left alone: nothing is waiting for them.
 */
export function planRenderRecovery(tasks: ContentQueue[], now: Date): RenderRecovery[] {
  const recoveries: RenderRecovery[] = [];

  for (const task of tasks) {
    if (task.script_status !== 'Script_Done') continue;

    for (const pattern of SCHEDULED_PATTERNS) {
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

/**
 * Languages whose week is short of slots. A plan that dies partway through leaves no error
 * row behind, so the gap is only visible by counting what the week should hold.
 */
export function findIncompletePlan(
  tasks: ContentQueue[],
  weekId: string,
  languages: Language[],
): string[] {
  const planned = tasks.filter((task) => task.week_id === weekId);
  if (planned.length === 0) return [];

  return languages
    .map((lang) => ({
      lang,
      count: planned.filter((task) => task.lang_code === lang).length,
    }))
    .filter(({ count }) => count < SLOTS_PER_LANGUAGE)
    .map(
      ({ lang, count }) =>
        `${weekId}/${lang}: only ${count} of ${SLOTS_PER_LANGUAGE} slots planned`,
    );
}

/**
 * Queue rows a human has to deal with, because retrying will not fix them. A failed post is not
 * one of them: the next dispatch picks `Error` rows up again, so only a row still unposted long
 * after its slot is reported. While posting is disabled every due row is overdue by design, so
 * that check only runs once dispatch is on.
 */
export function findBlockedTasks(
  tasks: ContentQueue[],
  now: Date,
  options: { isDispatchEnabledFor: (lang: string) => boolean },
): string[] {
  const blocked: string[] = [];

  for (const task of tasks) {
    const overdue = elapsedMinutes(task.scheduled_post_time, now);
    if (
      options.isDispatchEnabledFor(task.lang_code) &&
      ['Pending', 'Error'].includes(task.post_status) &&
      overdue !== undefined &&
      overdue >= POST_OVERDUE_MINUTES
    ) {
      blocked.push(
        `${task.task_id}: still unposted ${Math.round(overdue / 60)}h after ${task.scheduled_post_time}`,
      );
    }
  }

  return blocked;
}
