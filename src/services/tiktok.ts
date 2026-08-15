import { optionalEnv, requireEnv } from '@/lib/env';
import { Channel, GoogleSheetsService } from './sheets';

const PUBLISH_INIT_ENDPOINT = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const TOKEN_ENDPOINT = 'https://open.tiktokapis.com/v2/oauth/token/';
/** Refresh a little early so a token never expires mid-upload. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

export interface TikTokUploadParams {
  channel: Channel;
  description: string;
  videoUrl: string;
}

interface TikTokTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TikTokInitResponse {
  data?: { publish_id?: string };
  error?: { code?: string; message?: string };
}

/**
 * Unaudited TikTok apps may only create private posts, so `SELF_ONLY` is the
 * default until the app passes content-posting audit.
 */
function privacyLevel(): string {
  return optionalEnv('TIKTOK_PRIVACY_LEVEL') ?? 'SELF_ONLY';
}

export class TikTokService {
  constructor(private sheets: GoogleSheetsService) {}

  /**
   * TikTok access tokens live 24h, so they are refreshed on demand and the
   * rotated pair is written back to the Channels sheet.
   */
  private async accessToken(channel: Channel): Promise<string> {
    const expiresAt = channel.tiktok_token_expires_at
      ? Date.parse(channel.tiktok_token_expires_at)
      : NaN;
    const stillValid =
      channel.tiktok_access_token &&
      Number.isFinite(expiresAt) &&
      expiresAt - EXPIRY_MARGIN_MS > Date.now();
    if (stillValid) return channel.tiktok_access_token as string;

    if (!channel.tiktok_refresh_token) {
      if (channel.tiktok_access_token) return channel.tiktok_access_token;
      throw new Error(`No TikTok tokens for channel "${channel.channel_id}"`);
    }

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: requireEnv('TIKTOK_CLIENT_KEY'),
        client_secret: requireEnv('TIKTOK_CLIENT_SECRET'),
        grant_type: 'refresh_token',
        refresh_token: channel.tiktok_refresh_token,
      }),
    });

    const payload = (await response.json()) as TikTokTokenResponse;
    if (!response.ok || !payload.access_token) {
      throw new Error(
        `TikTok token refresh failed (${response.status}): ${payload.error_description ?? payload.error ?? 'unknown error'}`,
      );
    }

    const expiry = new Date(Date.now() + (payload.expires_in ?? 86400) * 1000).toISOString();
    await this.sheets.updateChannelTokens(channel.channel_id, {
      tiktok_access_token: payload.access_token,
      tiktok_refresh_token: payload.refresh_token ?? channel.tiktok_refresh_token,
      tiktok_token_expires_at: expiry,
    });

    return payload.access_token;
  }

  async uploadVideo(params: TikTokUploadParams): Promise<string> {
    const accessToken = await this.accessToken(params.channel);

    // PULL_FROM_URL requires the rendered video's domain to be verified in the TikTok developer portal.
    const response = await fetch(PUBLISH_INIT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: params.description.slice(0, 2200),
          privacy_level: privacyLevel(),
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: params.videoUrl,
        },
      }),
    });

    const payload = (await response.json()) as TikTokInitResponse;
    if (!response.ok || payload.error?.code !== 'ok') {
      throw new Error(
        `TikTok publish failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`,
      );
    }

    const publishId = payload.data?.publish_id;
    if (!publishId) throw new Error('TikTok publish returned no publish_id');
    return publishId;
  }
}
