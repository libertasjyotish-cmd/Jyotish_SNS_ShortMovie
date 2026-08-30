import { optionalEnv, requireEnv } from '@/lib/env';
import { Channel, GoogleSheetsService } from './sheets';

const PUBLISH_INIT_ENDPOINT = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const INBOX_INIT_ENDPOINT = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';
const CREATOR_INFO_ENDPOINT = 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/';
const USER_INFO_ENDPOINT = 'https://open.tiktokapis.com/v2/user/info/';
const AUTHORIZE_ENDPOINT = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_ENDPOINT = 'https://open.tiktokapis.com/v2/oauth/token/';
/** Refresh a little early so a token never expires mid-upload. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/** `video.publish` is what allows posting straight to the profile (Direct Post). */
export const TIKTOK_SCOPES = ['user.info.basic', 'video.upload', 'video.publish'];

export interface TikTokUploadParams {
  channel: Channel;
  description: string;
  videoUrl: string;
  /** Omitted for the daily pipeline, which falls back to TIKTOK_PRIVACY_LEVEL. */
  postOptions?: TikTokPostOptions;
  /** Delivers the video to the app inbox as a draft instead of posting it. */
  draft?: boolean;
}

/**
 * Mirrors the choices TikTok requires the publisher UI to expose before a
 * direct post: audience, interaction switches and commercial disclosure.
 */
export interface TikTokPostOptions {
  privacyLevel: string;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  /** Content promotes the creator's own business. */
  brandOrganicToggle: boolean;
  /** Content is a paid partnership with a third-party brand. */
  brandContentToggle: boolean;
}

export interface TikTokCreatorInfo {
  creatorNickname: string;
  creatorUsername: string;
  creatorAvatarUrl?: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
}

export interface TikTokUserInfo {
  displayName: string;
  avatarUrl?: string;
}

export interface TikTokTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
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

interface TikTokCreatorInfoResponse {
  data?: {
    creator_nickname?: string;
    creator_username?: string;
    creator_avatar_url?: string;
    privacy_level_options?: string[];
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
    max_video_post_duration_sec?: number;
  };
  error?: { code?: string; message?: string };
}

interface TikTokUserInfoResponse {
  data?: { user?: { display_name?: string; avatar_url?: string } };
  error?: { code?: string; message?: string };
}

/** Consent screen the admin page sends the account owner to. */
export function tiktokAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_key: requireEnv('TIKTOK_CLIENT_KEY'),
    scope: TIKTOK_SCOPES.join(','),
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

export async function exchangeTikTokCode(
  code: string,
  redirectUri: string,
): Promise<TikTokTokens> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: requireEnv('TIKTOK_CLIENT_KEY'),
      client_secret: requireEnv('TIKTOK_CLIENT_SECRET'),
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  const payload = (await response.json()) as TikTokTokenResponse;
  if (!response.ok || !payload.access_token || !payload.refresh_token) {
    throw new Error(
      `TikTok code exchange failed (${response.status}): ${payload.error_description ?? payload.error ?? 'unknown error'}`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 86400) * 1000).toISOString(),
  };
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
  async accessToken(channel: Channel): Promise<string> {
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

  /** Nickname and avatar of the connected account, for the admin page. */
  async userInfo(channel: Channel): Promise<TikTokUserInfo> {
    const accessToken = await this.accessToken(channel);
    const url = `${USER_INFO_ENDPOINT}?fields=display_name,avatar_url`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payload = (await response.json()) as TikTokUserInfoResponse;
    if (!response.ok || !payload.data?.user) {
      throw new Error(
        `TikTok user info failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`,
      );
    }

    return {
      displayName: payload.data.user.display_name ?? '',
      avatarUrl: payload.data.user.avatar_url,
    };
  }

  /**
   * TikTok requires the audience options and interaction switches shown before
   * a direct post to come from this endpoint rather than being hard-coded.
   */
  async creatorInfo(channel: Channel): Promise<TikTokCreatorInfo> {
    const accessToken = await this.accessToken(channel);
    const response = await fetch(CREATOR_INFO_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    });

    const payload = (await response.json()) as TikTokCreatorInfoResponse;
    if (!response.ok || payload.error?.code !== 'ok' || !payload.data) {
      throw new Error(
        `TikTok creator info failed (${response.status}): ${payload.error?.message ?? 'unknown error'}`,
      );
    }

    return {
      creatorNickname: payload.data.creator_nickname ?? '',
      creatorUsername: payload.data.creator_username ?? '',
      creatorAvatarUrl: payload.data.creator_avatar_url,
      privacyLevelOptions: payload.data.privacy_level_options ?? [],
      commentDisabled: payload.data.comment_disabled ?? false,
      duetDisabled: payload.data.duet_disabled ?? false,
      stitchDisabled: payload.data.stitch_disabled ?? false,
      maxVideoPostDurationSec: payload.data.max_video_post_duration_sec ?? 0,
    };
  }

  async uploadVideo(params: TikTokUploadParams): Promise<string> {
    const accessToken = await this.accessToken(params.channel);
    const options = params.postOptions;

    const postInfo = {
      title: params.description.slice(0, 2200),
      privacy_level: options?.privacyLevel ?? privacyLevel(),
      disable_duet: options?.disableDuet ?? false,
      disable_comment: options?.disableComment ?? false,
      disable_stitch: options?.disableStitch ?? false,
      brand_organic_toggle: options?.brandOrganicToggle ?? false,
      brand_content_toggle: options?.brandContentToggle ?? false,
    };

    // PULL_FROM_URL requires the rendered video's domain to be verified in the TikTok developer portal.
    const response = await fetch(params.draft ? INBOX_INIT_ENDPOINT : PUBLISH_INIT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        ...(params.draft ? {} : { post_info: postInfo }),
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
