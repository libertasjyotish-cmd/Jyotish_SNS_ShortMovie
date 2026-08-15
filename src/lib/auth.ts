import { timingSafeEqual } from 'crypto';
import { requireEnv } from './env';

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on every invocation.
 */
export function isCronAuthorized(request: Request): boolean {
  const expected = requireEnv('CRON_SECRET');
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  return token !== '' && secretsMatch(token, expected);
}

/**
 * Creatomate does not sign webhook payloads, so the callback URL carries a
 * shared secret (`?secret=...`) that is verified here.
 */
export function isWebhookAuthorized(request: Request): boolean {
  const expected = requireEnv('CREATOMATE_WEBHOOK_SECRET');
  const provided =
    new URL(request.url).searchParams.get('secret') ||
    request.headers.get('x-webhook-secret') ||
    '';
  return provided !== '' && secretsMatch(provided, expected);
}
