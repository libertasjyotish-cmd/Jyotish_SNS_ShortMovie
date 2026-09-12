import { NextResponse } from 'next/server';
import { sendAlert } from '@/lib/alert';
import { isCronAuthorized } from '@/lib/auth';
import { ChannelStatus, collectChannelStatuses } from '@/lib/channel-status';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Warn while a token can still be refreshed by hand. */
const EXPIRY_WARNING_DAYS = 14;

function label(status: ChannelStatus): string {
  return `${status.channel_id ?? `${status.lang_code}-${status.platform.toLowerCase()}`}`;
}

/**
 * Daily connection check: a revoked or expiring token otherwise stays invisible until a
 * dispatch window silently skips the channel. Read-only; never uploads.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const statuses = await collectChannelStatuses();
    const disconnected = statuses.filter((status) => !status.connected);
    const expiring = statuses.filter(
      (status) =>
        status.connected &&
        status.expires_in_days !== undefined &&
        status.expires_in_days <= EXPIRY_WARNING_DAYS,
    );

    if (disconnected.length > 0 || expiring.length > 0) {
      await sendAlert([
        `Jyotish SNS channel health: ${statuses.length - disconnected.length}/${statuses.length} connected`,
        ...disconnected.map((status) => `NG ${label(status)}: ${status.error ?? 'not connected'}`),
        ...expiring.map(
          (status) => `期限間近 ${label(status)}: あと${status.expires_in_days}日でトークン失効`,
        ),
      ]);
    }

    return NextResponse.json({
      status: 'Health check completed',
      connected: statuses.length - disconnected.length,
      total: statuses.length,
      disconnected: disconnected.map(label),
      expiring: expiring.map(label),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Health check failed:', message);
    await sendAlert([`Jyotish SNS health check failed: ${message}`]);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
