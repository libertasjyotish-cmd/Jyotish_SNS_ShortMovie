import { headers } from 'next/headers';

import { optionalEnv, requireEnv } from './env';

export const TIKTOK_STATE_COOKIE = 'tiktok_oauth_state';

/**
 * The Sandbox app has its own credentials and its own registered redirect URI,
 * so requests arriving on the sandbox host are served with the sandbox pair.
 */
export function isSandboxRequest(): boolean {
  const base = optionalEnv('TIKTOK_SANDBOX_BASE_URL');
  if (!base) return false;
  try {
    return headers().get('host') === new URL(base).host;
  } catch {
    return false;
  }
}

export function tiktokCredentials(): { clientKey: string; clientSecret: string } {
  if (isSandboxRequest()) {
    return {
      clientKey: requireEnv('TIKTOK_SANDBOX_CLIENT_KEY'),
      clientSecret: requireEnv('TIKTOK_SANDBOX_CLIENT_SECRET'),
    };
  }
  return {
    clientKey: requireEnv('TIKTOK_CLIENT_KEY'),
    clientSecret: requireEnv('TIKTOK_CLIENT_SECRET'),
  };
}

export function tiktokRedirectUri(): string {
  const base = isSandboxRequest()
    ? requireEnv('TIKTOK_SANDBOX_BASE_URL')
    : requireEnv('PUBLIC_BASE_URL');
  return `${base.replace(/\/$/, '')}/api/tiktok/callback`;
}
