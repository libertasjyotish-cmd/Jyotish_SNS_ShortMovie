import { timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { optionalEnv } from './env';

export const ADMIN_COOKIE = 'admin_token';

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function adminTokenMatches(token: string): boolean {
  const expected = optionalEnv('ADMIN_TOKEN');
  if (!expected) {
    console.error('ADMIN_TOKEN is not configured');
    return false;
  }
  return token !== '' && secretsMatch(token, expected);
}

/** The admin pages sign in once and carry an httpOnly cookie afterwards. */
export function isAdminAuthorized(request: NextRequest): boolean {
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value || '';
  return adminTokenMatches(bearer || cookie);
}
