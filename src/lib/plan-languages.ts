import { optionalEnv } from '@/lib/env';
import { Language, LANGUAGES } from '@/services/sheets';

/** Languages the weekly plan creates tasks for. */
export function plannedLanguages(): Language[] {
  const configured = (optionalEnv('PLAN_LANGUAGES') ?? 'ja')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
  return configured.filter((code): code is Language => LANGUAGES.includes(code as Language));
}
