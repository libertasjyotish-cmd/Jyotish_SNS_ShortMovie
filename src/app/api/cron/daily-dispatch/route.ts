import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { buildDescription } from '@/lib/cta';
import { dispatchLanguages, isDispatchEnabled, isDispatchEnabledFor } from '@/lib/dispatch-gate';
import { ContainerFailedError, PendingTranscodeError } from '@/lib/media-container';
import { weekPeriodLabel } from '@/lib/period';
import { runWatchdog } from '@/lib/watchdog-run';
import { FacebookService } from '@/services/facebook';
import { GeneratedScript } from '@/services/gemini';
import { InstagramService } from '@/services/instagram';
import {
  Channel,
  ContainerPlatform,
  ContentQueue,
  GoogleSheetsService,
  Platform,
  PostedRef,
} from '@/services/sheets';
import { ThreadsService } from '@/services/threads';
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
    case 'Threads':
      return Boolean(channel.threads_access_token && channel.threads_user_id);
    case 'Facebook':
      return Boolean(channel.fb_page_id && channel.fb_page_access_token);
    case 'TikTok':
      return false;
  }
}

/** The week a sign reading covers; a theme is evergreen and carries no dates. */
function postPeriod(task: ContentQueue): string | undefined {
  return task.target_type === 'Zodiac_Sign'
    ? weekPeriodLabel(task.week_id, task.lang_code)
    : undefined;
}

function buildTitle(task: ContentQueue, script: GeneratedScript, period?: string): string {
  const subject = task.zodiac_sign || task.target_type.replace('_', ' ');
  const prefix = period ? `${subject} ${period}: ` : '';
  return `${prefix}${script.hook_text || subject} | Libertas Jyotish`.slice(0, 100);
}

/** The two-step upload Instagram and Threads share: hand over the video, then publish it. */
interface ContainerUploader {
  createContainer(): Promise<string>;
  waitUntilFinished(containerId: string): Promise<boolean>;
  publishContainer(containerId: string): Promise<string>;
}

/**
 * Instagram and Threads download and transcode the video on their own servers, which regularly
 * outlasts a posting run. The container id is stored before waiting, so a run that gives up costs
 * nothing: the next one publishes that same container instead of handing the video over again.
 */
