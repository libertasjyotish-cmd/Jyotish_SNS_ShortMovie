import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { InstagramService } from '@/services/instagram';
import { GoogleSheetsService, Language, Platform } from '@/services/sheets';
import { YouTubeService } from '@/services/youtube';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LANGUAGES: Language[] = ['ja', 'en', 'es', 'pt', 'id', 'ar'];
/** TikTok is not dispatched, so its rows are not worth reporting on. */
const PLATFORMS: Platform[] = ['YouTube', 'Instagram'];

interface ChannelStatus {
  lang_code: Language;
  platform: Platform;
  channel_id?: string;
  connected: boolean;
  account?: string;
  error?: string;
}

/**
 * Reports whether each language's channel is authorized, by reading the account back from
 * each platform. Posting stays gated behind `DISPATCH_ENABLED`, so this never uploads.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheets = new GoogleSheetsService();
    const youtube = new YouTubeService();
    const instagram = new InstagramService();
    const statuses: ChannelStatus[] = [];

    for (const lang of LANGUAGES) {
      for (const platform of PLATFORMS) {
        const channel = await sheets.getChannelConfig(lang, platform);
        if (!channel) continue;
        try {
          const account =
            platform === 'YouTube'
              ? await youtube.verifyChannel(channel)
              : await instagram.verifyChannel(channel);
          statuses.push({
            lang_code: lang,
            platform,
            channel_id: channel.channel_id,
            connected: true,
            account,
          });
        } catch (error) {
          statuses.push({
            lang_code: lang,
            platform,
            channel_id: channel.channel_id,
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return NextResponse.json({
      connected: statuses.filter((status) => status.connected).length,
      total: statuses.length,
      youtube_privacy_status: process.env.YOUTUBE_PRIVACY_STATUS ?? 'private',
      dispatch_enabled: process.env.DISPATCH_ENABLED === 'true',
      channels: statuses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Channel check failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
