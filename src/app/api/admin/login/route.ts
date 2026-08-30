import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminTokenMatches } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Exchanges the admin token for an httpOnly cookie used by the admin pages. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { token?: string };
  if (!adminTokenMatches(body.token ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, body.token as string, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
    path: '/',
  });
  return response;
}
