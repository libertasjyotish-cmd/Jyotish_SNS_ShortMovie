import { Language } from '@/services/sheets';

export const SITE_URL = 'https://www.libertas-jyotish.com';
export const SITE_DOMAIN = 'libertas-jyotish.com';

/** Small print under the CTA button; the site link itself lives in the profile. */
export const CTA_NOTES: Record<Language, string> = {
  ja: '※プロフィール欄のサイトURLをクリック',
  en: 'Tap the link in our profile',
  es: 'Toca el enlace en el perfil',
  pt: 'Toque no link do perfil',
  id: 'Ketuk tautan di profil',
  ar: 'اضغط على الرابط في الملف الشخصي',
  fr: 'Touchez le lien dans notre profil',
  de: 'Tippe auf den Link in unserem Profil',
};

export const CTA_HEADLINE: Record<Language, string> = {
  ja: '▼ あなたの本当の星座を調べる',
  en: '▼ Find your true sidereal sign',
  es: '▼ Descubre tu verdadero signo sideral',
  pt: '▼ Descubra seu verdadeiro signo sideral',
  id: '▼ Temukan zodiak sideralmu yang sebenarnya',
  ar: '▼ اكتشف برجك الحقيقي',
  fr: '▼ Découvrez votre véritable signe sidéral',
  de: '▼ Finde dein wahres siderisches Sternzeichen',
};

/**
 * The site serves the top page in Japanese, so every link carries the language of the post.
 * `content` names the video the link came from, which also keeps the URL of one post out of the
 * next one's caption.
 */
function siteLink(lang: Language, source: string, medium = 'caption', content?: string): string {
  const tag = content ? `&utm_content=${encodeURIComponent(content)}` : '';
  return `${SITE_URL}/${lang}?utm_source=${source}&utm_medium=${medium}${tag}`;
}

/**
 * Daily reading subscription, the recurring product: a weekly video is a reason to come back once,
 * the daily page is a reason to come back every morning.
 */
const DAILY_CTA: Record<Language, string> = {
  ja: '▼ 今日のあなたの運勢を毎日読む',
  en: '▼ Read your own reading, every day',
  es: '▼ Lee tu lectura personal cada día',
  pt: '▼ Leia a sua leitura pessoal todos os dias',
  id: '▼ Baca ramalan harian Anda setiap hari',
  ar: '▼ اقرأ قراءتك الشخصية كل يوم',
  fr: '▼ Lisez votre lecture personnelle chaque jour',
  de: '▼ Lies deine eigene Tagesdeutung, jeden Tag',
};

/** The premium section of the member page; the fragment stays last so it survives the query. */
function dailyLink(lang: Language, source: string, medium: string, content?: string): string {
  const tag = content ? `&utm_content=${encodeURIComponent(content)}` : '';
  return `${SITE_URL}/${lang}/mypage?utm_source=${source}&utm_medium=${medium}${tag}#premium`;
}

export function dailyCta(
  lang: Language,
  source: string,
  medium = 'caption',
  content?: string,
): string {
  return `${DAILY_CTA[lang]}\n${dailyLink(lang, source, medium, content)}`;
}

/** Shorts descriptions render URLs as plain text, so the profile link is the only tappable route. */
export function descriptionCta(lang: Language, source: string, content?: string): string {
  return `${CTA_HEADLINE[lang]}\n${CTA_NOTES[lang]}\n${siteLink(lang, source, 'caption', content)}`;
}

/**
 * Threads and Facebook turn a URL in the body into a tappable link, unlike an Instagram caption or
 * a Shorts description, so those two get the site link itself instead of the profile detour.
 */
function linkCta(lang: Language, source: 'threads' | 'facebook', content?: string): string {
  return `${CTA_HEADLINE[lang]}\n${siteLink(lang, source, 'caption', content)}`;
}

const TIKTOK_SEARCH: Record<Language, string> = {
  ja: '▼ あなたの本当の星座を調べる\n検索: ',
  en: '▼ Find your true sidereal sign\nSearch: ',
  es: '▼ Descubre tu verdadero signo sideral\nBusca: ',
  pt: '▼ Descubra seu verdadeiro signo sideral\nBusque: ',
  id: '▼ Temukan zodiak sideralmu yang sebenarnya\nCari: ',
  ar: '▼ اكتشف برجك الحقيقي\nابحث عن: ',
  fr: '▼ Découvrez votre véritable signe sidéral\nRecherchez : ',
  de: '▼ Finde dein wahres siderisches Sternzeichen\nSuche: ',
};

