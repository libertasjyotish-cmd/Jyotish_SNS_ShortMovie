import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { sendAlert } from '@/lib/alert';

export const dynamic = 'force-dynamic';

/** Confirms alert delivery is wired up without waiting for a real failure. */
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const delivered = await sendAlert([
    'アラート配信のテストです（異常ではありません）',
    new Date().toISOString(),
  ]);

  return NextResponse.json({
    delivered,
    webhook_configured: Boolean(process.env.ALERT_WEBHOOK_URL),
    email_configured: Boolean(process.env.RESEND_API_KEY && process.env.ALERT_EMAIL_TO),
  });
}
