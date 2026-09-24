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

/** Each language may use its own Google Cloud project to get a separate upload quota. */
function authorize(channel: Channel) {
  const refreshToken = channel.youtube_refresh_token;
  if (!refreshToken) {
    throw new Error(`No youtube_refresh_token for channel "${channel.channel_id}"`);
  }
  const auth = new google.auth.OAuth2(
    channel.youtube_client_id ?? requireEnv('YOUTUBE_CLIENT_ID'),
    channel.youtube_client_secret ?? requireEnv('YOUTUBE_CLIENT_SECRET'),
  );
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

export class YouTubeService {
  /** Exchanges the refresh token and reads the channel back, without uploading anything. */
  async verifyChannel(channel: Channel): Promise<string> {
    const youtube = google.youtube({ version: 'v3', auth: authorize(channel) });
    const response = await youtube.channels.list({ part: ['snippet'], mine: true });
    const found = response.data.items?.[0];
    if (!found?.id) throw new Error('YouTube returned no channel for these credentials');
    return `${found.snippet?.title ?? found.id} (${found.id})`;
  }

  async uploadVideo(params: YouTubeUploadParams): Promise<string> {
    const auth = authorize(params.channel);

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

  /** Playlists are the only in-channel navigation Shorts support, so every upload joins one. */
  async addToPlaylist(channel: Channel, playlistId: string, videoId: string): Promise<void> {
    const youtube = google.youtube({ version: 'v3', auth: authorize(channel) });
    await youtube.playlistItems.insert({
      part: ['snippet'],
      requestBody: {
        snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } },
      },
    });
  }

  /**
   * Shorts hide the description, so the site link is repeated as a comment. Pinning it needs
   * YouTube Studio: the API exposes no pin, and the channel owner's comment sorts to the top.
   */
  async postComment(channel: Channel, videoId: string, text: string): Promise<string> {
    const youtube = google.youtube({ version: 'v3', auth: authorize(channel) });
    const result = await youtube.commentThreads.insert({
      part: ['snippet'],
      requestBody: {
        snippet: { videoId, topLevelComment: { snippet: { textOriginal: text } } },
      },
    });
    const commentId = result.data.id;
    if (!commentId) throw new Error('YouTube comment returned no id');
    return commentId;
  }

  /**
   * Hides a reading whose week has passed. The video is made private rather than deleted, so
   * the channel keeps its watch history and the file can be brought back if needed.
   */
  async unlistVideo(channel: Channel, videoId: string): Promise<void> {
    const youtube = google.youtube({ version: 'v3', auth: authorize(channel) });
    await youtube.videos.update({
      part: ['status'],
      requestBody: { id: videoId, status: { privacyStatus: 'private' } },
    });
  }
}
