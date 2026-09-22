import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { sendAlert } from '@/lib/alert';

export const dynamic = 'force-dynamic';

/** Lets the daily monitoring job deliver its findings through the configured alert channels. */
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { subject?: string; lines?: string[] } | null;
  const lines = [body?.subject, ...(body?.lines ?? [])].filter(
    (line): line is string => typeof line === 'string' && line.trim() !== '',
  );
  if (lines.length === 0) {
    return NextResponse.json({ error: 'subject or lines is required' }, { status: 400 });
  }

  const delivered = await sendAlert(lines);
  return NextResponse.json({ delivered });
}
