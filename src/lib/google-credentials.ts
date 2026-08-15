import { optionalEnv, requireEnv } from './env';

export interface GoogleCredentials {
  client_email: string;
  private_key: string;
}

function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n').trim();
}

/**
 * Reads the service account credentials from `GOOGLE_SERVICE_ACCOUNT_JSON`
 * (the downloaded key file, pasted verbatim), falling back to the individual
 * `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` variables.
 */
export function getGoogleCredentials(): GoogleCredentials {
  const raw = optionalEnv('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (raw) {
    let parsed: { client_email?: string; private_key?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key');
    }
    return {
      client_email: parsed.client_email,
      private_key: normalizePrivateKey(parsed.private_key),
    };
  }

  return {
    client_email: requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    private_key: normalizePrivateKey(requireEnv('GOOGLE_PRIVATE_KEY')),
  };
}
