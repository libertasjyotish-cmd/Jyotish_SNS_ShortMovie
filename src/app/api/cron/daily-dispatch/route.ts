import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { buildDescription, YOUTUBE_COMMENT } from '@/lib/cta';
import { dispatchLanguages, isDispatchEnabled, isDispatchEnabledFor } from '@/lib/dispatch-gate';
import { ContainerFailedError, PendingTranscodeError } from '@/lib/media-container';
import { weekPeriodLabel } from '@/lib/period';
import { zodiacName } from '@/lib/zodiac-names';
import { runWatchdog } from '@/lib/watchdog-run';
import { buildYouTubeTitle } from '@/lib/youtube-seo';
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

/** How long new tasks may still be started, leaving the rest of `maxDuration` to finish one. */
const DISPATCH_BUDGET_MS = 200_000;
/** Tasks posted at once. A slot holds one task per language, so a run has to clear all of them. */
const DISPATCH_CONCURRENCY = 3;
/** A posting window that has been over for this long is never going to be published. */
const STALE_POST_DAYS = 3;

function isDue(scheduledPostTime: string, now: Date): boolean {
  const scheduled = new Date(scheduledPostTime);
  if (Number.isNaN(scheduled.getTime())) {
    throw new Error(`Invalid scheduled_post_time: "${scheduledPostTime}"`);
  }
  return scheduled.getTime() <= now.getTime();
}

/**
 * Platforms are onboarded one at a time, so a channel row without credentials is skipped, and a
 * row held back by `posting_paused_until` keeps its credentials but publishes nothing until then.
 *
 * TikTok is never dispatched: the Content Posting API app was rejected because TikTok does not
 * grant production access to apps that only publish to their own account, so its videos are
 * uploaded through the TikTok Studio UI instead.
 */
function isConnected(channel: Channel | null): channel is Channel {
  if (!channel) return false;
  if (channel.posting_paused_until && Date.now() < Date.parse(channel.posting_paused_until)) {
    return false;
  }
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

/**
 * In-channel follow-ups that must never cost the post itself: the upload joins the playlist of
 * its slot so viewers can walk the rest of the channel, and the site link is repeated as a
 * comment because Shorts hide the description. Either failing leaves the video published.
 */
async function addChannelSurfaces(args: {
  youtubeService: YouTubeService;
  channel: Channel;
  task: ContentQueue;
  videoId: string;
}): Promise<void> {
  const { youtubeService, channel, task, videoId } = args;
  const playlistId =
    task.target_type === 'Zodiac_Sign'
      ? channel.youtube_playlist_weekly
      : channel.youtube_playlist_theme;
  if (playlistId) {
    try {
      await youtubeService.addToPlaylist(channel, playlistId, videoId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${task.task_id} playlist ${playlistId} failed:`, message);
    }
  }
  try {
    await youtubeService.postComment(channel, videoId, YOUTUBE_COMMENT[task.lang_code]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${task.task_id} comment failed:`, message);
  }
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
    // Nothing else lets go of a task that was never posted, so its window closing is what ends it;
    // left Pending it makes every later run read it again.
    const held = await sheetsService.holdStalePosts(
      new Date(now.getTime() - STALE_POST_DAYS * 24 * 60 * 60 * 1000),
    );
    const pendingPosts = await sheetsService.getPendingPosts();
    // A language that is not dispatched keeps accumulating due tasks forever, and reading their
    // scripts, renders and channels costs the run its whole time budget before it reaches the
    // languages that do publish, so they are dropped before any per-task lookup.
    const duePosts = pendingPosts.filter(
      (post) => isDue(post.scheduled_post_time, now) && isDispatchEnabledFor(post.lang_code),
    );
    let posted = 0;
    let failed = 0;
    let skipped = 0;

    // A run killed by the platform timeout loses the status of whatever it was posting, so it
    // stops handing out new tasks while there is still time to finish the one in flight; the
    // tasks it did not reach stay Pending for the next window.
    const deadline = now.getTime() + DISPATCH_BUDGET_MS;
    const queue = [...duePosts];

    /**
     * Posting is almost entirely waiting on the platforms, so the tasks of a window are handed to
     * a few workers at once: serially, one task can spend minutes on transcodes and a window's
     * languages never fit in a single run, which pushes them into the next one indefinitely.
     */
    const worker = async (): Promise<void> => {
      for (let post = queue.shift(); post; post = queue.shift()) {
        if (Date.now() > deadline) {
          skipped += queue.length + 1;
          queue.length = 0;
          return;
        }
        try {
          const [scriptOutput, renderOutput] = await Promise.all([
            sheetsService.getScriptOutput(post.task_id),
            sheetsService.getRenderOutput(post.task_id),
          ]);
          if (!scriptOutput) throw new Error(`No script output for ${post.task_id}`);

          const script30s: GeneratedScript = JSON.parse(scriptOutput.script_30s_json);
          const period = postPeriod(post);
          const signName = zodiacName(post.zodiac_sign, post.lang_code);
          /** Captions open on the sign and the week, so a viewer knows at a glance whose reading it is. */
          const signedPeriod = [signName, period].filter(Boolean).join(' · ') || undefined;
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
              run: async () => {
                const videoId = await youtubeService.uploadVideo({
                  channel: youtubeChannel,
                  lang: post.lang_code,
                  title: buildYouTubeTitle({
                    lang: post.lang_code,
                    zodiacSign: signName,
                    hook: script30s.hook_text,
                    period,
                  }),
                  description: buildDescription({
                    lang: post.lang_code,
                    body: script30s.body_script,
                    hashtags: scriptOutput.hashtags,
                    period: signedPeriod,
                  }),
                  videoUrl,
                });
                await addChannelSurfaces({
                  youtubeService,
                  channel: youtubeChannel,
                  task: post,
                  videoId,
                });
                return videoId;
              },
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
                          period: signedPeriod,
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
                          period: signedPeriod,
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
            const description = buildDescription({
              lang: post.lang_code,
              body: script30s.hook_text,
              hashtags: scriptOutput.hashtags,
              period: signedPeriod,
            });
            uploads.push({
              platform: 'Facebook',
              run: () =>
                postViaContainer({
                  sheetsService,
                  task: post,
                  platform: 'Facebook',
                  uploader: {
                    createContainer: () =>
                      facebookService.createUploadSession({
                        channel: facebookChannel,
                        description,
                        videoUrl,
                      }),
                    waitUntilFinished: (videoId) =>
                      facebookService.waitUntilUploaded(facebookChannel, videoId),
                    publishContainer: (videoId) =>
                      facebookService.publishVideo(facebookChannel, videoId, description),
                  },
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

          // Waiting on a transcode is not a failure: the row stays Pending so the next run, minutes
          // later, publishes the container it already handed over.
          if (errored || waiting) {
            await sheetsService.markPosted(post.task_id, refs, errored ? 'Error' : 'Pending');
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
    };

    await Promise.all(Array.from({ length: DISPATCH_CONCURRENCY }, () => worker()));

    return NextResponse.json({
      status: 'Dispatch completed',
      dispatch_enabled: isDispatchEnabled(),
      dispatch_languages: dispatchLanguages(),
      due: duePosts.length,
      posted,
      failed,
      skipped,
      held: held.length,
      watchdog,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dispatch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
