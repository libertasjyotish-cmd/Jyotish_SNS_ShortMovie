import { NextRequest, NextResponse } from 'next/server';
import { adminTokenMatches, isAdminAuthorized } from '@/lib/admin-auth';
import { isCronAuthorized } from '@/lib/auth';
import { weekStartFromId } from '@/lib/schedule';
import { InstagramService } from '@/services/instagram';
import { GoogleSheetsService, Language } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MS_PER_DAY = 86_400_000;

/** Same cutoff as `/api/cron/expire-weekly`, so both jobs consider the same posts expired. */
function weekEnded(weekId: string): boolean {
  const start = weekStartFromId(weekId);
  if (!start) return false;
  return start.getTime() + 7 * MS_PER_DAY <= Date.now();
}

/** The retirement job runs unattended, so CRON_SECRET works here as well as the admin token. */
function authorized(request: NextRequest, token: string | null): boolean {
  return isAdminAuthorized(request) || adminTokenMatches(token ?? '') || isCronAuthorized(request);
}

interface PendingReel {
  task_id: string;
  lang_code: Language;
  week_id: string;
  zodiac_sign?: string;
  media_id: string;
  /** Instagram username of the account holding the Reel, so the job logs into the right one. */
  account_handle?: string;
  permalink?: string;
  error?: string;
}

/**
 * Worklist of Reels whose week is over. Instagram publishes through the Graph API but offers no
 * way to delete or archive a published Reel, so the retirement job opens these permalinks in the
 * account UI and reports each one back with POST.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request, request.nextUrl.searchParams.get('token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheets = new GoogleSheetsService();
    const instagram = new InstagramService();
    const posts = await sheets.getExpirablePosts(weekEnded);
    const items: PendingReel[] = [];

    for (const post of posts) {
      for (const ref of post.refs) {
        if (ref.platform !== 'Instagram' || ref.retired) continue;
        const item: PendingReel = {
          task_id: post.task.task_id,
          lang_code: post.task.lang_code,
          week_id: post.task.week_id,
          zodiac_sign: post.task.zodiac_sign,
          media_id: ref.post_id,
        };
        try {
          const channel = await sheets.getChannelConfig(post.task.lang_code, 'Instagram');
          if (!channel) throw new Error(`no Instagram channel for ${post.task.lang_code}`);
          item.account_handle = channel.account_handle;
          item.permalink = await instagram.permalink(channel, ref.post_id);
        } catch (error) {
          item.error = error instanceof Error ? error.message : 'Unknown error';
        }
        items.push(item);
      }
    }

    return NextResponse.json({ count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Instagram retirement list failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Marks one Reel as taken down, so it leaves the worklist and its row can expire. */
export async function POST(request: NextRequest) {
  if (!authorized(request, request.nextUrl.searchParams.get('token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    task_id?: string;
    media_id?: string;
  } | null;
  if (!body?.task_id) {
    return NextResponse.json({ error: 'task_id is required' }, { status: 400 });
  }

  try {
    const sheets = new GoogleSheetsService();
    const post = (await sheets.getExpirablePosts(weekEnded)).find(
      (candidate) => candidate.task.task_id === body.task_id,
    );
    if (!post) {
      return NextResponse.json({ error: `No pending post ${body.task_id}` }, { status: 404 });
    }

    const done = post.refs.filter(
      (ref) => ref.platform === 'Instagram' && (!body.media_id || ref.post_id === body.media_id),
    );
    if (done.length === 0) {
      return NextResponse.json(
        { error: `No pending Instagram post ${body.media_id ?? body.task_id}` },
        { status: 404 },
      );
    }
    for (const ref of done) ref.retired = true;
    await sheets.saveRetirement(post.task.task_id, post.refs, 'Instagram:done');

    return NextResponse.json({
      status: 'Instagram retired',
      task_id: post.task.task_id,
      expired: post.refs.every((ref) => ref.retired),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Instagram retirement update failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
