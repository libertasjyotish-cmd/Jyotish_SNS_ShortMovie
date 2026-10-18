import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { GoogleSheetsService } from '@/services/sheets';
import { YouTubeService } from '@/services/youtube';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Deletes extra YouTube uploads of a task: every video on the channel with the same title as the
 * one recorded in posted_refs (or, with none recorded, the oldest of them) except that one.
 * Dry-run unless `apply=1`. `GET ?tasks=<task_id,…>[&apply=1]`.
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const taskIds = (req.nextUrl.searchParams.get('tasks') ?? '').split(',').filter(Boolean);
  const apply = req.nextUrl.searchParams.get('apply') === '1';
  if (taskIds.length === 0) {
    return NextResponse.json({ error: 'tasks is required' }, { status: 400 });
  }

  const sheets = new GoogleSheetsService();
  const youtube = new YouTubeService();
  const all = await sheets.getAllQueueTasks();
  const results = [];
  for (const taskId of taskIds) {
    const task =
      all.find((row) => row.task_id === taskId && row.post_status !== 'Hold') ??
      all.find((row) => row.task_id === taskId);
    if (!task) {
      results.push({ task_id: taskId, error: 'not found' });
      continue;
    }
    try {
      const channel = await sheets.getChannelConfig(task.lang_code, 'YouTube');
      if (!channel) throw new Error('no YouTube channel');
      const uploads = await youtube.listRecentUploads(channel);
      const recorded = task.posted_refs?.find((ref) => ref.platform === 'YouTube')?.post_id;
      const keepVideo = uploads.find((video) => video.id === recorded);
      const title = keepVideo?.title;
      const sameTitle = title ? uploads.filter((video) => video.title === title) : [];
      const keep =
        keepVideo?.id ??
        sameTitle.slice().sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))[0]?.id;
      const extras = sameTitle.filter((video) => video.id !== keep);
      if (apply) {
        for (const video of extras) await youtube.deleteVideo(channel, video.id);
      }
      results.push({
        task_id: taskId,
        recorded,
        keep,
        title,
        deleted: apply ? extras.map((video) => video.id) : [],
        would_delete: apply ? [] : extras.map((video) => `${video.id} ${video.publishedAt}`),
      });
    } catch (error) {
      results.push({ task_id: taskId, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return NextResponse.json({ apply, results });
}
