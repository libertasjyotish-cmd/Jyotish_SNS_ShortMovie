import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { GoogleSheetsService, Language } from '@/services/sheets';
import { ThreadsService } from '@/services/threads';

export const dynamic = 'force-dynamic';

/** Tells the admin page whether one language's Threads profile is authorized. */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lang = (req.nextUrl.searchParams.get('lang') ?? 'ja') as Language;

  try {
    const sheets = new GoogleSheetsService();
    const channel = await sheets.getChannelConfig(lang, 'Threads');
    if (!channel) {
      return NextResponse.json({ error: `No Threads channel row for "${lang}"` }, { status: 404 });
    }
    if (!channel.threads_access_token) {
      return NextResponse.json({ connected: false, channelId: channel.channel_id });
    }
    const account = await new ThreadsService(sheets).verifyChannel(channel);
    return NextResponse.json({ connected: true, channelId: channel.channel_id, account });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ connected: false, error: message }, { status: 200 });
  }
}
