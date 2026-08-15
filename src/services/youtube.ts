import { Channel } from './sheets';

export interface YouTubeUploadParams {
  channel: Channel;
  title: string;
  description: string;
  videoUrl: string;
}

export class YouTubeService {
  async uploadVideo(params: YouTubeUploadParams): Promise<void> {
    // Stub: upload to YouTube Shorts via YouTube Data API v3
    console.log(`Uploading to YouTube (${params.channel.account_handle}): ${params.title}`);
  }
}
