import { NextResponse } from 'next/server';
import { getGoogleCredentials } from '@/lib/google-credentials';

export const dynamic = 'force-dynamic';

const REQUIRED_VARS = [
  'PUBLIC_BASE_URL',
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

  let googleCredentials = 'ok';
  let privateKeyLooksValid = false;
  try {
    const { private_key } = getGoogleCredentials();
    privateKeyLooksValid =
      private_key.startsWith('-----BEGIN PRIVATE KEY-----') &&
      private_key.trimEnd().endsWith('-----END PRIVATE KEY-----') &&
      private_key.includes('\n');
  } catch (error) {
    googleCredentials = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json({
    ok: missingRequired.length === 0 && googleCredentials === 'ok' && privateKeyLooksValid,
    missing_required: missingRequired,
    missing_posting: missingPosting,
    google_credentials: googleCredentials,
    google_private_key_looks_valid: privateKeyLooksValid,
  });
}
