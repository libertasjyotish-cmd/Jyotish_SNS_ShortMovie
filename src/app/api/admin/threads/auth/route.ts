import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminTokenMatches, isAdminAuthorized } from '@/lib/admin-auth';
import { THREADS_STATE_COOKIE, threadsRedirectUri } from '@/lib/threads-oauth';
import { Language } from '@/services/sheets';
import { threadsAuthorizeUrl } from '@/services/threads';

export const dynamic = 'force-dynamic';

/** Starts the Threads consent flow for one language's profile. */
export async function GET(req: NextRequest) {
  /** Consent must run in a browser profile per Threads account, where signing in first is fragile. */
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!isAdminAuthorized(req) && !adminTokenMatches(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lang = (req.nextUrl.searchParams.get('lang') ?? 'ja') as Language;
  const state = `${lang}.${randomUUID()}`;

  try {
    const response = NextResponse.redirect(threadsAuthorizeUrl(threadsRedirectUri(), state));
    response.cookies.set(THREADS_STATE_COOKIE, state, {
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
