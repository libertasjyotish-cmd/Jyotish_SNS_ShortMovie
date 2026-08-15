import { Channel } from './sheets';

export interface InstagramUploadParams {
  channel: Channel;
  caption: string;
  videoUrl: string;
}

export class InstagramService {
  async uploadVideo(params: InstagramUploadParams): Promise<void> {
    // Stub: publish a Reel via the Instagram Graph API
    console.log(`Uploading to Instagram (${params.channel.account_handle}): ${params.caption}`);
  }
}
