import { weekStartFromId } from '@/lib/schedule';
import type { Platform, PostedRef } from '@/services/sheets';

const MS_PER_DAY = 86_400_000;

/** Rows of a week are moved out of the sheet once the week started this many days ago. */
export const ARCHIVE_AFTER_DAYS = 35;
/** A sign reading whose takedown keeps failing is archived anyway after this many days. */
export const ARCHIVE_UNRETIRED_AFTER_DAYS = 90;
/** Finished stories are moved out once they were last touched this many days ago. */
export const ARCHIVE_STORIES_AFTER_DAYS = 14;
/** Rows removed from one sheet in one run; the rest go on the next run. */
export const MAX_ARCHIVE_ROWS_PER_SHEET = 1500;

/** Platforms whose posts `expire-weekly` can take down. */
export function isRetirable(platform: Platform): boolean {
  return (
    platform === 'YouTube' ||
    platform === 'Threads' ||
    platform === 'Facebook' ||
    platform === 'Instagram'
  );
}

function parseRefs(value: string | undefined): PostedRef[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as PostedRef[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function weekAge(weekId: string, now: Date): number | undefined {
  const start = weekStartFromId(weekId);
  return start ? (now.getTime() - start.getTime()) / MS_PER_DAY : undefined;
}

/** A queue row nothing will read or write again. */
function queueRowDone(row: Record<string, string>, now: Date): boolean {
  const age = weekAge(row.week_id, now);
  if (age === undefined || age < ARCHIVE_AFTER_DAYS) return false;
  if (row.render_status_30s === 'Rendering' || row.render_status_65s === 'Rendering') return false;
  const awaitsTakedown =
    row.target_type === 'Zodiac_Sign' &&
    row.post_status === 'Posted' &&
    !row.expired_at &&
    parseRefs(row.posted_refs).some((ref) => !ref.retired && isRetirable(ref.platform));
  return !awaitsTakedown || age >= ARCHIVE_UNRETIRED_AFTER_DAYS;
}

/**
 * Task ids whose queue rows can all leave the sheet. Duplicates of a task share its id, so a
 * task only goes once every one of its rows is done.
 */
export function planQueueArchive(rows: Record<string, string>[], now: Date): Set<string> {
  const done = new Map<string, boolean>();
  for (const row of rows) {
    if (!row.task_id) continue;
    done.set(row.task_id, (done.get(row.task_id) ?? true) && queueRowDone(row, now));
  }
  const ids = new Set<string>();
  for (const [taskId, isDone] of Array.from(done.entries())) if (isDone) ids.add(taskId);
  return ids;
}

export function storyKey(row: Record<string, string>): string {
  return `${row.story_id}/${row.platform}`;
}

/** Stories already posted or given up on that no run has touched for a while. */
export function planStoryArchive(rows: Record<string, string>[], now: Date): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!row.story_id || !['Posted', 'Failed'].includes(row.status)) continue;
    const touched = Date.parse(row.updated_at || row.post_after);
    if (!Number.isFinite(touched)) continue;
    if (now.getTime() - touched >= ARCHIVE_STORIES_AFTER_DAYS * MS_PER_DAY) keys.add(storyKey(row));
  }
  return keys;
}

/**
 * Where each cached row is now. Archiving deletes rows, so a row number read before it may point
 * at another row; the row is found again as the same occurrence of its key. Rows without a key or
 * still in place keep their number.
 */
export function relocateRows(
  cached: { rowNumber: number; key: string }[],
  freshKeys: string[],
  rowNumbers: number[],
): number[] {
  const byNumber = new Map(cached.map((row) => [row.rowNumber, row.key]));
  return rowNumbers.map((rowNumber) => {
    const key = byNumber.get(rowNumber);
    if (!key || freshKeys[rowNumber - 1] === key) return rowNumber;
    const occurrence = cached.filter((row) => row.rowNumber < rowNumber && row.key === key).length;
    let seen = 0;
    for (let index = 1; index < freshKeys.length; index += 1) {
      if (freshKeys[index] !== key) continue;
      if (seen === occurrence) return index + 1;
      seen += 1;
    }
    throw new Error(`row "${key}" was archived before it could be written`);
  });
}