/** TikTok profile links need 1,000 followers, so the domain is spelled out instead. */
export function tiktokDescriptionCta(lang: Language): string {
  return `${TIKTOK_SEARCH[lang]}${SITE_DOMAIN}/${lang}`;
}

/**
 * A playlist page is indexed and carries a tappable link, so the description says what the sign
 * means here and sends the viewer to the site.
 */
export function playlistDescription(lang: Language): string {
  return `${MOON_SIGN_CAPTION[lang]}\n\n${CTA_HEADLINE[lang]}\n${siteLink(lang, 'youtube-playlist')}`;
}

/**
 * Threads collapses a long caption and Facebook hides it behind "See more", so the link is
 * repeated in the first reply, which stays visible under the video.
 */
export function followUpLink(
  lang: Language,
  source: 'threads' | 'facebook',
  daily = false,
  content?: string,
): string {
  return daily
    ? dailyCta(lang, source, 'reply', content)
    : `${CTA_HEADLINE[lang]}\n${siteLink(lang, source, 'reply', content)}`;
}

/** Comments render the URL as a tappable link, unlike a Shorts description. */
export function commentUrl(lang: Language): string {
  return siteLink(lang, 'youtube', 'comment');
}

/** Opens the subscribe confirmation dialog of the channel, so one tap subscribes. */
export function subscribeUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`;
}

const SUBSCRIBE_CTA: Record<Language, string> = {
  ja: '▼ 毎週の占いを見逃さないようにチャンネル登録',
  en: '▼ Subscribe so you never miss a weekly reading',
  es: '▼ Suscríbete para no perderte ninguna lectura semanal',
  pt: '▼ Inscreva-se para não perder nenhuma leitura semanal',
  id: '▼ Subscribe agar tidak melewatkan ramalan mingguan',
  ar: '▼ اشترك في القناة حتى لا تفوتك قراءة كل أسبوع',
  fr: '▼ Abonnez-vous pour ne manquer aucune lecture hebdomadaire',
  de: '▼ Abonniere den Kanal, um keine Wocheneinschätzung zu verpassen',
};

function subscribeBlock(lang: Language, channelId: string): string {
  return `${SUBSCRIBE_CTA[lang]}\n${subscribeUrl(channelId)}`;
}

/**
 * The subscribe link is the only tappable subscribe surface a Short has: the player's own button
 * is out of our reach and the watermark does not render on Shorts.
 */
export function youtubeComment(lang: Language, channelId?: string, daily = false): string {
  return [
    youtubeNote(lang),
    daily ? dailyCta(lang, 'youtube', 'comment') : undefined,
    channelId ? subscribeBlock(lang, channelId) : undefined,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Posted under every upload. It names what the sign in the video actually is, so a viewer who
 * only knows their Western sun sign has a reason to look their own up.
 */
const YOUTUBE_NOTE: Record<Language, string> = {
  ja: 'この動画の星座は、インド占星術（ジョーティシュ）で使うサイデリアル月星座です。生まれた瞬間の月の位置で決まるので、あなたが知っている西洋占星術の星座とは違うことがよくあります。\n▼ あなたの本当の月星座を無料で確認',
  en: 'The sign in this video is your sidereal Moon sign, the one Jyotish (Indian astrology) reads. It comes from where the Moon stood at your birth, so it is often not the Western sun sign you know.\n▼ Check your real Moon sign free',
  es: 'El signo de este video es tu signo lunar sideral, el que lee el Jyotish (astrología india). Depende de dónde estaba la Luna al nacer, así que muchas veces no coincide con el signo solar occidental que conoces.\n▼ Consulta gratis tu verdadero signo lunar',
  pt: 'O signo deste vídeo é o seu signo lunar sideral, o que o Jyotish (astrologia indiana) lê. Ele vem de onde a Lua estava no seu nascimento, por isso muitas vezes não é o signo solar ocidental que você conhece.\n▼ Veja gratuitamente o seu verdadeiro signo lunar',
  id: 'Zodiak dalam video ini adalah zodiak bulan sideral, yang dibaca dalam Jyotish (astrologi India). Zodiak ini ditentukan posisi Bulan saat Anda lahir, jadi sering berbeda dari zodiak matahari versi Barat yang Anda kenal.\n▼ Cek gratis zodiak bulan Anda yang sebenarnya',
  ar: 'البرج في هذا الفيديو هو برج القمر الفلكي الذي يعتمده الجيوتيش (التنجيم الهندي). يُحدَّد بموضع القمر لحظة ميلادك، ولذلك يختلف كثيرًا عن برج الشمس الغربي الذي تعرفه.\n▼ تعرّف مجانًا على برج القمر الحقيقي الخاص بك',
  fr: 'Le signe de cette vidéo est votre signe lunaire sidéral, celui que lit le Jyotish (astrologie indienne). Il dépend de la position de la Lune à votre naissance, il diffère donc souvent du signe solaire occidental que vous connaissez.\n▼ Vérifiez gratuitement votre vrai signe lunaire',
  de: 'Das Sternzeichen in diesem Video ist dein siderisches Mondzeichen, das im Jyotish (indische Astrologie) gelesen wird. Es ergibt sich aus dem Stand des Mondes bei deiner Geburt und weicht deshalb oft von deinem westlichen Sonnenzeichen ab.\n▼ Dein echtes Mondzeichen kostenlos prüfen',
};

export function youtubeNote(lang: Language): string {
  return `${YOUTUBE_NOTE[lang]}\n${commentUrl(lang)}`;
}

/**
 * Hashtag search only surfaces an account that keeps using the same tags, so captions lead with a
 * fixed set per language and the generated tags fill the remaining slots.
 */
const CORE_HASHTAGS: Record<Language, readonly string[]> = {
  ja: ['#インド占星術', '#ジョーティシュ', '#月星座'],
  en: ['#VedicAstrology', '#Jyotish', '#MoonSign'],
  es: ['#AstrologiaVedica', '#Jyotish', '#SignoLunar'],
  pt: ['#AstrologiaVedica', '#Jyotish', '#SignoLunar'],
  id: ['#AstrologiVeda', '#Jyotish', '#ZodiakBulan'],
  ar: ['#التنجيم_الهندي', '#جيوتيش', '#برج_القمر'],
  fr: ['#AstrologieVedique', '#Jyotish', '#SigneLunaire'],
  de: ['#VedischeAstrologie', '#Jyotish', '#Mondzeichen'],
};

/** Kept in every caption, so the account's own tag collects the whole catalogue. */
const BRAND_HASHTAG = '#LibertasJyotish';

/**
 * Instagram holds a reel back when its caption repeats one already posted, and the blocks below
 * the body are word for word the same across a day's posts. Each post therefore picks its own
 * wording and tag order from a seed that stays stable for that post, so a retry posts the same
 * caption while two posts of the same day do not.
 */
function variantIndex(seed: string | undefined, count: number): number {
  if (!seed) return 0;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 2147483647;
  return hash % count;
}

function rotate<T>(items: readonly T[], by: number): T[] {
  const offset = ((by % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

/** Both wordings say the sign is a sidereal Moon sign; alternating them breaks the repetition. */
function moonSignNote(lang: Language, variant: number): string {
  return variant % 2 === 0 ? MOON_SIGN_CAPTION[lang] : YOUTUBE_NOTE[lang].split('\n')[0];
}

/** A sign name is a searched tag of its own and differs between the posts of one day. */
function signHashtag(zodiacSign?: string): string[] {
  if (!zodiacSign) return [];
  return [`#${zodiacSign.replace(/[\s·|/]+/g, '')}`];
}

