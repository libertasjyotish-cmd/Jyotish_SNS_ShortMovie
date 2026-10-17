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
  ja: {
    compat: '相性がいい星座・悪い星座',
    nature: '本質と性格',
    sidereal: '西洋占星術とのずれ',
    work: '向いている仕事・働き方',
    money: 'お金の稼ぎ方と使い方の癖',
    love: '恋愛傾向と続く相手',
    family: '家族・親子で噛み合わない理由',
    rest: '疲れ方と休み方',
    impression: '第一印象と誤解されやすい点',
    avoid: '向いていない環境・避けたい選択',
    turning: '人生の転機の出方',
    habit: 'やめると楽になる癖',
  },
  en: {
    compat: 'Compatibility',
    nature: 'Personality Traits',
    sidereal: 'Your Real Sidereal Sign',
    work: 'Career and How You Work Best',
    money: 'Money Habits',
    love: 'Love and Lasting Partners',
    family: 'Family and Parents',
    rest: 'How You Burn Out and Recover',
    impression: 'First Impression and Misread Traits',
    avoid: 'What Does Not Suit You',
    turning: 'How Turning Points Arrive',
    habit: 'The Habit to Let Go Of',
  },
  es: {
    compat: 'Compatibilidad',
    nature: 'Personalidad',
    sidereal: 'Tu verdadero signo sideral',
    work: 'Trabajo y vocación',
    money: 'Hábitos con el dinero',
    love: 'Amor y parejas duraderas',
    family: 'Familia y padres',
    rest: 'Cómo te agotas y te recuperas',
    impression: 'Primera impresión y malentendidos',
    avoid: 'Lo que no te conviene',
    turning: 'Cómo llegan los cambios de rumbo',
    habit: 'El hábito que conviene dejar',
  },
  pt: {
    compat: 'Compatibilidade',
    nature: 'Personalidade',
    sidereal: 'Seu verdadeiro signo sideral',
    work: 'Trabalho e vocação',
    money: 'Hábitos com dinheiro',
    love: 'Amor e relações duradouras',
    family: 'Família e pais',
    rest: 'Como você se esgota e se recupera',
    impression: 'Primeira impressão e mal-entendidos',
    avoid: 'O que não combina com você',
    turning: 'Como chegam as viradas de vida',
    habit: 'O hábito que vale abandonar',
  },
  id: {
    compat: 'Kecocokan',
    nature: 'Kepribadian',
    sidereal: 'Zodiak sideral sebenarnya',
    work: 'Pekerjaan yang cocok',
    money: 'Kebiasaan soal uang',
    love: 'Cinta dan pasangan yang bertahan',
    family: 'Keluarga dan orang tua',
    rest: 'Cara lelah dan cara pulih',
    impression: 'Kesan pertama dan salah paham',
    avoid: 'Hal yang tidak cocok untukmu',
    turning: 'Cara titik balik datang',
    habit: 'Kebiasaan yang sebaiknya dilepas',
  },
  ar: {
    compat: 'التوافق',
    nature: 'الشخصية',
    sidereal: 'برجك الفلكي الحقيقي',
    work: 'العمل المناسب لك',
    money: 'عاداتك مع المال',
    love: 'الحب والشريك الذي يدوم',
    family: 'الأسرة والوالدان',
    rest: 'كيف تتعب وكيف تستعيد طاقتك',
    impression: 'الانطباع الأول وسوء الفهم',
    avoid: 'ما لا يناسبك',
    turning: 'كيف تأتي نقاط التحول',
    habit: 'العادة التي يحسن تركها',
  },
  fr: {
    compat: 'Compatibilité',
    nature: 'Personnalité',
    sidereal: 'Votre vrai signe sidéral',
    work: 'Travail et vocation',
    money: 'Votre rapport à l’argent',
    love: 'Amour et relations durables',
    family: 'Famille et parents',
    rest: 'Comment vous vous épuisez et récupérez',
    impression: 'Première impression et malentendus',
    avoid: 'Ce qui ne vous convient pas',
    turning: 'Comment arrivent les tournants',
    habit: 'L’habitude à laisser tomber',
  },
  de: {
    compat: 'Kompatibilität',
    nature: 'Persönlichkeit',
    sidereal: 'Dein echtes siderisches Zeichen',
    work: 'Beruf und Arbeitsweise',
    money: 'Umgang mit Geld',
    love: 'Liebe und dauerhafte Partner',
    family: 'Familie und Eltern',
    rest: 'Wie du erschöpfst und dich erholst',
    impression: 'Erster Eindruck und Missverständnisse',
    avoid: 'Was nicht zu dir passt',
    turning: 'Wie Wendepunkte kommen',
    habit: 'Die Gewohnheit, die du loslassen darfst',
  },
};

