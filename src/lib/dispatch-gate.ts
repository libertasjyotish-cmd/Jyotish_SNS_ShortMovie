import { optionalEnv } from '@/lib/env';
import { Language, LANGUAGES } from '@/lib/languages';
import type { Platform } from '@/services/sheets';

/**
 * Posting is gated twice: `DISPATCH_ENABLED` turns uploads on at all, and `DISPATCH_LANGUAGES`
 * narrows them to a comma-separated allowlist so a language can stay in dry run while the rest
 * go live. An unset allowlist means every language in `LANGUAGES`.
 */
export function dispatchLanguages(): Language[] {
  const configured = optionalEnv('DISPATCH_LANGUAGES');
  if (!configured) return [...LANGUAGES];
  const allowed = configured.split(',').map((lang) => lang.trim().toLowerCase());
  return LANGUAGES.filter((lang) => allowed.includes(lang));
}

export function isDispatchEnabled(): boolean {
  return optionalEnv('DISPATCH_ENABLED') === 'true';
}

export function isDispatchEnabledFor(lang: string): boolean {
  return (
    isDispatchEnabled() && dispatchLanguages().includes(lang.trim().toLowerCase() as Language)
  );
}

/**
 * YouTube stays off while the terminated channels are under appeal (2026-11, spam policy), and
 * the Japanese channel is held back so it is not judged the same way.
 */
const DEFAULT_PAUSED_PLATFORMS = 'YouTube';

/**
 * `PAUSED_PLATFORMS` (comma-separated, e.g. `YouTube`; `none` resumes all) stops uploads to a
 * platform in every language while the others keep posting, so a row completes without it.
 */
export function isPlatformPaused(platform: Platform): boolean {
  const configured = optionalEnv('PAUSED_PLATFORMS') ?? DEFAULT_PAUSED_PLATFORMS;
  return configured
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .includes(platform.toLowerCase());
}