/** YouTube treats long hashtag lists as spam, so keep only the leading few. */
export function limitHashtags(hashtags: string, max = 4): string {
  return hashtags
    .split(/\s+/)
    .filter((tag) => tag.startsWith('#'))
    .slice(0, max)
    .join(' ');
}

export function captionHashtags(
  lang: Language,
  generated: string,
  max: number,
  variant = 0,
  zodiacSign?: string,
): string {
  const tags: string[] = [];
  const seen = new Set<string>();
  const candidates = [
    ...signHashtag(zodiacSign),
    ...rotate(CORE_HASHTAGS[lang], variant),
    BRAND_HASHTAG,
    ...generated.split(/\s+/).filter((tag) => tag.startsWith('#')),
  ];
  for (const tag of candidates) {
    if (seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags.slice(0, max).join(' ');
}

/**
 * A viewer only knows the sun sign a Western horoscope gave them, so every caption that names
 * a sign says up front which sign it means; the answer is on the site, which is where the CTA
 * below already sends them.
 */
export const MOON_SIGN_CAPTION: Record<Language, string> = {
  ja: '※この星座はインド占星術（ジョーティシュ）の月星座です。西洋占星術の星座とは違うことがよくあります。',
  en: 'Note: this sign is your sidereal Moon sign, the one Jyotish (Indian astrology) reads. It is often not the Western sun sign you know.',
  es: 'Nota: este signo es tu signo lunar sideral, el que lee el Jyotish (astrología india). Muchas veces no coincide con el signo solar occidental que conoces.',
  pt: 'Nota: este signo é o seu signo lunar sideral, o que o Jyotish (astrologia indiana) lê. Muitas vezes não é o signo solar ocidental que você conhece.',
  id: 'Catatan: zodiak ini adalah zodiak bulan sideral yang dibaca dalam Jyotish (astrologi India). Sering berbeda dari zodiak matahari versi Barat yang Anda kenal.',
  ar: 'ملاحظة: هذا البرج هو برج القمر الفلكي الذي يعتمده الجيوتيش (التنجيم الهندي)، وهو غالبًا يختلف عن برج الشمس الغربي الذي تعرفه.',
  fr: 'Note : ce signe est votre signe lunaire sidéral, celui que lit le Jyotish (astrologie indienne). Il diffère souvent du signe solaire occidental que vous connaissez.',
  de: 'Hinweis: Dieses Sternzeichen ist dein siderisches Mondzeichen, das im Jyotish (indische Astrologie) gelesen wird. Es weicht oft von deinem westlichen Sonnenzeichen ab.',
};

export interface DescriptionParams {
  lang: Language;
  body: string;
  hashtags: string;
  platform?: 'default' | 'tiktok' | 'instagram' | 'threads' | 'facebook';
  /** Dated week a sign reading covers; it opens the caption so older posts date themselves. */
  period?: string;
  /** YouTube channel the video is uploaded to; adds the subscribe link to the description. */
  subscribeChannelId?: string;
  /** Opens the caption with the note that the sign named is a sidereal Moon sign. */
  moonSign?: boolean;
  /**
   * Searched phrase of the video, repeated as the opening line: search reads the start of a
   * description, where the body script alone never names the sign or the format.
   */
  keywordLine?: string;
  /**
   * Sends the viewer to the daily reading instead of the one-off report. A sign reading repeats
   * every day on the site, so it carries the subscription; the Thursday report promo does not.
   */
  daily?: boolean;
  /** Sign of the video; its name becomes a hashtag of its own. */
  zodiacSign?: string;
  /** Names the video in `utm_content`, so each post's links report their own traffic. */
  linkTag?: string;
  /**
   * Picks the wording and tag order of the fixed blocks. A caption that repeats an earlier one
   * word for word is held back, and every post of a day shares those blocks.
   */
  variantSeed?: string;
}

export function buildDescription({
  lang,
  body,
  hashtags,
  platform,
  period,
  subscribeChannelId,
  moonSign,
  keywordLine,
  daily: toDaily,
  zodiacSign,
  linkTag,
  variantSeed,
}: DescriptionParams): string {
  const variant = variantIndex(variantSeed, 6);
  const cta =
    platform === 'tiktok'
      ? tiktokDescriptionCta(lang)
      : platform === 'threads' || platform === 'facebook'
        ? linkCta(lang, platform, linkTag)
        : descriptionCta(lang, platform === 'instagram' ? 'instagram' : 'youtube', linkTag);
  // Threads cuts the text at 500 characters, so there the daily reading rides the reply instead.
  const daily = !toDaily
    ? undefined
    : platform === 'threads'
      ? undefined
      : platform === 'tiktok'
        ? `${DAILY_CTA[lang]}\n${SITE_DOMAIN}/${lang}/mypage`
        : dailyCta(lang, platform ?? 'youtube', 'caption', linkTag);
  const subscribe = subscribeChannelId ? subscribeBlock(lang, subscribeChannelId) : undefined;
  const tags = captionHashtags(
    lang,
    hashtags,
    platform === 'instagram' ? 7 : 5,
    variant,
    zodiacSign,
  );
  // A feed shows only the first line, so the sign and the week lead and the note follows the body.
  return [
    keywordLine,
    period,
    body,
    moonSign ? moonSignNote(lang, variant) : undefined,
    cta,
    daily,
    subscribe,
    tags,
  ]
    .filter(Boolean)
    .join('\n\n');
}
