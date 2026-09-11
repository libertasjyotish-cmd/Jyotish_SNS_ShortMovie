import { requireEnv } from './env';

export const THREADS_STATE_COOKIE = 'threads_oauth_state';

/** The Threads app ID / secret are separate from the Meta app's own pair. */
export function threadsCredentials(): { appId: string; appSecret: string } {
  return {
    appId: requireEnv('THREADS_APP_ID'),
    appSecret: requireEnv('THREADS_APP_SECRET'),
  };
}

export function threadsRedirectUri(): string {
  return `${requireEnv('PUBLIC_BASE_URL').replace(/\/$/, '')}/api/admin/threads/callback`;
}