/** Short word for the Moon sign, attached to the sign name wherever it is shown. */
const MOON_SIGN_WORD: Record<Language, string> = {
  ja: '月星座',
  en: 'Moon Sign',
  es: 'Signo lunar',
  pt: 'Signo lunar',
  id: 'Zodiak Bulan',
  ar: 'برج القمر',
  fr: 'Signe lunaire',
  de: 'Mondzeichen',
};

/** Viewers read a bare sign name as their sun sign, so it always says it is the Moon sign. */
export function moonSignLabel(zodiacSign: string, lang: Language): string {
  return lang === 'ja' ? `${zodiacSign}（${MOON_SIGN_WORD.ja}）` : `${zodiacSign} (${MOON_SIGN_WORD[lang]})`;
}

/** Cover headline of a sign video. */
export function moonSignHeadline(zodiacSign: string, lang: Language): string {
  // The note right under the headline says it is the Moon sign; a bracketed label would wrap
  // the sign name onto two lines at cover size.
  return zodiacSign;
}

/** Note under a sign headline. */
function coverSignNote(lang: Language): string {
  return lang === 'ja' ? `${TITLE_KEYWORDS.ja.theme} ${MOON_SIGN_WORD.ja}` : MOON_SIGN_NOTE[lang];
}

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
  return [`${moonSignLabel(zodiacSign, lang)} ${phrase}`, period].filter(Boolean).join(' · ');
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
 * Text of the cover a video is listed with, where every title around it is truncated: the sign,
 * the zodiac it belongs to and the week it reads have to come from the image alone.
 */
export function buildCoverText({ lang, zodiacSign, series, period, hook }: CoverTextParams): {
  sign: string;
  note: string;
  period: string;
} {
  const keywords = TITLE_KEYWORDS[lang];
  // A video with no sign has nothing of its own to put on the cover but what it is about, so its
  // own hook is the headline: the category name alone lists every such video under one still.
  const headline = (zodiacSign && moonSignHeadline(zodiacSign, lang)) ?? coverHook(hook, lang) ?? keywords.theme;
  return {
    sign: headline,
    note: zodiacSign ? coverSignNote(lang) : keywords.theme,
    // An evergreen series carries no dates, so it names itself where the week would sit.
    period: (series ? SERIES_KEYWORDS[lang][series] : period) ?? '',
  };
}

/**
 * Trims a hook to what a cover plate holds without shrinking to an unreadable size, cutting at a
 * clause and never mid-word: a headline ending on a preposition reads as a broken image.
 */
function coverHook(hook: string | undefined, lang: Language): string | undefined {
  const text = hook?.trim().replace(/[。.!?！？]+$/, '');
  if (!text) return undefined;
  const limit = COVER_HOOK_LIMIT[lang];
  if (text.length <= limit) return text;

  const clause = text.slice(0, limit).split(/[、,:：—–]/)[0].trim();
  if (clause.length >= limit / 3) return clause;
  const words = text.slice(0, limit).trim();
  return words.includes(' ') ? words.slice(0, words.lastIndexOf(' ')) : words;
}

/**
 * Room on the plate, measured in characters of the language: a script says in ~28 Japanese
 * characters what the Latin-script languages need about twice as many of.
 */
const COVER_HOOK_LIMIT: Record<Language, number> = {
  ja: 28,
  en: 60,
  es: 60,
  pt: 60,
  id: 60,
  ar: 50,
  fr: 60,
  de: 60,
};

