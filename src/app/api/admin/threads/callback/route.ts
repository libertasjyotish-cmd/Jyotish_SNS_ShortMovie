import { NextRequest, NextResponse } from 'next/server';
import { THREADS_STATE_COOKIE, threadsRedirectUri } from '@/lib/threads-oauth';
import { GoogleSheetsService, Language } from '@/services/sheets';
import { exchangeThreadsCode } from '@/services/threads';

export const dynamic = 'force-dynamic';

/**
 * Threads redirects here after consent; the code is traded for a 60-day token
 * which is stored in the Channels sheet so the pipeline can post without a browser.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const admin = new URL('/admin/threads', req.nextUrl.origin);

  const error = params.get('error');
  if (error) {
    admin.searchParams.set('error', params.get('error_description') || error);
    return NextResponse.redirect(admin);
  }

  const code = params.get('code');
  const state = params.get('state');
  const expectedState = req.cookies.get(THREADS_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    admin.searchParams.set('error', 'Invalid OAuth state');
    return NextResponse.redirect(admin);
  }

  try {
    const lang = state.split('.')[0] as Language;
    const sheets = new GoogleSheetsService();
    const channel = await sheets.getChannelConfig(lang, 'Threads');
    if (!channel) throw new Error(`No Threads channel configured for "${lang}"`);

    // Threads appends "#_" to the redirect, and a fragment never reaches the server,
    // but a proxy that turns it into a query value would break the exchange.
    const tokens = await exchangeThreadsCode(code.replace(/#_$/, ''), threadsRedirectUri());
    await sheets.updateChannelTokens(channel.channel_id, {
      threads_access_token: tokens.accessToken,
      threads_user_id: tokens.userId,
      threads_token_expires_at: tokens.expiresAt,
    });

    admin.searchParams.set('connected', channel.channel_id);
    const response = NextResponse.redirect(admin);
    response.cookies.delete(THREADS_STATE_COOKIE);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Threads OAuth callback failed:', message);
    admin.searchParams.set('error', message);
    return NextResponse.redirect(admin);
  }
}
