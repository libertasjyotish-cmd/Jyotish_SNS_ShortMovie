/**
 * The dated week a sign reading covers.
 *
 * A reading stays on the feed long after its week, so the period it applies to is shown on
 * the video and repeated in the caption: without it a viewer who finds an older post cannot
 * tell whether it is this week's and scrolls on.
 */

import { Language } from '@/lib/languages';
import { weekStartFromId } from '@/lib/schedule';

const LOCALES: Record<Language, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  id: 'id-ID',
  ar: 'ar',
  fr: 'fr-FR',
  de: 'de-DE',
};

const MS_PER_DAY = 86_400_000;

/** `Sep 28 – Oct 4, 2026`, or `2026年9月28日〜10月4日` in Japanese. */
export function weekPeriodLabel(weekId: string, lang: Language): string | undefined {
  const start = weekStartFromId(weekId);
  if (!start) return undefined;
  const end = new Date(start.getTime() + 6 * MS_PER_DAY);

  if (lang === 'ja') {
    const day = (date: Date) => `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
    return `${start.getUTCFullYear()}年${day(start)}〜${day(end)}`;
  }

  const format = new Intl.DateTimeFormat(LOCALES[lang], {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return `${format.format(start)} – ${format.format(end)}, ${start.getUTCFullYear()}`;
}
