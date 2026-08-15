import { Readable } from 'stream';
import { google } from 'googleapis';
import { optionalEnv, requireEnv } from '@/lib/env';
import { Channel } from './sheets';

export interface YouTubeUploadParams {
  channel: Channel;
  title: string;
  description: string;
  videoUrl: string;
}

/** Defaults to `private` so a misconfigured run never publishes to a live channel. */
function privacyStatus(): string {
  return optionalEnv('YOUTUBE_PRIVACY_STATUS') ?? 'private';
}

export class YouTubeService {
  async uploadVideo(params: YouTubeUploadParams): Promise<string> {
    const refreshToken = params.channel.youtube_refresh_token;
    if (!refreshToken) {
      throw new Error(`No youtube_refresh_token for channel "${params.channel.channel_id}"`);
    }

    const auth = new google.auth.OAuth2(
      requireEnv('YOUTUBE_CLIENT_ID'),
      requireEnv('YOUTUBE_CLIENT_SECRET'),
    );
    auth.setCredentials({ refresh_token: refreshToken });

    const response = await fetch(params.videoUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download rendered video (${response.status})`);
    }

    const youtube = google.youtube({ version: 'v3', auth });
    const result = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: params.title,
          description: params.description,
          categoryId: '22',
        },
        status: {
          privacyStatus: privacyStatus(),
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        mimeType: 'video/mp4',
        body: Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
      },
    });

    const videoId = result.data.id;
    if (!videoId) throw new Error('YouTube upload returned no video id');
    return videoId;
  }
}
