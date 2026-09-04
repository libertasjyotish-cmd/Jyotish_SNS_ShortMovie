import { NextResponse } from 'next/server';
import { sendAlert } from '@/lib/alert';
import { isCronAuthorized } from '@/lib/auth';
import { runWatchdog } from '@/lib/watchdog-run';
import { GoogleSheetsService } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWatchdog(new GoogleSheetsService(), new Date());
    return NextResponse.json({ status: 'Watchdog completed', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Watchdog failed:', message);
    await sendAlert([`Jyotish SNS watchdog failed: ${message}`]);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
