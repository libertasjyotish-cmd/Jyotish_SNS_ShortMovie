import { FacebookService } from '@/services/facebook';
import { InstagramService } from '@/services/instagram';
import { GoogleSheetsService, Channel, Language, LANGUAGES, Platform } from '@/services/sheets';
import { ThreadsService } from '@/services/threads';
import { YouTubeService } from '@/services/youtube';

/** TikTok is not dispatched, so its rows are not worth reporting on. */
const PLATFORMS: Platform[] = ['YouTube', 'Instagram', 'Threads', 'Facebook'];

const DAY_MS = 86_400_000;

/** Google sometimes answers a valid token with one 401, so a single failure is not an outage. */
const VERIFY_ATTEMPTS = 3;
const VERIFY_RETRY_MS = 1_500;

export interface ChannelStatus {
  lang_code: Language;
  platform: Platform;
  channel_id?: string;
  connected: boolean;
  account?: string;
  error?: string;
  /** False while the row has no credential yet, so an unfinished setup is not an outage. */
  configured: boolean;
  /** Days until the stored token expires; absent when the platform's token has no expiry. */
  expires_in_days?: number;
}

function isConfigured(channel: Channel, platform: Platform): boolean {
  if (platform === 'YouTube') return Boolean(channel.youtube_refresh_token);
  if (platform === 'Instagram') return Boolean(channel.ig_access_token);
  if (platform === 'Threads') return Boolean(channel.threads_access_token);
  if (platform === 'Facebook') return Boolean(channel.fb_page_access_token);
  return Boolean(channel.tiktok_access_token);
}

function expiresInDays(channel: Channel, platform: Platform): number | undefined {
  const expiry = platform === 'Threads' ? channel.threads_token_expires_at : undefined;
  if (!expiry) return undefined;
  const at = Date.parse(expiry);
  if (!Number.isFinite(at)) return undefined;
  return Math.floor((at - Date.now()) / DAY_MS);
}

/**
 * Reads every language's account back from its platform, so a revoked or expired token is found
 * outside a posting window. Verification is read-only and never uploads.
 */
export async function collectChannelStatuses(): Promise<ChannelStatus[]> {
  const sheets = new GoogleSheetsService();
  const youtube = new YouTubeService();
  const instagram = new InstagramService();
  const threads = new ThreadsService(sheets);
  const facebook = new FacebookService();
  const statuses: ChannelStatus[] = [];

  for (const lang of LANGUAGES) {
    for (const platform of PLATFORMS) {
      const channel = await sheets.getChannelConfig(lang, platform);
      if (!channel) continue;
      const verify = async (): Promise<string> => {
        if (platform === 'YouTube') return youtube.verifyChannel(channel);
        if (platform === 'Threads') return threads.verifyChannel(channel);
        if (platform === 'Facebook') return facebook.verifyChannel(channel);
        return instagram.verifyChannel(channel);
      };
      try {
        let account: string | undefined;
        let lastError: unknown;
        for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt += 1) {
          try {
            account = await verify();
            break;
          } catch (error) {
            lastError = error;
            if (attempt < VERIFY_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, VERIFY_RETRY_MS));
            }
          }
        }
        if (account === undefined) throw lastError;
        statuses.push({
          lang_code: lang,
          platform,
          channel_id: channel.channel_id,
          connected: true,
          account,
          configured: true,
          expires_in_days: expiresInDays(channel, platform),
        });
      } catch (error) {
        statuses.push({
          lang_code: lang,
          platform,
          channel_id: channel.channel_id,
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          configured: isConfigured(channel, platform),
          expires_in_days: expiresInDays(channel, platform),
        });
      }
    }
  }

  return statuses;
}
