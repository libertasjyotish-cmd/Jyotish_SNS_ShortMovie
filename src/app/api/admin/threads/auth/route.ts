import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminTokenMatches, isAdminAuthorized } from '@/lib/admin-auth';
import { THREADS_STATE_COOKIE, threadsRedirectUri } from '@/lib/threads-oauth';
import { GoogleSheetsService, Language } from '@/services/sheets';
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
  /** Threads blocks logins from this host, so consent often has to finish in another browser. */
  const handoff = req.nextUrl.searchParams.get('handoff') === '1';

  try {
    const authorizeUrl = threadsAuthorizeUrl(threadsRedirectUri(), state);

    if (handoff) {
      const sheets = new GoogleSheetsService();
      const channel = await sheets.getChannelConfig(lang, 'Threads');
      if (!channel) throw new Error(`No Threads channel configured for "${lang}"`);
      await sheets.setThreadsOauthState(channel.channel_id, state);
      return NextResponse.json({ authorize_url: authorizeUrl });
    }

    const response = NextResponse.redirect(authorizeUrl);
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