export interface CoverTextParams extends CaptionLeadParams {
  /** Opening line of the narration, used as the headline when the video has no sign. */
  hook?: string;
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

/**
 * Words that cannot end a phrase in the eight languages: conjunctions, prepositions and
 * articles, which all promise a word that the character limit cut off.
 */
const DANGLING_WORDS = new Set([
  // en
  'and', 'or', 'but', 'while', 'about', 'with', 'of', 'to', 'in', 'on', 'for', 'as', 'at',
  'that', 'the', 'a', 'an', 'is', 'are', 'your', 'you',
  // es / pt
  'y', 'e', 'o', 'u', 'pero', 'mas', 'que', 'de', 'del', 'da', 'do', 'en', 'em', 'con', 'com',
  'por', 'para', 'sin', 'sem', 'el', 'la', 'los', 'las', 'um', 'uma', 'se', 'ou', 'no', 'na',
  // id
  'dan', 'atau', 'tapi', 'tetapi', 'dengan', 'untuk', 'pada', 'dari', 'yang', 'ke', 'di',
  // fr
  'et', 'ou', 'mais', 'dans', 'avec', 'sans', 'pour', 'sur', 'du', 'des', 'le', 'les', 'un',
  'une', 'qui', 'vos', 'votre',
  // de
  'und', 'oder', 'aber', 'mit', 'ohne', 'für', 'auf', 'an', 'im', 'in', 'der', 'die', 'das',
  'den', 'dem', 'ein', 'eine', 'als', 'zu', 'von', 'bei', 'sich', 'ihre', 'ihr',
  // ar
  'و', 'أو', 'في', 'من', 'على', 'إلى', 'مع', 'عن', 'أن', 'التي', 'الذي',
]);

/** Marks a reader accepts as the end of a thought, in every script the languages use. */
const CLAUSE_END = /[?!.\u061F\u3002\uFF1F\uFF01]/g;

/**
 * A hook that does not fit is cut at the last clause that does, and marked with an ellipsis
 * when it stops mid-sentence: cutting at a space leaves titles like `is your mind racing
 * about`, which reads as a broken sentence rather than a question the viewer can answer.
 */
function trimHook(hook: string, room: number): string {
  if (hook.length <= room) return hook;

  let clause = 0;
  CLAUSE_END.lastIndex = 0;
  for (let match = CLAUSE_END.exec(hook); match; match = CLAUSE_END.exec(hook)) {
    const end = match.index + match[0].length;
    if (end > room) break;
    clause = end;
  }
  if (clause >= MIN_HOOK) return hook.slice(0, clause).trim();

  const cut = hook.slice(0, room - 1);
  const space = cut.lastIndexOf(' ');
  let kept = (space >= MIN_HOOK ? cut.slice(0, space) : cut).trim();
  // A phrase ending on a conjunction or preposition reads as a dropped sentence even with an
  // ellipsis, so those words are given back until the last one carries meaning on its own.
  for (let last = kept.lastIndexOf(' '); last >= MIN_HOOK; last = kept.lastIndexOf(' ')) {
    if (!DANGLING_WORDS.has(kept.slice(last + 1).toLowerCase())) break;
    kept = kept.slice(0, last);
  }
  return `${kept.replace(/[,;:\u060C\u3001\uFF0C]$/, '')}\u2026`;
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
  // Outside ja the full note sits beside the sign instead of at the end, where a long hook
  // would otherwise leave no room after both the note and the Moon-sign label.
  const signLabel = zodiacSign && (lang === 'ja' ? moonSignLabel(zodiacSign, lang) : `${zodiacSign} (${MOON_SIGN_NOTE[lang]})`);
  const lead = signLabel ? [signLabel, phrase, period].filter(Boolean).join(' ') : keywords.theme;
  const separator = lang === 'ja' ? '｜' : ' | ';
  const tail = zodiacSign && lang !== 'ja' ? '' : `${separator}${zodiacSign ? keywords.theme : BRAND}`;
  // A series keyword already says what the video is, so its hook would only repeat it.
  if (hook && !series) {
    const room = TITLE_LIMIT - lead.length - 2 - tail.length;
    if (room >= MIN_HOOK) return `${lead}: ${trimHook(hook, room)}${tail}`;
  }
  const withTail = `${lead}${tail}`;
  return (withTail.length <= TITLE_LIMIT ? withTail : lead).slice(0, TITLE_LIMIT);
}
