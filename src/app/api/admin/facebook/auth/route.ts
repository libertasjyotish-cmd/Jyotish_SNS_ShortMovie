import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminTokenMatches, isAdminAuthorized } from '@/lib/admin-auth';
import { isCronAuthorized } from '@/lib/auth';
import { FACEBOOK_STATE_COOKIE, facebookRedirectUri } from '@/lib/facebook-oauth';
import { facebookAuthorizeUrl } from '@/services/facebook';
import { GoogleSheetsService } from '@/services/sheets';

export const dynamic = 'force-dynamic';

/**
 * Starts the Facebook consent flow. One consent covers every page, so unlike Threads this
 * runs once for all six languages.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!isAdminAuthorized(req) && !adminTokenMatches(token) && !isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = randomUUID();
  /** Consent often has to finish in a browser that cannot send this endpoint's credentials. */
  const handoff = req.nextUrl.searchParams.get('handoff') === '1';

  try {
    const authorizeUrl = facebookAuthorizeUrl(facebookRedirectUri(), state);

    if (handoff) {
      const sheets = new GoogleSheetsService();
      const channel = await sheets.getChannelConfig('ja', 'Facebook');
      if (!channel) throw new Error('No Facebook channel configured for "ja"');
      await sheets.setFacebookOauthState(channel.channel_id, state);
      return NextResponse.json({ authorize_url: authorizeUrl });
    }

    const response = NextResponse.redirect(authorizeUrl);
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
