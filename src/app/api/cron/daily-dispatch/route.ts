import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { buildDescription } from '@/lib/cta';
import { GeneratedScript } from '@/services/gemini';
import { InstagramService } from '@/services/instagram';
import { Channel, ContentQueue, GoogleSheetsService, Platform } from '@/services/sheets';
import { YouTubeService } from '@/services/youtube';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isDue(scheduledPostTime: string, now: Date): boolean {
  const scheduled = new Date(scheduledPostTime);
  if (Number.isNaN(scheduled.getTime())) {
    throw new Error(`Invalid scheduled_post_time: "${scheduledPostTime}"`);
  }
  return scheduled.getTime() <= now.getTime();
}

/**
 * Platforms are onboarded one at a time, so a channel row without credentials is skipped.
 *
 * TikTok is never dispatched: the Content Posting API app was rejected because TikTok does not
 * grant production access to apps that only publish to their own account, so its videos are
 * uploaded through the TikTok Studio UI instead.
 */
function isConnected(channel: Channel | null): channel is Channel {
  if (!channel) return false;
  switch (channel.platform) {
    case 'YouTube':
      return Boolean(channel.youtube_refresh_token);
    case 'Instagram':
      return Boolean(channel.ig_access_token && channel.ig_user_id);
    case 'TikTok':
      return false;
  }
}

function buildTitle(task: ContentQueue, script: GeneratedScript): string {
  const subject = task.zodiac_sign || task.target_type.replace('_', ' ');
  return `${script.hook_text || subject} | Libertas Jyotish`.slice(0, 100);
}

export async function GET(request: Request) {
  // Scenario 3: Multi-platform post scheduler
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheetsService = new GoogleSheetsService();
    const youtubeService = new YouTubeService();
    const instagramService = new InstagramService();
    const now = new Date();
    const pendingPosts = await sheetsService.getPendingPosts();
    const duePosts = pendingPosts.filter((post) => isDue(post.scheduled_post_time, now));
    let posted = 0;
    let failed = 0;

    for (const post of duePosts) {
      try {
        const [scriptOutput, renderOutput] = await Promise.all([
          sheetsService.getScriptOutput(post.task_id),
          sheetsService.getRenderOutput(post.task_id),
        ]);
        if (!scriptOutput) throw new Error(`No script output for ${post.task_id}`);

        const script20s: GeneratedScript = JSON.parse(scriptOutput.script_20s_json);
        const [youtubeChannel, instagramChannel] = await Promise.all(
          (['YouTube', 'Instagram'] as Platform[]).map((platform) =>
            sheetsService.getChannelConfig(post.lang_code, platform),
          ),
        );

        const uploads: (() => Promise<unknown>)[] = [];
        if (isConnected(youtubeChannel) && renderOutput?.video_url_20s) {
          const videoUrl = renderOutput.video_url_20s;
          uploads.push(() =>
            youtubeService.uploadVideo({
              channel: youtubeChannel,
              title: buildTitle(post, script20s),
              description: buildDescription({
                lang: post.lang_code,
                body: script20s.body_script,
                hashtags: scriptOutput.hashtags,
              }),
              videoUrl,
            }),
          );
        }
        if (isConnected(instagramChannel) && renderOutput?.video_url_20s) {
          const videoUrl = renderOutput.video_url_20s;
          uploads.push(() =>
            instagramService.uploadVideo({
              channel: instagramChannel,
              caption: buildDescription({
                lang: post.lang_code,
                body: script20s.hook_text,
                hashtags: scriptOutput.hashtags,
              }),
              videoUrl,
            }),
          );
        }

        if (uploads.length === 0) {
          throw new Error(`No connected platform with a rendered video for ${post.task_id}`);
        }
        for (const upload of uploads) await upload();

        await sheetsService.updatePostStatus(post.task_id, 'Posted');
        posted += 1;
      } catch (taskError) {
        failed += 1;
        const message = taskError instanceof Error ? taskError.message : 'Unknown error';
        console.error(`Failed to post task ${post.task_id}:`, message);
        await sheetsService.updatePostStatus(post.task_id, 'Error');
      }
    }

    return NextResponse.json({
      status: 'Dispatch completed',
      due: duePosts.length,
      posted,
      failed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dispatch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
