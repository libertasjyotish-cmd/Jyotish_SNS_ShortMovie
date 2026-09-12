import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { collectChannelStatuses } from '@/lib/channel-status';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Reports whether each language's channel is authorized, by reading the account back from
 * each platform. Posting stays gated behind `DISPATCH_ENABLED`, so this never uploads.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const statuses = await collectChannelStatuses();

    return NextResponse.json({
      connected: statuses.filter((status) => status.connected).length,
      total: statuses.length,
      youtube_privacy_status: process.env.YOUTUBE_PRIVACY_STATUS ?? 'private',
      dispatch_enabled: process.env.DISPATCH_ENABLED === 'true',
      channels: statuses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Channel check failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
