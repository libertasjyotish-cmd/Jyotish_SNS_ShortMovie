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
/**
 * No row is ever rendered more often than this, not even close to its slot: every render is
 * paid for, and a row that keeps coming back is a loop, not bad luck.
 */
export const RENDER_HARD_CAP = 6;
/** Script generations retried this many times are left as `Error` for a human to look at. */
export const MAX_SCRIPT_ATTEMPTS = 3;
/** Even a weekly reading close to its slot is written at most this often; then it is dropped. */
export const SCRIPT_HARD_CAP = 6;
/** A post is only reported as missed once it is this far past its scheduled time. */
export const POST_OVERDUE_MINUTES = 90;
/** How long before its slot a row without a finished script stops waiting for the generator. */
/** How long before its slot a ready script must already be rendering. */
export const RENDER_LEAD_MINUTES = 360;
/** A slot still without a script this close to airing is filled or regenerated right away. */
export const SCRIPT_FILL_LEAD_MINUTES = RENDER_LEAD_MINUTES;
/** Dispatch runs every 15 minutes, so a 15-minute window makes a stateless alert fire once. */
const ALERT_WINDOW_MINUTES = 15;

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

function isUnposted(task: ContentQueue): boolean {
  return ['Pending', 'Error'].includes(task.post_status || 'Pending');
}

/** True once the slot is less than `minutes` away, or already past. */
function nearSlot(task: ContentQueue, minutes: number, now: Date): boolean {
  const elapsed = elapsedMinutes(task.scheduled_post_time, now);
  return elapsed !== undefined && elapsed >= -minutes;
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
    if (task.script_status !== 'Script_Done' || !isUnposted(task)) continue;

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
        // Past the retry limit a render is still retried once its slot is close: giving up
        // there costs the post, and a retry costs only one render.
        action:
          attempts < MAX_RENDER_ATTEMPTS ||
          (attempts < RENDER_HARD_CAP && nearSlot(task, RENDER_LEAD_MINUTES, now))
            ? 'Pending'
            : 'Error',
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

/**
 * Unposted rows whose slot is close or already past while the script is still missing. The
 * generator has had its chances by then, so the slot is filled from a passed script instead of
 * being left to die.
 */
export function findSlotsToFill(tasks: ContentQueue[], now: Date): ContentQueue[] {
  return tasks.filter((task) => {
    if (!['Pending', 'Error'].includes(task.post_status)) return false;
    if (!['Pending', 'Error'].includes(task.script_status)) return false;
    const elapsed = elapsedMinutes(task.scheduled_post_time, now);
    return elapsed !== undefined && elapsed >= -SCRIPT_FILL_LEAD_MINUTES;
  });
}

/** True only during the one dispatch run right after `minutes` have passed since `since`. */
export function justCrossed(since: string | undefined, minutes: number, now: Date): boolean {
  const elapsed = elapsedMinutes(since, now);
  return elapsed !== undefined && elapsed >= minutes && elapsed < minutes + ALERT_WINDOW_MINUTES;
}

/**
 * Unposted rows whose script is ready but whose render was never started, once the slot is
 * `RENDER_LEAD_MINUTES` away: the 3-hourly render cron may not have reached them yet.
 */
export function findRendersToStart(tasks: ContentQueue[], now: Date): ContentQueue[] {
  return tasks.filter(
    (task) =>
      isUnposted(task) &&
      task.script_status === 'Script_Done' &&
      (task.render_status_30s || 'Pending') === 'Pending' &&
      nearSlot(task, RENDER_LEAD_MINUTES, now),
  );
}

export type PipelineAction =
  | 'done'
  | 'generate'
  | 'requeue_script'
  | 'fill_script'
  | 'start_render'
  | 'retry_render'
  | 'rendering'
  | 'post'
  | 'wait';

/**
 * What the watchdog and dispatch do next for one row, composed from the same planners the
 * watchdog runs. `wait` is only correct while the slot is still far away;
 * `npm run check:pipeline` asserts no state close to its slot ends up there.
 */
export function nextPipelineAction(task: ContentQueue, now: Date): PipelineAction {
  if (!isUnposted(task)) return 'done';
  if (findSlotsToFill([task], now).length > 0) return 'fill_script';
  if (task.script_status === 'Error') {
    return planScriptRecovery([task])[0]?.action === 'Pending' ? 'requeue_script' : 'wait';
  }
  if (task.script_status !== 'Script_Done') return 'generate';
  const recovery = planRenderRecovery([task], now)[0];
  if (recovery) return recovery.action === 'Pending' ? 'retry_render' : 'wait';
  if (task.render_status_30s === 'Rendering') return 'rendering';
  if (findRendersToStart([task], now).length > 0) return 'start_render';
  if (task.render_status_30s === 'Rendered') {
    return nearSlot(task, 0, now) ? 'post' : 'wait';
  }
  return 'wait';
}
