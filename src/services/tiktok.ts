import { Channel } from './sheets';

export interface TikTokUploadParams {
  channel: Channel;
  description: string;
  videoUrl: string;
}

export class TikTokService {
  async uploadVideo(params: TikTokUploadParams): Promise<void> {
    // Stub: upload via TikTok Content Posting API
    console.log(`Uploading to TikTok (${params.channel.account_handle}): ${params.description}`);
  }
}
