/**
 * Lists which language channels may carry a custom thumbnail. A thumbnail is what a Short is
 * shown with in search, so a channel that is not phone verified silently loses the keyword
 * image. Reading the eligibility costs 1 quota unit per channel and uploads nothing.
 */
import { LANGUAGES } from '@/lib/languages';
import { GoogleSheetsService } from '@/services/sheets';
import { YouTubeService } from '@/services/youtube';

async function main() {
  const sheets = new GoogleSheetsService();
  const youtube = new YouTubeService();

  for (const lang of LANGUAGES) {
    const channel = await sheets.getChannelConfig(lang, 'YouTube');
    if (!channel?.youtube_refresh_token) {
      console.log(`${lang}: not configured`);
      continue;
    }
    try {
      const status = await youtube.featureStatus(channel);
      const thumbnails = status.longUploadsStatus === 'allowed' ? 'thumbnail OK' : 'thumbnail BLOCKED';
      console.log(`${lang}: ${thumbnails} (${status.longUploadsStatus}) ${status.title}`);
    } catch (error) {
      console.log(`${lang}: check failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}

void main();
