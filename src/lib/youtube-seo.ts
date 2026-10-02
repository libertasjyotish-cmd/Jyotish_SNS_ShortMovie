import { SignThemeSeries } from '@/lib/sign-themes';
import { Language } from '@/services/sheets';

const BRAND = 'Libertas Jyotish';
const TITLE_LIMIT = 100;

/**
 * YouTube weighs the opening words of a title most, and viewers search for the format
 * ("aries weekly horoscope"), not the brand, so the searched phrase leads every title.
 */
export const TITLE_KEYWORDS: Record<Language, { weekly: string; theme: string }> = {
  ja: { weekly: '今週の運勢', theme: 'インド占星術' },
  en: { weekly: 'Weekly Horoscope', theme: 'Vedic Astrology' },
  es: { weekly: 'Horóscopo Semanal', theme: 'Astrología Védica' },
  pt: { weekly: 'Horóscopo Semanal', theme: 'Astrologia Védica' },
  id: { weekly: 'Horoskop Mingguan', theme: 'Astrologi Veda' },
  ar: { weekly: 'حظك هذا الأسبوع', theme: 'التنجيم الفيدي' },
  fr: { weekly: 'Horoscope Hebdomadaire', theme: 'Astrologie Védique' },
  de: { weekly: 'Wochenhoroskop', theme: 'Vedische Astrologie' },
};

/** The searched phrase of each sign-targeted evergreen series, used in place of the weekly one. */
export const SERIES_KEYWORDS: Record<Language, Record<SignThemeSeries, string>> = {
  ja: { compat: '相性がいい星座・悪い星座', nature: '本質と性格', sidereal: '西洋占星術とのずれ' },
  en: { compat: 'Compatibility', nature: 'Personality Traits', sidereal: 'Your Real Sidereal Sign' },
  es: { compat: 'Compatibilidad', nature: 'Personalidad', sidereal: 'Tu verdadero signo sideral' },
  pt: { compat: 'Compatibilidade', nature: 'Personalidade', sidereal: 'Seu verdadeiro signo sideral' },
  id: { compat: 'Kecocokan', nature: 'Kepribadian', sidereal: 'Zodiak sideral sebenarnya' },
  ar: { compat: 'التوافق', nature: 'الشخصية', sidereal: 'برجك الفلكي الحقيقي' },
  fr: { compat: 'Compatibilité', nature: 'Personnalité', sidereal: 'Votre vrai signe sidéral' },
  de: { compat: 'Kompatibilität', nature: 'Persönlichkeit', sidereal: 'Dein echtes siderisches Zeichen' },
};

/**
 * Viewers search for the sign they were told they are, which is their Western sun sign, so a
 * title that names a sign says which system it belongs to. It sits at the end because phones
 * cut a title off after roughly forty characters.
 */
export const MOON_SIGN_NOTE: Record<Language, string> = {
  ja: 'インド占星術の月星座',
  en: 'Vedic Moon Sign',
  es: 'Signo lunar védico',
  pt: 'Signo lunar védico',
  id: 'Zodiak Bulan Veda',
  ar: 'برج القمر في التنجيم الفيدي',
  fr: 'Signe lunaire védique',
  de: 'Vedisches Mondzeichen',
};

/** Tags carry the spellings a title has no room for, including the untranslated Sanskrit terms. */
export const VIDEO_TAGS: Record<Language, string[]> = {
  ja: ['インド占星術', 'ジョーティシュ', '月星座', 'ナクシャトラ', '週間占い', '今週の運勢', '占星術', 'Jyotish', 'Vedic Astrology'],
  en: ['vedic astrology', 'jyotish', 'moon sign', 'nakshatra', 'sidereal astrology', 'weekly horoscope', 'indian astrology', 'rashi', 'dasha'],
  es: ['astrología védica', 'jyotish', 'signo lunar', 'nakshatra', 'astrología sideral', 'horóscopo semanal', 'astrología hindú', 'rashi', 'dasha'],
  pt: ['astrologia védica', 'jyotish', 'signo lunar', 'nakshatra', 'astrologia sideral', 'horóscopo semanal', 'astrologia indiana', 'rashi', 'dasha'],
  id: ['astrologi veda', 'jyotish', 'zodiak bulan', 'nakshatra', 'astrologi sideral', 'horoskop mingguan', 'astrologi india', 'rashi', 'dasha'],
  ar: ['التنجيم الفيدي', 'جيوتيش', 'برج القمر', 'ناكشاترا', 'الابراج', 'حظك هذا الاسبوع', 'التنجيم الهندي', 'راشي', 'داشا'],
  fr: ['astrologie védique', 'jyotish', 'signe lunaire', 'nakshatra', 'astrologie sidérale', 'horoscope hebdomadaire', 'astrologie indienne', 'rashi', 'dasha'],
  de: ['vedische astrologie', 'jyotish', 'mondzeichen', 'nakshatra', 'siderische astrologie', 'wochenhoroskop', 'indische astrologie', 'rashi', 'dasha'],
};

