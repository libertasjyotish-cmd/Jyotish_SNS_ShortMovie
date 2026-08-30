import { NextRequest, NextResponse } from 'next/server';
import { TIKTOK_STATE_COOKIE, tiktokRedirectUri } from '@/lib/tiktok-oauth';
import { GoogleSheetsService, Language } from '@/services/sheets';
import { exchangeTikTokCode } from '@/services/tiktok';

export const dynamic = 'force-dynamic';

/**
 * TikTok redirects here after consent; the code is traded for tokens which are
 * stored in the Channels sheet so the pipeline can post without a browser.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const admin = new URL('/admin/tiktok', req.nextUrl.origin);

  const error = params.get('error');
  if (error) {
    admin.searchParams.set('error', params.get('error_description') || error);
    return NextResponse.redirect(admin);
  }

  const code = params.get('code');
  const state = params.get('state');
  const expectedState = req.cookies.get(TIKTOK_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    admin.searchParams.set('error', 'Invalid OAuth state');
    return NextResponse.redirect(admin);
  }

  try {
    const lang = state.split('.')[0] as Language;
    const sheets = new GoogleSheetsService();
    const channel = await sheets.getChannelConfig(lang, 'TikTok');
    if (!channel) throw new Error(`No TikTok channel configured for "${lang}"`);

    const tokens = await exchangeTikTokCode(code, tiktokRedirectUri());
    await sheets.updateChannelTokens(channel.channel_id, {
      tiktok_access_token: tokens.accessToken,
      tiktok_refresh_token: tokens.refreshToken,
      tiktok_token_expires_at: tokens.expiresAt,
    });

    admin.searchParams.set('connected', channel.channel_id);
    const response = NextResponse.redirect(admin);
    response.cookies.delete(TIKTOK_STATE_COOKIE);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('TikTok OAuth callback failed:', message);
    admin.searchParams.set('error', message);
    return NextResponse.redirect(admin);
  }
}
