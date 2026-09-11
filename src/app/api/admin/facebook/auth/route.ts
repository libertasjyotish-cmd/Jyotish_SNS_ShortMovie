import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminTokenMatches, isAdminAuthorized } from '@/lib/admin-auth';
import { FACEBOOK_STATE_COOKIE, facebookRedirectUri } from '@/lib/facebook-oauth';
import { facebookAuthorizeUrl } from '@/services/facebook';

export const dynamic = 'force-dynamic';

/**
 * Starts the Facebook consent flow. One consent covers every page, so unlike Threads this
 * runs once for all six languages.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!isAdminAuthorized(req) && !adminTokenMatches(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = randomUUID();

  try {
    const response = NextResponse.redirect(facebookAuthorizeUrl(facebookRedirectUri(), state));
    response.cookies.set(FACEBOOK_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
