import { NextResponse } from 'next/server';
import { sendAlert } from '@/lib/alert';
import { isCronAuthorized } from '@/lib/auth';
import { weekStartFromId } from '@/lib/schedule';
import { FacebookService } from '@/services/facebook';
import { ExpirablePost, GoogleSheetsService, Platform, PostedRef } from '@/services/sheets';
import { ThreadsService } from '@/services/threads';
import { YouTubeService } from '@/services/youtube';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MS_PER_DAY = 86_400_000;
/** Grace after the last day of the week, so a Sunday evening post keeps a full day of reach. */
const GRACE_DAYS = 1;
/** Threads allows 100 deletions per profile per 24h; one run stays far below it. */
const MAX_TASKS_PER_RUN = 40;

/**
 * Instagram's Graph API publishes Reels but cannot delete them, so an Instagram reference stays
 * open here and is archived through the account UI by the weekly Instagram retirement job, which
 * reads its worklist from `/api/admin/instagram-retire`.
 */
function isRetirable(platform: Platform): boolean {
  return platform === 'YouTube' || platform === 'Threads' || platform === 'Facebook';
}

function weekEndedBefore(now: Date): (weekId: string) => boolean {
  return (weekId: string) => {
    const start = weekStartFromId(weekId);
    if (!start) return false;
    return start.getTime() + (7 + GRACE_DAYS) * MS_PER_DAY <= now.getTime();
  };
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheetsService = new GoogleSheetsService();
  const youtubeService = new YouTubeService();
  const threadsService = new ThreadsService(sheetsService);
  const facebookService = new FacebookService();

  async function retire(post: ExpirablePost, ref: PostedRef): Promise<void> {
    const channel = await sheetsService.getChannelConfig(post.task.lang_code, ref.platform);
    if (!channel) throw new Error(`no ${ref.platform} channel for ${post.task.lang_code}`);
    switch (ref.platform) {
      case 'YouTube':
        return youtubeService.unlistVideo(channel, ref.post_id);
      case 'Threads':
        return threadsService.deletePost(channel, ref.post_id);
      case 'Facebook':
        return facebookService.deleteVideo(channel, ref.post_id);
      case 'Instagram':
      case 'TikTok':
        throw new Error(`${ref.platform} has no delete API`);
    }
  }

  try {
    const expirable = await sheetsService.getExpirablePosts(weekEndedBefore(new Date()));
    const due = expirable.slice(0, MAX_TASKS_PER_RUN);
    const failures: string[] = [];
    let retired = 0;
    let pendingInstagram = 0;

    for (const post of due) {
      const notes: string[] = [];
      for (const ref of post.refs) {
        if (ref.retired) continue;
        if (!isRetirable(ref.platform)) {
          notes.push(`${ref.platform}:pending(${ref.post_id})`);
          pendingInstagram += 1;
          continue;
        }
        try {
          await retire(post, ref);
          ref.retired = true;
          notes.push(`${ref.platform}:done`);
          retired += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          notes.push(`${ref.platform}:failed`);
          failures.push(`${post.task.task_id} ${ref.platform}: ${message}`);
        }
      }
      // Platforms already taken down are remembered, so the next run only tries what is left.
      await sheetsService.saveRetirement(post.task.task_id, post.refs, notes.join(' '));
    }

    if (failures.length > 0) {
      await sendAlert([
        `Jyotish SNS could not retire ${failures.length} expired post(s)`,
        ...failures.slice(0, 10),
      ]);
    }

    return NextResponse.json({
      status: 'Expiry completed',
      expirable: expirable.length,
      processed: due.length,
      retired,
      pending_instagram: pendingInstagram,
      failed: failures.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Expiry failed:', message);
    await sendAlert([`Jyotish SNS expiry failed: ${message}`]);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
