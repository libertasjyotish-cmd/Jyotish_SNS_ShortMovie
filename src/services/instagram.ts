import { optionalEnv } from '@/lib/env';
import { ContainerFailedError } from '@/lib/media-container';
import { Channel } from './sheets';

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const STATUS_POLL_INTERVAL_MS = 5000;
/** Only a grace period: a container that is still transcoding is published by a later run. */
const STATUS_POLL_ATTEMPTS = 4;

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

/** `no-store` keeps Next from serving a cached transcode status, which never leaves PENDING. */
async function graphRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const payload = (await response.json()) as T & GraphError;
  if (!response.ok || payload.error) {
    throw new Error(
      `Instagram Graph API error (${response.status}): ${payload.error?.message ?? 'unknown error'}`,
    );
  }
  return payload;
}

function credentials(channel: Channel): { accessToken: string; igUserId: string } {
  const accessToken = channel.ig_access_token;
  const igUserId = channel.ig_user_id;
  if (!accessToken || !igUserId) {
    throw new Error(`Missing ig_access_token / ig_user_id for channel "${channel.channel_id}"`);
  }
  return { accessToken, igUserId };
}

export class InstagramService {
  /** Reads the account back, so a stale 60-day token is found before a posting window. */
  async verifyChannel(channel: Channel): Promise<string> {
    const accessToken = channel.ig_access_token;
    const igUserId = channel.ig_user_id;
    if (!accessToken || !igUserId) {
      throw new Error(`Missing ig_access_token / ig_user_id for channel "${channel.channel_id}"`);
    }
    const account = await graphRequest<{ username?: string }>(
      `${GRAPH_BASE}/${igUserId}?fields=username&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!account.username) throw new Error('Instagram returned no username');
    return `@${account.username}`;
  }

  /**
   * The public URL of a published Reel. Instagram has no delete endpoint, so retiring one is
   * done on this page in the account UI.
   */
  async permalink(channel: Channel, mediaId: string): Promise<string> {
    const accessToken = channel.ig_access_token;
    if (!accessToken) {
      throw new Error(`Missing ig_access_token for channel "${channel.channel_id}"`);
    }
    const media = await graphRequest<{ permalink?: string }>(
      `${GRAPH_BASE}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!media.permalink) throw new Error(`Instagram media ${mediaId} has no permalink`);
    return media.permalink;
  }

  /**
   * Hands the rendered video to Instagram, which downloads and transcodes it on its own
   * servers. That can take several minutes, so the container id is returned instead of waited
   * on: the caller stores it and publishes once {@link containerStatus} reports FINISHED.
   */
  async createContainer(params: InstagramUploadParams): Promise<string> {
    const { accessToken, igUserId } = credentials(params.channel);

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

    return container.id;
  }

  /**
   * Shares the same rendered video as a Story, which expires after 24 hours and is added next to
   * the existing ones rather than replacing them. The Graph API publishes no stickers, so the
   * link has to stay in the profile.
   */
  async shareToStory(channel: Channel, videoUrl: string): Promise<string> {
    const { accessToken, igUserId } = credentials(channel);

    const container = await graphRequest<{ id: string }>(`${GRAPH_BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'STORIES',
        video_url: videoUrl,
        access_token: accessToken,
      }),
    });

    if (!(await this.waitUntilFinished(channel, container.id))) {
      throw new Error(`Instagram story container ${container.id} is still transcoding`);
    }
    return this.publishContainer(channel, container.id);
  }

  /** Throws when Instagram gave up on the container, so the caller creates a new one. */
  async containerStatus(channel: Channel, containerId: string): Promise<'FINISHED' | 'PENDING'> {
    const { accessToken } = credentials(channel);
    const status = await graphRequest<{ status_code?: string; status?: string }>(
      `${GRAPH_BASE}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
    );

    if (status.status_code === 'FINISHED') return 'FINISHED';
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new ContainerFailedError(
        `Instagram media container ${containerId} failed: ${status.status}`,
      );
    }
    return 'PENDING';
  }

  /** Polls for the short grace period a posting run can afford before it has to move on. */
  async waitUntilFinished(channel: Channel, containerId: string): Promise<boolean> {
    const attempts = Number(optionalEnv('INSTAGRAM_STATUS_POLL_ATTEMPTS')) || STATUS_POLL_ATTEMPTS;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if ((await this.containerStatus(channel, containerId)) === 'FINISHED') return true;
      await sleep(STATUS_POLL_INTERVAL_MS);
    }
    return false;
  }

  async publishContainer(channel: Channel, containerId: string): Promise<string> {
    const { accessToken, igUserId } = credentials(channel);
    const published = await graphRequest<{ id: string }>(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
    });

    return published.id;
  }
}
