import { threadsCredentials } from '@/lib/threads-oauth';
import { Channel, GoogleSheetsService } from './sheets';

const AUTHORIZE_ENDPOINT = 'https://threads.com/oauth/authorize';
const GRAPH_BASE = 'https://graph.threads.net';
const API_BASE = `${GRAPH_BASE}/v1.0`;
const STATUS_POLL_INTERVAL_MS = 10000;
const STATUS_POLL_ATTEMPTS = 30;
/** Refresh well before expiry, so a few failed daily checks still leave room to recover. */
const EXPIRY_MARGIN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * `threads_content_publish` is what allows posting to the profile, `threads_delete` what allows
 * taking a reading down once its week is over. A token minted before the delete scope existed
 * keeps working for posting and fails only on deletion, so it has to be re-authorized.
 */
export const THREADS_SCOPES = ['threads_basic', 'threads_content_publish', 'threads_delete'];

export interface ThreadsTokens {
  accessToken: string;
  userId: string;
  expiresAt: string;
}

export interface ThreadsUploadParams {
  channel: Channel;
  text: string;
  videoUrl: string;
}

interface ThreadsError {
  error?: { message?: string; error_user_msg?: string };
  error_message?: string;
  error_type?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & ThreadsError;
  if (!response.ok || payload.error) {
    const message =
      payload.error?.error_user_msg ||
      payload.error?.message ||
      payload.error_message ||
      'unknown error';
    throw new Error(`Threads API error (${response.status}): ${message}`);
  }
  return payload;
}

function expiresAt(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

export function threadsAuthorizeUrl(redirectUri: string, state: string): string {
  const { appId } = threadsCredentials();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: THREADS_SCOPES.join(','),
    response_type: 'code',
    state,
  });
  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

/**
 * Trades the consent code for a 60-day token: the code buys a one-hour token,
 * which is immediately exchanged so the pipeline never needs a browser again.
 */
export async function exchangeThreadsCode(code: string, redirectUri: string): Promise<ThreadsTokens> {
  const { appId, appSecret } = threadsCredentials();
  const short = await request<{ access_token: string; user_id: number | string }>(
    `${GRAPH_BASE}/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }).toString(),
    },
  );

  const long = await request<{ access_token: string; expires_in: number }>(
    `${GRAPH_BASE}/access_token?${new URLSearchParams({
      grant_type: 'th_exchange_token',
      client_secret: appSecret,
      access_token: short.access_token,
    }).toString()}`,
  );

  return {
    accessToken: long.access_token,
    userId: String(short.user_id),
    expiresAt: expiresAt(long.expires_in),
  };
}

export class ThreadsService {
  constructor(private readonly sheets = new GoogleSheetsService()) {}

  /** Reads the profile back, so a stale 60-day token is found before a posting window. */
  async verifyChannel(channel: Channel): Promise<string> {
    const accessToken = await this.accessTokenFor(channel);
    const me = await request<{ username?: string }>(
      `${API_BASE}/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!me.username) throw new Error('Threads returned no username');
    return `@${me.username}`;
  }

  /**
   * Videos are published in two steps: create a container from the video URL,
   * wait until Threads finishes downloading it, then publish it.
   */
  async uploadVideo(params: ThreadsUploadParams): Promise<string> {
    const accessToken = await this.accessTokenFor(params.channel);
    const userId = params.channel.threads_user_id;
    if (!userId) {
      throw new Error(`Missing threads_user_id for channel "${params.channel.channel_id}"`);
    }

    const container = await request<{ id: string }>(`${API_BASE}/${userId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        media_type: 'VIDEO',
        video_url: params.videoUrl,
        text: params.text.slice(0, 500),
        access_token: accessToken,
      }).toString(),
    });

    await this.waitUntilFinished(container.id, accessToken);

    const published = await request<{ id: string }>(`${API_BASE}/${userId}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: container.id,
        access_token: accessToken,
      }).toString(),
    });

    return published.id;
  }

  /** Removes a reading whose week has passed; Threads allows 100 deletions a day per profile. */
  async deletePost(channel: Channel, mediaId: string): Promise<void> {
    const accessToken = await this.accessTokenFor(channel);
    await request<{ success?: boolean }>(
      `${API_BASE}/${mediaId}?access_token=${encodeURIComponent(accessToken)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Long-lived tokens last 60 days and can only be refreshed while valid, so a
   * token close to expiry is rotated and written back to the channel's row.
   */
  private async accessTokenFor(channel: Channel): Promise<string> {
    const accessToken = channel.threads_access_token;
    if (!accessToken) {
      throw new Error(`Missing threads_access_token for channel "${channel.channel_id}"`);
    }

    const expiry = channel.threads_token_expires_at
      ? new Date(channel.threads_token_expires_at).getTime()
      : NaN;
    if (Number.isNaN(expiry) || expiry - Date.now() > EXPIRY_MARGIN_MS) return accessToken;

    const refreshed = await request<{ access_token: string; expires_in: number }>(
      `${GRAPH_BASE}/refresh_access_token?${new URLSearchParams({
        grant_type: 'th_refresh_token',
        access_token: accessToken,
      }).toString()}`,
    );
    await this.sheets.updateChannelTokens(channel.channel_id, {
      threads_access_token: refreshed.access_token,
      threads_token_expires_at: expiresAt(refreshed.expires_in),
    });
    return refreshed.access_token;
  }

  private async waitUntilFinished(containerId: string, accessToken: string): Promise<void> {
    for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt += 1) {
      const status = await request<{ status?: string; error_message?: string }>(
        `${API_BASE}/${containerId}?fields=status,error_message&access_token=${encodeURIComponent(accessToken)}`,
      );

      if (status.status === 'FINISHED' || status.status === 'PUBLISHED') return;
      if (status.status === 'ERROR' || status.status === 'EXPIRED') {
        throw new Error(
          `Threads media container ${containerId} failed: ${status.error_message ?? status.status}`,
        );
      }
      await sleep(STATUS_POLL_INTERVAL_MS);
    }

    throw new Error(`Threads media container ${containerId} was not ready in time`);
  }
}
