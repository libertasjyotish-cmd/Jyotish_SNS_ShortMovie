import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { requireEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Returns a Creatomate template's source JSON. Used to move a design that was
 * built in the editor into code, so future videos need no GUI work.
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const response = await fetch(`https://api.creatomate.com/v1/templates/${id}`, {
    headers: { Authorization: `Bearer ${requireEnv('CREATOMATE_API_KEY')}` },
  });
  const detail = await response.text();
  if (!response.ok) {
    return NextResponse.json({ error: detail }, { status: response.status });
  }
  return new NextResponse(detail, { headers: { 'Content-Type': 'application/json' } });
}
