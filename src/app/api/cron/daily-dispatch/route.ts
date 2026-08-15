import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { GeneratedScript } from '@/services/gemini';
import { InstagramService } from '@/services/instagram';
import { ContentQueue, GoogleSheetsService, Platform } from '@/services/sheets';
import { TikTokService } from '@/services/tiktok';
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

function buildTitle(task: ContentQueue, script: GeneratedScript): string {
  const subject = task.zodiac_sign || task.target_type.replace('_', ' ');
  return `${script.hook_text || subject} | Libertas Jyotish`.slice(0, 100);
}

export async function GET(request: Request) {
  // Scenario 3: Multi-platform post scheduler (hourly)
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sheetsService = new GoogleSheetsService();
  const youtubeService = new YouTubeService();
  const tiktokService = new TikTokService();
  const instagramService = new InstagramService();

  try {
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
        if (!renderOutput?.video_url_20s || !renderOutput.video_url_65s) {
          throw new Error(`Missing rendered video URLs for ${post.task_id}`);
        }

        const script20s: GeneratedScript = JSON.parse(scriptOutput.script_20s_json);
        const script65s: GeneratedScript = JSON.parse(scriptOutput.script_65s_json);
        const channels = await Promise.all(
          (['YouTube', 'Instagram', 'TikTok'] as Platform[]).map(async (platform) => {
            const channel = await sheetsService.getChannelConfig(post.lang_code, platform);
            if (!channel) {
              throw new Error(`No ${platform} channel configured for "${post.lang_code}"`);
            }
            return channel;
          }),
        );
        const [youtubeChannel, instagramChannel, tiktokChannel] = channels;

        await youtubeService.uploadVideo({
          channel: youtubeChannel,
          title: buildTitle(post, script20s),
          description: `${script20s.body_script}\n\n${script20s.cta_text}\n\n${scriptOutput.hashtags}`,
          videoUrl: renderOutput.video_url_20s,
        });

        await instagramService.uploadVideo({
          channel: instagramChannel,
          caption: `${script20s.hook_text}\n\n${script20s.cta_text}\n\n${scriptOutput.hashtags}`,
          videoUrl: renderOutput.video_url_20s,
        });

        await tiktokService.uploadVideo({
          channel: tiktokChannel,
          description: `${script65s.hook_text} ${scriptOutput.hashtags}`,
          videoUrl: renderOutput.video_url_65s,
        });

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