async function postViaContainer(args: {
  sheetsService: GoogleSheetsService;
  task: ContentQueue;
  platform: ContainerPlatform;
  uploader: ContainerUploader;
}): Promise<string> {
  const { sheetsService, task, platform, uploader } = args;
  let containerId = task.container_ids?.[platform];

  if (!containerId) {
    containerId = await uploader.createContainer();
    await sheetsService.setPlatformContainer(task.task_id, platform, containerId);
  }

  let ready: boolean;
  try {
    ready = await uploader.waitUntilFinished(containerId);
  } catch (error) {
    if (error instanceof ContainerFailedError) {
      await sheetsService.setPlatformContainer(task.task_id, platform, '');
    }
    throw error;
  }

  if (!ready) {
    throw new PendingTranscodeError(
      `${platform} is still transcoding container ${containerId}; a later run publishes it`,
    );
  }

  const postId = await uploader.publishContainer(containerId);
  await sheetsService.setPlatformContainer(task.task_id, platform, '');
  return postId;
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
    const threadsService = new ThreadsService(sheetsService);
    const facebookService = new FacebookService();
    const now = new Date();
    // Recovery rides along with the dispatch that needs the videos, so a stuck render gets
    // one more chance before each posting window.
    const watchdog = await runWatchdog(sheetsService, now);
    const pendingPosts = await sheetsService.getPendingPosts();
    const duePosts = pendingPosts.filter((post) => isDue(post.scheduled_post_time, now));
    let posted = 0;
    let failed = 0;
    let skipped = 0;

    for (const post of duePosts) {
      try {
        const [scriptOutput, renderOutput] = await Promise.all([
          sheetsService.getScriptOutput(post.task_id),
          sheetsService.getRenderOutput(post.task_id),
        ]);
        if (!scriptOutput) throw new Error(`No script output for ${post.task_id}`);

        const script30s: GeneratedScript = JSON.parse(scriptOutput.script_30s_json);
        const period = postPeriod(post);
        const [youtubeChannel, instagramChannel, threadsChannel, facebookChannel] =
          await Promise.all(
            (['YouTube', 'Instagram', 'Threads', 'Facebook'] as Platform[]).map((platform) =>
              sheetsService.getChannelConfig(post.lang_code, platform),
            ),
          );

        const done: PostedRef[] = post.posted_refs ?? [];
        const uploads: { platform: Platform; run: () => Promise<string> }[] = [];
        if (isConnected(youtubeChannel) && renderOutput?.video_url_30s) {
          const videoUrl = renderOutput.video_url_30s;
          uploads.push({
            platform: 'YouTube',
            run: () =>
              youtubeService.uploadVideo({
                channel: youtubeChannel,
                title: buildTitle(post, script30s, period),
                description: buildDescription({
                  lang: post.lang_code,
                  body: script30s.body_script,
                  hashtags: scriptOutput.hashtags,
                  period,
                }),
                videoUrl,
              }),
          });
        }
        if (isConnected(instagramChannel) && renderOutput?.video_url_30s) {
          const videoUrl = renderOutput.video_url_30s;
          uploads.push({
            platform: 'Instagram',
            run: () =>
              postViaContainer({
                sheetsService,
                task: post,
                platform: 'Instagram',
                uploader: {
                  createContainer: () =>
                    instagramService.createContainer({
                      channel: instagramChannel,
                      caption: buildDescription({
                        lang: post.lang_code,
                        body: script30s.hook_text,
                        hashtags: scriptOutput.hashtags,
                        period,
                      }),
                      videoUrl,
                    }),
                  waitUntilFinished: (containerId) =>
                    instagramService.waitUntilFinished(instagramChannel, containerId),
                  publishContainer: (containerId) =>
                    instagramService.publishContainer(instagramChannel, containerId),
                },
              }),
          });
        }

        if (isConnected(threadsChannel) && renderOutput?.video_url_30s) {
          const videoUrl = renderOutput.video_url_30s;
          uploads.push({
            platform: 'Threads',
            run: () =>
              postViaContainer({
                sheetsService,
                task: post,
                platform: 'Threads',
                uploader: {
                  createContainer: () =>
                    threadsService.createContainer({
                      channel: threadsChannel,
                      text: buildDescription({
                        lang: post.lang_code,
                        body: script30s.hook_text,
                        hashtags: scriptOutput.hashtags,
                        period,
                      }),
                      videoUrl,
                    }),
                  waitUntilFinished: (containerId) =>
                    threadsService.waitUntilFinished(threadsChannel, containerId),
                  publishContainer: (containerId) =>
                    threadsService.publishContainer(threadsChannel, containerId),
                },
              }),
          });
        }

        if (isConnected(facebookChannel) && renderOutput?.video_url_30s) {
          const videoUrl = renderOutput.video_url_30s;
          uploads.push({
            platform: 'Facebook',
            run: () =>
              facebookService.uploadVideo({
                channel: facebookChannel,
                description: buildDescription({
                  lang: post.lang_code,
                  body: script30s.hook_text,
                  hashtags: scriptOutput.hashtags,
                  period,
                }),
                videoUrl,
              }),
          });
        }

        const remaining = uploads.filter(
          (upload) => !done.some((ref) => ref.platform === upload.platform),
        );

        if (uploads.length === 0) {
          throw new Error(`No connected platform with a rendered video for ${post.task_id}`);
        }

        if (remaining.length === 0) {
          await sheetsService.markPosted(post.task_id, done);
          posted += 1;
          continue;
        }

        if (!isDispatchEnabledFor(post.lang_code)) {
          console.log(`Dry run: ${post.task_id} ready for ${uploads.length} upload(s)`);
          skipped += 1;
          continue;
        }

        // Each post id is written as soon as it exists, so a platform failing halfway through -
        // or the function running out of time - still leaves the earlier ones on the row and the
        // retry posts only what is missing, instead of publishing the same video twice. One
        // platform rejecting the video says nothing about the others, so all of them are attempted.
        const refs: PostedRef[] = [...done];
        let errored = false;
        let waiting = false;
        for (const upload of remaining) {
          try {
            refs.push({ platform: upload.platform, post_id: await upload.run() });
          } catch (uploadError) {
            const message = uploadError instanceof Error ? uploadError.message : 'Unknown error';
            if (uploadError instanceof PendingTranscodeError) {
              waiting = true;
              console.log(`${post.task_id} ${upload.platform}: ${message}`);
            } else {
              errored = true;
              console.error(`${post.task_id} ${upload.platform} failed:`, message);
            }
            continue;
          }
          const complete = refs.length === uploads.length;
          await sheetsService.markPosted(post.task_id, refs, complete ? 'Posted' : 'Error');
        }

        if (errored || waiting) {
          await sheetsService.markPosted(post.task_id, refs, 'Error');
          if (errored) failed += 1;
          else skipped += 1;
          continue;
        }
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
      dispatch_enabled: isDispatchEnabled(),
      dispatch_languages: dispatchLanguages(),
      due: duePosts.length,
      posted,
      failed,
      skipped,
      watchdog,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dispatch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
