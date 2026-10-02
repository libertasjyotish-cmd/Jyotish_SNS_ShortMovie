import { NextRequest, NextResponse } from 'next/server';
import { FACEBOOK_STATE_COOKIE, facebookRedirectUri } from '@/lib/facebook-oauth';
import { exchangeFacebookCode, fetchFacebookPage } from '@/services/facebook';
import { GoogleSheetsService, Language, LANGUAGES } from '@/services/sheets';

export const dynamic = 'force-dynamic';

/**
 * Facebook redirects here after consent; every page token is written onto the Facebook channel
 * row whose `fb_page_id` matches, so all six languages are connected by one consent.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const error = params.get('error');
  if (error) {
    return NextResponse.json(
      { error: params.get('error_description') || error },
      { status: 400 },
    );
  }

  const code = params.get('code');
  const state = params.get('state');
  const cookieState = req.cookies.get(FACEBOOK_STATE_COOKIE)?.value;
  if (!code || !state) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  try {
    const sheets = new GoogleSheetsService();
    const jaChannel = await sheets.getChannelConfig('ja', 'Facebook');
    /** Consent finished elsewhere carries no cookie, so the state is matched against the sheet. */
    const storedState = jaChannel
      ? await sheets.getFacebookOauthState(jaChannel.channel_id)
      : '';
    if (state !== cookieState && (!storedState || state !== storedState)) {
      return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
    }

    const userToken = await exchangeFacebookCode(code, facebookRedirectUri());
    const connected: string[] = [];
    const missing: string[] = [];

    for (const lang of LANGUAGES) {
      const channel = await sheets.getChannelConfig(lang, 'Facebook');
      if (!channel?.fb_page_id) {
        missing.push(lang);
        continue;
      }
      const page = await fetchFacebookPage(channel.fb_page_id, userToken);
      await sheets.updateChannelTokens(channel.channel_id, {
        fb_page_access_token: page.accessToken,
      });
      connected.push(channel.channel_id);
    }

    if (storedState && jaChannel) await sheets.setFacebookOauthState(jaChannel.channel_id, '');

    const response = NextResponse.json({ connected, missing });
    response.cookies.delete(FACEBOOK_STATE_COOKIE);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Facebook OAuth callback failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
