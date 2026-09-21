/**
 * Every language the pipeline can produce; `PLAN_LANGUAGES` picks which of them run.
 * Kept out of `services/sheets` so client components can read it without pulling in
 * the Google API clients.
 */
export const LANGUAGES = ['ja', 'en', 'es', 'pt', 'id', 'ar', 'fr', 'de'] as const;
export type Language = (typeof LANGUAGES)[number];
