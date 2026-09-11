import { requireEnv } from './env';

export const FACEBOOK_STATE_COOKIE = 'facebook_oauth_state';

/** The Meta app's own pair, shared with Instagram Graph API (Threads uses a separate one). */
export function facebookCredentials(): { appId: string; appSecret: string } {
  return {
    appId: requireEnv('FACEBOOK_APP_ID'),
    appSecret: requireEnv('FACEBOOK_APP_SECRET'),
  };
}

export function facebookRedirectUri(): string {
  return `${requireEnv('PUBLIC_BASE_URL').replace(/\/$/, '')}/api/admin/facebook/callback`;
}
