import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { uploadAsset } from '@/services/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Stores a background image or video on Vercel Blob and returns its public URL,
 * so assets can be published without touching the Creatomate editor.
 */
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pathname = req.nextUrl.searchParams.get('path');
  if (!pathname) {
    return NextResponse.json({ error: 'path query parameter is required' }, { status: 400 });
  }

  try {
    const contentType = req.headers.get('content-type') ?? 'application/octet-stream';
    const data = Buffer.from(await req.arrayBuffer());
    if (data.length === 0) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }
    const url = await uploadAsset(`assets/${pathname}`, data, contentType);
    return NextResponse.json({ url, bytes: data.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Asset upload failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
