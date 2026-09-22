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

/** How the spoken period reads: `<start> to <end>` in each language. */
const SPOKEN_RANGE: Record<Language, (start: string, end: string) => string> = {
  ja: (start, end) => `${start}から${end}`,
  en: (start, end) => `${start} to ${end}`,
  es: (start, end) => `del ${start} al ${end}`,
  pt: (start, end) => `de ${start} a ${end}`,
  id: (start, end) => `${start} sampai ${end}`,
  ar: (start, end) => `${start} إلى ${end}`,
  fr: (start, end) => `du ${start} au ${end}`,
  de: (start, end) => `${start} bis ${end}`,
};

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

/**
 * The same week written the way it is read aloud: `September 28 to October 4`, or
 * `9月28日から10月4日` in Japanese. The narration opens on this, so a viewer who only listens
 * still hears which week the reading covers.
 */
export function weekPeriodSpoken(weekId: string, lang: Language): string | undefined {
  const start = weekStartFromId(weekId);
  if (!start) return undefined;
  const end = new Date(start.getTime() + 6 * MS_PER_DAY);

  if (lang === 'ja') {
    const day = (date: Date) => `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
    return SPOKEN_RANGE.ja(day(start), day(end));
  }

  const format = new Intl.DateTimeFormat(LOCALES[lang], {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return SPOKEN_RANGE[lang](format.format(start), format.format(end));
}

/** Arabic-Indic digits are the same dates, so both scripts compare as one. */
export function normalizeDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.codePointAt(0) ?? 0;
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}
