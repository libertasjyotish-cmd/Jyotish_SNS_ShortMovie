import { optionalEnv } from '@/lib/env';
import { Channel } from './sheets';

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const STATUS_POLL_INTERVAL_MS = 5000;
const STATUS_POLL_ATTEMPTS = 24;

export interface InstagramUploadParams {
  channel: Channel;
  caption: string;
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
      `Instagram Graph API error (${response.status}): ${payload.error?.message ?? 'unknown error'}`,
    );
  }
  return payload;
}

export class InstagramService {
  /**
   * Reels are published in two steps: create a media container from the video
   * URL, wait until Instagram finishes downloading it, then publish it.
   */
  async uploadVideo(params: InstagramUploadParams): Promise<string> {
    const accessToken = params.channel.ig_access_token;
    const igUserId = params.channel.ig_user_id;
    if (!accessToken || !igUserId) {
      throw new Error(
        `Missing ig_access_token / ig_user_id for channel "${params.channel.channel_id}"`,
      );
    }

    const container = await graphRequest<{ id: string }>(`${GRAPH_BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: params.videoUrl,
        caption: params.caption.slice(0, 2200),
        share_to_feed: (optionalEnv('INSTAGRAM_SHARE_TO_FEED') ?? 'true') === 'true',
        access_token: accessToken,
      }),
    });

    await this.waitUntilFinished(container.id, accessToken);

    const published = await graphRequest<{ id: string }>(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
    });

    return published.id;
  }

  private async waitUntilFinished(containerId: string, accessToken: string): Promise<void> {
    for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt += 1) {
      const status = await graphRequest<{ status_code?: string; status?: string }>(
        `${GRAPH_BASE}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
      );

      if (status.status_code === 'FINISHED') return;
      if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
        throw new Error(`Instagram media container ${containerId} failed: ${status.status}`);
      }
      await sleep(STATUS_POLL_INTERVAL_MS);
    }

    throw new Error(`Instagram media container ${containerId} was not ready in time`);
  }
}
