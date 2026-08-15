import { optionalEnv } from '@/lib/env';
import { Channel } from './sheets';

const PUBLISH_INIT_ENDPOINT = 'https://open.tiktokapis.com/v2/post/publish/video/init/';

export interface TikTokUploadParams {
  channel: Channel;
  description: string;
  videoUrl: string;
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
  async uploadVideo(params: TikTokUploadParams): Promise<string> {
    const accessToken = params.channel.tiktok_access_token;
    if (!accessToken) {
      throw new Error(`No tiktok_access_token for channel "${params.channel.channel_id}"`);
    }

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
