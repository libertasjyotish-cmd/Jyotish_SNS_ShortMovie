import { Channel } from "./sheets";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const RUPLOAD_BASE = `https://rupload.facebook.com/video-upload/${GRAPH_VERSION}`;
const STATUS_POLL_INTERVAL_MS = 5000;
const STATUS_POLL_ATTEMPTS = 24;

export interface FacebookUploadParams {
  channel: Channel;
  description: string;
  videoUrl: string;
}

interface GraphError {
  error?: { message?: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & GraphError;
  if (!response.ok || payload.error) {
    throw new Error(
      `Facebook Graph API error (${response.status}): ${payload.error?.message ?? "unknown error"}`,
    );
  }
  return payload;
}

function credentials(channel: Channel): {
  pageId: string;
  accessToken: string;
} {
  const pageId = channel.fb_page_id;
  const accessToken = channel.fb_page_access_token;
  if (!pageId || !accessToken) {
    throw new Error(
      `Missing fb_page_id / fb_page_access_token for channel "${channel.channel_id}"`,
    );
  }
  return { pageId, accessToken };
}

export class FacebookService {
  /** Reads the page back, so an expired page token is found before a posting window. */
  async verifyChannel(channel: Channel): Promise<string> {
    const { pageId, accessToken } = credentials(channel);
    const page = await graphRequest<{ name?: string }>(
      `${GRAPH_BASE}/${pageId}?fields=name&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!page.name) throw new Error("Facebook returned no page name");
    return page.name;
  }

  /**
   * Reels use the resumable upload flow: start a session, hand the public video URL to the
   * upload host, then finish it as PUBLISHED once processing succeeds.
   */
  async uploadVideo(params: FacebookUploadParams): Promise<string> {
    const { pageId, accessToken } = credentials(params.channel);

    const session = await graphRequest<{ video_id: string }>(
      `${GRAPH_BASE}/${pageId}/video_reels`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_phase: "start",
          access_token: accessToken,
        }),
      },
    );

    await graphRequest<{ success?: boolean }>(
      `${RUPLOAD_BASE}/${session.video_id}`,
      {
        method: "POST",
        headers: {
          Authorization: `OAuth ${accessToken}`,
          file_url: params.videoUrl,
        },
      },
    );

    await this.waitUntilFinished(session.video_id, accessToken);

    await graphRequest<{ success?: boolean }>(
      `${GRAPH_BASE}/${pageId}/video_reels?` +
        new URLSearchParams({
          upload_phase: "finish",
          video_id: session.video_id,
          video_state: "PUBLISHED",
          description: params.description.slice(0, 2200),
          access_token: accessToken,
        }),
      { method: "POST" },
    );

    return session.video_id;
  }

  private async waitUntilFinished(
    videoId: string,
    accessToken: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt += 1) {
      const status = await graphRequest<{
        status?: {
          uploading_phase?: { status?: string };
          processing_phase?: { status?: string };
        };
      }>(
        `${GRAPH_BASE}/${videoId}?fields=status&access_token=${encodeURIComponent(accessToken)}`,
      );

      const uploading = status.status?.uploading_phase?.status;
      const processing = status.status?.processing_phase?.status;
      if (uploading === "error" || processing === "error") {
        throw new Error(
          `Facebook Reel ${videoId} failed during upload or processing`,
        );
      }
      if (uploading === "complete" && processing === "complete") return;
      await sleep(STATUS_POLL_INTERVAL_MS);
    }

    throw new Error(`Facebook Reel ${videoId} was not ready in time`);
  }
}
