import { Language } from './sheets';

export class TikTokService {
  async publishVideo(videoUrl: string, language: Language, metadata: any): Promise<void> {
    console.log(`Publishing Pattern B to TikTok Language Account: ${language}`);
  }

  async uploadVideo(params: { description: string, videoUrl: string }): Promise<void> {
    console.log(`Uploading to TikTok: ${params.description}`);
  }
}
