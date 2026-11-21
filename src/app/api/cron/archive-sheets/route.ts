import { NextResponse } from 'next/server';
import { sendAlert } from '@/lib/alert';
import {
  MAX_ARCHIVE_ROWS_PER_SHEET,
  planQueueArchive,
  planStoryArchive,
  storyKey,
} from '@/lib/archive';
import { isCronAuthorized } from '@/lib/auth';
import { GoogleSheetsService, SHEET_NAMES } from '@/services/sheets';
import { uploadArchive } from '@/services/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Moves finished weeks out of the sheet into a JSON file on Blob storage, so the sheet stays
 * small enough to open and every cron that reads it whole stays fast.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheets = new GoogleSheetsService();
  const now = new Date();
  try {
    const queue = await sheets.getArchivableRows(SHEET_NAMES.contentQueue);
    const taskIds = new Set(
      Array.from(planQueueArchive(queue.rows, now)).slice(0, MAX_ARCHIVE_ROWS_PER_SHEET),
    );
    const stories = await sheets.getArchivableRows(SHEET_NAMES.stories);
    const storyKeys = new Set(
      Array.from(planStoryArchive(stories.rows, now)).slice(0, MAX_ARCHIVE_ROWS_PER_SHEET),
    );
    const scripts = await sheets.getArchivableRows(SHEET_NAMES.scriptOutputs);
    const renders = await sheets.getArchivableRows(SHEET_NAMES.renderOutputs);

    const byTask = (table: { headers: string[]; rows: Record<string, string>[] }) => ({
      headers: table.headers,
      rows: table.rows.filter((row) => taskIds.has(row.task_id)),
    });
    const moved = {
      [SHEET_NAMES.contentQueue]: byTask(queue),
      [SHEET_NAMES.scriptOutputs]: byTask(scripts),
      [SHEET_NAMES.renderOutputs]: byTask(renders),
      [SHEET_NAMES.stories]: {
        headers: stories.headers,
        rows: stories.rows.filter((row) => storyKeys.has(storyKey(row))),
      },
    };
    const counts = Object.fromEntries(
      Object.entries(moved).map(([sheet, table]) => [sheet, table.rows.length]),
    );
    if (Object.values(counts).every((count) => count === 0)) {
      return NextResponse.json({ status: 'Nothing to archive' });
    }

    // The rows are saved before any is deleted; a run that fails in between only repeats them.
    const url = await uploadArchive(
      `archive/sheets/${now.toISOString().slice(0, 10)}.json`,
      JSON.stringify({ archived_at: now.toISOString(), sheets: moved }),
    );
    // The queue goes last: until it does, the next run finds the same tasks and finishes them.
    const deleted = {
      [SHEET_NAMES.scriptOutputs]: await sheets.deleteRowsByKey(SHEET_NAMES.scriptOutputs, taskIds),
      [SHEET_NAMES.renderOutputs]: await sheets.deleteRowsByKey(SHEET_NAMES.renderOutputs, taskIds),
      [SHEET_NAMES.stories]: await sheets.deleteRowsByKey(SHEET_NAMES.stories, storyKeys),
      [SHEET_NAMES.contentQueue]: await sheets.deleteRowsByKey(SHEET_NAMES.contentQueue, taskIds),
    };
    return NextResponse.json({ status: 'Archive completed', url, archived: counts, deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Archive failed:', message);
    await sendAlert([`Jyotish SNS sheet archive failed: ${message}`]);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
