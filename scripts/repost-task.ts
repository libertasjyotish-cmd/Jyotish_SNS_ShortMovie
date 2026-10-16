/**
 * Takes a published reading down and queues it to be published again from the current render,
 * for a slot that went live from a script that has since been rewritten.
 *
 * Usage: npm run repost:task -- --ids=<task_id,...> [--apply]
 *
 * Instagram has no delete API, so its reel is reported for removal in the app; everything else
 * is removed through the platform API. The row is then cleared back to Pending, so the next
 * dispatch uploads the current video — which must already be rendered from the new script.
 */
import { FacebookService } from '@/services/facebook';
import { GoogleSheetsService, PostedRef } from '@/services/sheets';
import { ThreadsService } from '@/services/threads';
import { YouTubeService } from '@/services/youtube';

function parseArgs(argv: string[]): { ids: string[]; apply: boolean } {
  const ids: string[] = [];
  let apply = false;
  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg.startsWith('--ids=')) ids.push(...arg.slice('--ids='.length).split(','));
    else throw new Error(`unknown argument: ${arg}`);
  }
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) throw new Error('no task ids given');
  return { ids: unique, apply };
}

async function main(): Promise<void> {
  const { ids, apply } = parseArgs(process.argv.slice(2));
  const weeks = Array.from(new Set(ids.map((id) => /^(\d{4}-W\d{2})/.exec(id)?.[1] ?? '')));
  if (weeks.some((week) => !week)) throw new Error('task ids must start with a week like 2026-W43');

  const sheets = new GoogleSheetsService();
  const youtube = new YouTubeService();
  const threads = new ThreadsService(sheets);
  const facebook = new FacebookService();

  const queue = (await Promise.all(weeks.map((week) => sheets.getQueueTasks(week)))).flat();
  const tasks = queue.filter((task) => ids.includes(task.task_id));
  for (const id of ids.filter((id) => !tasks.some((task) => task.task_id === id))) {
    console.log(`missing ${id}`);
  }

  for (const task of tasks) {
    const refs = task.posted_refs ?? [];
    console.log(
      `${task.task_id} render=${task.render_status_30s} posts=${
        refs.map((ref) => `${ref.platform}:${ref.post_id}`).join(' ') || 'none'
      }`,
    );
    if (!apply) continue;
    if (task.render_status_30s !== 'Rendered') {
      console.log(`  skip: the new video is not rendered yet`);
      continue;
    }

    const manual: string[] = [];
    for (const ref of refs) {
      const channel = await sheets.getChannelConfig(task.lang_code, ref.platform);
      if (!channel) {
        console.log(`  ${ref.platform}: no channel, left in place`);
        continue;
      }
      try {
        await removePost(ref, channel);
        console.log(`  ${ref.platform}: removed ${ref.post_id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (message === 'no delete api') {
          manual.push(`${ref.platform} ${ref.post_id}`);
          console.log(`  ${ref.platform}: delete in the app (${ref.post_id})`);
        } else {
          console.log(`  ${ref.platform}: failed (${message})`);
        }
      }
    }

    await sheets.clearPostRecord(task.task_id);
    console.log(`  queued for reposting${manual.length ? `; delete by hand: ${manual.join(', ')}` : ''}`);
  }

  if (!apply) console.log('dry run; pass --apply to take the posts down');

  async function removePost(ref: PostedRef, channel: Parameters<typeof youtube.deleteVideo>[0]) {
    switch (ref.platform) {
      case 'YouTube':
        return youtube.deleteVideo(channel, ref.post_id);
      case 'Threads':
        return threads.deletePost(channel, ref.post_id);
      case 'Facebook':
        return facebook.deleteVideo(channel, ref.post_id);
      default:
        throw new Error('no delete api');
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
