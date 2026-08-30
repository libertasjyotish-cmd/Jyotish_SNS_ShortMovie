import { requireEnv } from './env';

export const TIKTOK_STATE_COOKIE = 'tiktok_oauth_state';

export function tiktokRedirectUri(): string {
  return `${requireEnv('PUBLIC_BASE_URL').replace(/\/$/, '')}/api/tiktok/callback`;
}
