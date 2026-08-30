import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { GoogleSheetsService, Language } from '@/services/sheets';
import { TikTokService } from '@/services/tiktok';

export const dynamic = 'force-dynamic';

/** Connection state plus the posting options TikTok allows for this account. */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lang = (req.nextUrl.searchParams.get('lang') ?? 'ja') as Language;

  try {
    const sheets = new GoogleSheetsService();
    const channel = await sheets.getChannelConfig(lang, 'TikTok');
    if (!channel) {
      return NextResponse.json({ error: `No TikTok channel for "${lang}"` }, { status: 404 });
    }
    if (!channel.tiktok_access_token && !channel.tiktok_refresh_token) {
      return NextResponse.json({ connected: false, channelId: channel.channel_id });
    }

    const tiktok = new TikTokService(sheets);
    const [user, creator] = await Promise.all([
      tiktok.userInfo(channel),
      tiktok.creatorInfo(channel),
    ]);

    return NextResponse.json({
      connected: true,
      channelId: channel.channel_id,
      accountHandle: channel.account_handle,
      user,
      creator,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
