import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { runRenderBatch } from '@/lib/render-batch';
import { CreatomateService } from '@/services/creatomate';
import { GoogleSheetsService } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  // Scenario 2 Trigger: Creatomate batch rendering
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runRenderBatch(new GoogleSheetsService(), new CreatomateService());
    return NextResponse.json({ status: 'Render batch initiated', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Render batch failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
