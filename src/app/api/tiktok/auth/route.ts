import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { TIKTOK_STATE_COOKIE, tiktokRedirectUri } from '@/lib/tiktok-oauth';
import { Language } from '@/services/sheets';
import { tiktokAuthorizeUrl } from '@/services/tiktok';

export const dynamic = 'force-dynamic';

/** Starts the TikTok consent flow for one language's account. */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lang = (req.nextUrl.searchParams.get('lang') ?? 'ja') as Language;
  const state = `${lang}.${randomUUID()}`;

  try {
    const response = NextResponse.redirect(tiktokAuthorizeUrl(tiktokRedirectUri(), state));
    response.cookies.set(TIKTOK_STATE_COOKIE, state, {
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
