import { isDispatchEnabledFor, isPlatformPaused } from "@/lib/dispatch-gate";
import { optionalEnv } from "@/lib/env";
import { ContainerFailedError } from "@/lib/media-container";
import { FacebookService } from "@/services/facebook";
import { InstagramService } from "@/services/instagram";
import {
  Channel,
  GoogleSheetsService,
  Language,
  StoryItem,
} from "@/services/sheets";

const AD_BASE = "https://storage.googleapis.com/jyotish-sns-renders/ads/final";

/** The report and My Page videos made for paid ads, one per day so each comes back weekly. */
const STORY_ADS: Partial<Record<Language, string[]>> = {
  ja: [
    "ad-yearly-d",
    "ad-career-d",
    "ad-karkundali-d",
    "ad-lifetime-d",
    "ad-karma-d",
    "ad-compat-d",
    "ad-premium-d",
  ],
};

/** 19:30 JST: an evening slot between the 18:00 and 21:00 Reels. */
const AD_STORY_UTC_MINUTES = 10 * 60 + 30;
const JST_OFFSET_MS = 9 * 3_600_000;
/** A story still unpublished this long after it was due is no longer about "today". */
const STORY_GIVE_UP_MS = 6 * 3_600_000;
const MAX_ATTEMPTS = 3;
/** The report videos start going out as stories on this JST date. */
const AD_STORIES_FROM = "2026-11-18";

export type StoryPlatform = StoryItem["platform"];

const STORY_PLATFORMS: StoryPlatform[] = ["Instagram", "Facebook"];

function storiesEnabled(platform: StoryPlatform): boolean {
  return (
    !isPlatformPaused(platform) &&
    (optionalEnv(`${platform.toUpperCase()}_SHARE_TO_STORY`) ?? "true") ===
      "true"
  );
}

function channelPaused(channel: Channel, now: Date): boolean {
  return Boolean(
    channel.posting_paused_until &&
    now.getTime() < Date.parse(channel.posting_paused_until),
  );
}

export function adStoryFor(
  lang: Language,
  jstDate: string,
): string | undefined {
  const ads = STORY_ADS[lang];
  if (!ads?.length) return undefined;
  const dayNumber = Math.floor(Date.parse(`${jstDate}T00:00:00Z`) / 86_400_000);
  return `${AD_BASE}/${ads[dayNumber % ads.length]}.mp4`;
}

/** Queues a Reel's video as a story on the platform that just published the Reel. */
export async function queueReelStory(
  sheets: GoogleSheetsService,
  taskId: string,
  lang: Language,
  videoUrl: string,
  platform: StoryPlatform,
  now = new Date(),
): Promise<void> {
  if (!storiesEnabled(platform)) return;
  await sheets.addStories([
    {
      story_id: `${taskId}-story`,
      lang_code: lang,
      platform,
      video_url: videoUrl,
      post_after: now.toISOString(),
      status: "Pending",
      attempts: 0,
    },
  ]);
}

async function queueAdStories(
  sheets: GoogleSheetsService,
  now: Date,
): Promise<void> {
  const jstDate = new Date(now.getTime() + JST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
  const due =
    Date.parse(`${jstDate}T00:00:00Z`) + AD_STORY_UTC_MINUTES * 60_000;
  if (jstDate < AD_STORIES_FROM) return;
  if (now.getTime() < due || now.getTime() > due + STORY_GIVE_UP_MS) return;

  for (const lang of Object.keys(STORY_ADS) as Language[]) {
    const videoUrl = adStoryFor(lang, jstDate);
    if (!videoUrl || !isDispatchEnabledFor(lang)) continue;
    await sheets.addStories(
      STORY_PLATFORMS.filter(storiesEnabled).map((platform) => ({
        story_id: `${jstDate}-${lang}-ad`,
        lang_code: lang,
        platform,
        video_url: videoUrl,
        post_after: new Date(due).toISOString(),
        status: "Pending",
        attempts: 0,
      })),
    );
  }
}

export interface StorySweepResult {
  posted: number;
  waiting: number;
  failed: number;
}

/**
 * Hands due stories to Instagram/Facebook and publishes the ones whose video is ready. Runs on
 * the follow-up dispatch passes, so a story goes out 10-30 minutes after it is queued without
 * any request waiting on transcoding.
 */
export async function runStorySweep(
  sheets: GoogleSheetsService,
  instagram: InstagramService,
  facebook: FacebookService,
  now = new Date(),
): Promise<StorySweepResult> {
  await queueAdStories(sheets, now);
  const result: StorySweepResult = { posted: 0, waiting: 0, failed: 0 };
  const channels = new Map<string, Channel | null>();

  const due = (await sheets.getStories()).filter(
    (story) =>
      story.status === "Pending" &&
      Date.parse(story.post_after) <= now.getTime() &&
      isDispatchEnabledFor(story.lang_code),
  );

  for (const story of due) {
    const fail = async (note: string) => {
      result.failed += 1;
      await sheets.updateStory(story.story_id, story.platform, {
        status: "Failed",
        note,
      });
    };
    if (now.getTime() - Date.parse(story.post_after) > STORY_GIVE_UP_MS) {
      await fail(story.note ? `expired: ${story.note}` : "expired");
      continue;
    }

    const key = `${story.lang_code}/${story.platform}`;
    if (!channels.has(key)) {
      channels.set(
        key,
        await sheets.getChannelConfig(story.lang_code, story.platform),
      );
    }
    const channel = channels.get(key);
    if (!channel) {
      await fail(`no ${story.platform} channel for ${story.lang_code}`);
      continue;
    }
    if (!storiesEnabled(story.platform) || channelPaused(channel, now)) {
      result.waiting += 1;
      continue;
    }

    try {
      if (!story.container_id) {
        const containerId =
          story.platform === "Instagram"
            ? await instagram.createStoryContainer(channel, story.video_url)
            : await facebook.createStoryUpload(channel, story.video_url);
        await sheets.updateStory(story.story_id, story.platform, {
          container_id: containerId,
        });
        result.waiting += 1;
        continue;
      }

      const ready =
        story.platform === "Instagram"
          ? (await instagram.containerStatus(channel, story.container_id)) ===
            "FINISHED"
          : await facebook.isStoryUploaded(channel, story.container_id);
      if (!ready) {
        result.waiting += 1;
        continue;
      }
      const mediaId =
        story.platform === "Instagram"
          ? await instagram.publishContainer(channel, story.container_id)
          : await facebook.publishStory(channel, story.container_id);
      await sheets.updateStory(story.story_id, story.platform, {
        status: "Posted",
        media_id: mediaId,
        note: "",
      });
      result.posted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(
        `story ${story.story_id}/${story.platform} failed:`,
        message,
      );
      const attempts = story.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await fail(message.slice(0, 300));
        continue;
      }
      await sheets.updateStory(story.story_id, story.platform, {
        attempts: String(attempts),
        note: message.slice(0, 300),
        ...(error instanceof ContainerFailedError ? { container_id: "" } : {}),
      });
      result.waiting += 1;
    }
  }
  return result;
}
