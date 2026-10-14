/**
 * The twelve sign-theme series run one per week, so a script comes back around every twelve
 * weeks. Re-posting the stored file would hand the platforms the same video twice, which costs
 * the second run its recommendation reach, so a returning script is rendered again on a
 * different background, with a different cover and - the part a new background does not change -
 * a different narration voice.
 *
 * Everything here is derived from the week id alone, so the choice is the same wherever it is
 * asked for and no state has to be carried between runs.
 */

import { SIGN_THEME_SERIES } from '@/lib/sign-themes';
import { Language } from '@/services/sheets';

/** Weeks since the rotation started, counted the way `seriesForWeek` counts them. */
function rotationIndex(weekId: string): number | undefined {
  const [year, week] = weekId.split('-W').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(week)) return undefined;
  return year * 53 + week + 4;
}

/**
 * How many times the twelve series have been through. The first pass is 0, so nothing changes
 * for a script the audience has not seen yet; the repeat that starts in week thirteen is 1.
 */
export function reuseCycle(weekId: string): number {
  const index = rotationIndex(weekId);
  if (index === undefined) return 0;
  return Math.floor(index / SIGN_THEME_SERIES.length);
}

/** Week id a task was planned for, or undefined for an id that does not carry one. */
export function weekIdOf(taskId: string): string | undefined {
  return /^(\d{4}-W\d{2})/.exec(taskId)?.[1];
}

/**
 * Chirp3-HD speakers, who exist under the same name in all eight locales. The list is the
 * rotation order, so each repeat of a script is read by the next voice and a speaker is not
 * heard again for twelve cycles - far longer than the videos stay in circulation.
 */
const CYCLE_SPEAKERS = [
  'Charon',
  'Kore',
  'Puck',
  'Aoede',
  'Orus',
  'Leda',
  'Fenrir',
  'Zephyr',
  'Schedar',
  'Umbriel',
  'Algieba',
  'Despina',
] as const;

/** Locale each language is spoken in, matching the renderer's own defaults. */
const LOCALE: Record<Language, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  id: 'id-ID',
  ar: 'ar-XA',
  fr: 'fr-FR',
  de: 'de-DE',
};

export interface NarrationVoice {
  languageCode: string;
  name: string;
}

/**
 * Voice a repeat is read by, or undefined on the first pass so the videos the audience is
 * hearing now keep the voice they were approved with.
 */
export function cycleVoice(language: Language, cycle: number): NarrationVoice | undefined {
  if (cycle <= 0) return undefined;
  const speaker = CYCLE_SPEAKERS[(cycle - 1) % CYCLE_SPEAKERS.length];
  return { languageCode: LOCALE[language], name: `${LOCALE[language]}-Chirp3-HD-${speaker}` };
}

/** Voice a task's narration is read by, derived from the week its script comes back around in. */
export function voiceForTask(taskId: string, language: Language): NarrationVoice | undefined {
  const weekId = weekIdOf(taskId);
  return weekId ? cycleVoice(language, reuseCycle(weekId)) : undefined;
}
