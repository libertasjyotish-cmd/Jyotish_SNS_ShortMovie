import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Data deletion callback required by Meta. The app stores no Threads user data
 * beyond its own accounts' tokens, so the request is acknowledged with a code
 * the user can quote, as the callback contract requires.
 */
export async function POST(req: NextRequest) {
  const confirmationCode = randomUUID();
  console.warn(`Threads data deletion requested: ${confirmationCode}`);
  return NextResponse.json({
    url: `${req.nextUrl.origin}/privacy`,
    confirmation_code: confirmationCode,
  });
}
