import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUIRED_VARS = [
  'PUBLIC_BASE_URL',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_SHEETS_ID',
  'GEMINI_API_KEY',
  'CREATOMATE_API_KEY',
  'CREATOMATE_WEBHOOK_SECRET',
  'CRON_SECRET',
] as const;

const POSTING_VARS = [
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'TIKTOK_CLIENT_KEY',
  'TIKTOK_CLIENT_SECRET',
] as const;

/** Reports which environment variables are set, never their values. */
export async function GET() {
  const missingRequired = REQUIRED_VARS.filter((name) => !process.env[name]);
  const missingPosting = POSTING_VARS.filter((name) => !process.env[name]);
  const privateKey = process.env.GOOGLE_PRIVATE_KEY ?? '';

  return NextResponse.json({
    ok: missingRequired.length === 0,
    missing_required: missingRequired,
    missing_posting: missingPosting,
    google_private_key_looks_valid:
      privateKey.includes('BEGIN PRIVATE KEY') &&
      (privateKey.includes('\n') || privateKey.includes('\\n')),
  });
}