/** YouTube drops the whole tag list when it exceeds this many characters. */
const TAGS_LIMIT = 460;

/**
 * A viewer searches for their own sign, not for the system, so the sign name and its phrase
 * combinations lead the tag list; the language-wide terms fill what is left.
 */
export function buildVideoTags({ lang, zodiacSign, series }: TagParams): string[] {
  const keywords = TITLE_KEYWORDS[lang];
  const phrase = series ? SERIES_KEYWORDS[lang][series] : keywords.weekly;
  const signTags = zodiacSign
    ? [
        zodiacSign,
        `${zodiacSign} ${phrase}`,
        `${zodiacSign} ${MOON_SIGN_NOTE[lang]}`,
        `${zodiacSign} ${keywords.theme}`,
      ]
    : [];
  const tags: string[] = [];
  let length = 0;
  for (const tag of [...signTags, ...VIDEO_TAGS[lang]]) {
    // Each tag costs its own length plus the comma YouTube counts between tags.
    if (length + tag.length + 1 > TAGS_LIMIT) break;
    tags.push(tag);
    length += tag.length + 1;
  }
  return tags;
}

/**
 * Opening line of a caption on the platforms that have no title: a feed shows only this line,
 * so it carries the same sign, searched phrase and week as a YouTube title does.
 */
export function buildCaptionLead({ lang, zodiacSign, period, series }: CaptionLeadParams): string | undefined {
  if (!zodiacSign) return period;
  const keywords = TITLE_KEYWORDS[lang];
  const phrase = series ? SERIES_KEYWORDS[lang][series] : keywords.weekly;
  return [`${zodiacSign} ${phrase}`, period].filter(Boolean).join(' · ');
}

/**
 * Playlist that collects everything published for one sign. A playlist title is indexed on its
 * own, so searching a sign reaches the playlist even when no single video ranks, and the viewer
 * lands on a list of that sign's videos instead of one clip.
 */
export function signPlaylistTitle({ lang, zodiacSign }: { lang: Language; zodiacSign: string }) {
  return `${zodiacSign} ${TITLE_KEYWORDS[lang].weekly} | ${MOON_SIGN_NOTE[lang]}`;
}

/**
 * Text of the thumbnail. A Short is shown with a thumbnail in search, on the channel and in
 * playlists, where the title is truncated: the sign has to be readable from the image alone.
 */
export function buildThumbnailText({ lang, zodiacSign, series }: TagParams): {
  title: string;
  subtitle: string;
} {
  const keywords = TITLE_KEYWORDS[lang];
  return {
    title: zodiacSign ?? keywords.theme,
    subtitle: zodiacSign
      ? series
        ? SERIES_KEYWORDS[lang][series]
        : keywords.weekly
      : BRAND,
  };
}

export interface CaptionLeadParams {
  lang: Language;
  zodiacSign?: string;
  period?: string;
  series?: SignThemeSeries;
}

export interface TagParams {
  lang: Language;
  zodiacSign?: string;
  series?: SignThemeSeries;
}

export interface TitleParams {
  lang: Language;
  /** Sign name for a weekly reading; empty for an evergreen theme. */
  zodiacSign?: string;
  hook: string;
  /** Dated week a sign reading covers. */
  period?: string;
  /** Series of a sign-targeted evergreen video; its phrase replaces the weekly one. */
  series?: SignThemeSeries;
}

/** Shortest hook worth keeping; below this it reads as a cut-off fragment. */
const MIN_HOOK = 12;

function trimHook(hook: string, room: number): string {
  if (hook.length <= room) return hook;
  const cut = hook.slice(0, room);
  const space = cut.lastIndexOf(' ');
  return (space >= MIN_HOOK ? cut.slice(0, space) : cut).trim();
}

/**
 * The hook carries the wording viewers type into search, so it is trimmed to fit rather
 * than dropped, while the moon-sign note always stays: a sign title has to say which
 * system it reads, or viewers look up their Western sun sign.
 */
export function buildYouTubeTitle({
  lang,
  zodiacSign,
  hook,
  period,
  series,
}: TitleParams): string {
  const keywords = TITLE_KEYWORDS[lang];
  const phrase = series ? SERIES_KEYWORDS[lang][series] : keywords.weekly;
  const lead = zodiacSign ? [zodiacSign, phrase, period].filter(Boolean).join(' ') : keywords.theme;
  const separator = lang === 'ja' ? '｜' : ' | ';
  const tail = `${separator}${zodiacSign ? MOON_SIGN_NOTE[lang] : BRAND}`;
  // A series keyword already says what the video is, so its hook would only repeat it.
  if (hook && !series) {
    const room = TITLE_LIMIT - lead.length - 2 - tail.length;
    if (room >= MIN_HOOK) return `${lead}: ${trimHook(hook, room)}${tail}`;
  }
  const withTail = `${lead}${tail}`;
  return (withTail.length <= TITLE_LIMIT ? withTail : lead).slice(0, TITLE_LIMIT);
}
