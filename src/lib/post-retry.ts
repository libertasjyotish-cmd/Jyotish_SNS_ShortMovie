/**
 * When a post that keeps failing is given up on. Without a limit a broken upload was sent to the
 * same platform every 30 minutes until the row aged out three days later, which wastes the
 * shared API quota and reads to the platform like spam.
 */
import { weekStartFromId } from '@/lib/schedule';
import type { ContentQueue, Platform } from '@/services/sheets';

/** A platform that failed this many times is skipped for good; the others still post. */
export const MAX_PLATFORM_FAILURES = 3;
/**
 * A video handed to Instagram/Threads that is still transcoding is checked this many times, ten
 * minutes apart, by the follow-up runs between the posting windows; then that platform is dropped.
 */
export const TRANSCODE_CHECKS = 2;
/** A platform that refused a row for quota or rate this many times is dropped for that row. */
export const MAX_LIMIT_WAITS = 6;
/** Minutes to wait after the n-th failure before the row is tried again. */
const RETRY_GAP_MINUTES = [0, 30, 120];

export interface PostRetryState {
  failures: Partial<Record<Platform, { count: number; at: string }>>;
  /** Follow-up checks of a container still transcoding, per platform. */
  transcode_checks?: Partial<Record<Platform, number>>;
  /** Quota or rate refusals per platform, which are not failures but are not endless either. */
  limit_waits?: Partial<Record<Platform, number>>;
  /** Set once the row stopped being retried, so the daily check can list it. */
  gave_up_at?: string;
}

export function parsePostRetry(value: string | undefined): PostRetryState {
  try {
    const parsed = value ? (JSON.parse(value) as PostRetryState) : undefined;
    return parsed && typeof parsed === 'object' ? { ...parsed, failures: parsed.failures ?? {} } : { failures: {} };
  } catch {
    return { failures: {} };
  }
}

export function hasGivenUp(state: PostRetryState | undefined, platform: Platform): boolean {
  return (state?.failures[platform]?.count ?? 0) >= MAX_PLATFORM_FAILURES;
}

export function withFailures(
  state: PostRetryState | undefined,
  platforms: Platform[],
  now: Date,
): PostRetryState {
  const failures = { ...(state?.failures ?? {}) };
  for (const platform of platforms) {
    failures[platform] = { count: (failures[platform]?.count ?? 0) + 1, at: now.toISOString() };
  }
  return { ...state, failures };
}

/** False while the platforms that failed last are still inside their retry gap. */
export function retryAllowed(state: PostRetryState | undefined, now: Date): boolean {
  for (const entry of Object.values(state?.failures ?? {})) {
    if (!entry || entry.count >= MAX_PLATFORM_FAILURES) continue;
    const gap = RETRY_GAP_MINUTES[Math.min(entry.count, RETRY_GAP_MINUTES.length - 1)];
    if (now.getTime() - Date.parse(entry.at) < gap * 60_000) return false;
  }
  return true;
}

/** A weekly reading is worthless once its week is over, so what is still missing is dropped. */
export function readingWeekOver(task: ContentQueue, now: Date): boolean {
  if (task.target_type !== 'Zodiac_Sign') return false;
  const start = weekStartFromId(task.week_id);
  return Boolean(start) && now.getTime() >= start!.getTime() + 7 * 86_400_000;
}

/** Rows given up on within the last `hours`, with the reason, for the daily check mail. */
export function recentlyGivenUp(tasks: ContentQueue[], now: Date, hours = 24): string[] {
  return tasks
    .filter((task) => {
      const at = task.post_retry?.gave_up_at;
      return at !== undefined && now.getTime() - Date.parse(at) < hours * 3_600_000;
    })
    .map((task) => `${task.task_id}: posting given up (${task.post_error ?? 'no reason recorded'})`);
}
