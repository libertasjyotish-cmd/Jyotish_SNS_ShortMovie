import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Meta pings this when a user revokes the app. Tokens live in the Channels sheet
 * and are re-issued by the OAuth flow, so the revocation is only recorded.
 */
export async function POST() {
  console.warn('Threads authorization was revoked for one profile');
  return NextResponse.json({ status: 'ok' });
}
