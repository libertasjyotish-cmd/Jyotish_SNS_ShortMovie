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

const CTA_HEADLINE: Record<Language, string> = {
  ja: '▼ あなたの本当の星座を調べる',
  en: '▼ Find your true sidereal sign',
  es: '▼ Descubre tu verdadero signo sideral',
  pt: '▼ Descubra seu verdadeiro signo sideral',
  id: '▼ Temukan zodiak sideralmu yang sebenarnya',
  ar: '▼ اكتشف برجك الحقيقي',
  fr: '▼ Découvrez votre véritable signe sidéral',
  de: '▼ Finde dein wahres siderisches Sternzeichen',
};

/** Shorts descriptions render URLs as plain text, so the profile link is the only tappable route. */
export const DESCRIPTION_CTA: Record<Language, string> = {
  ja: `${CTA_HEADLINE.ja}\nプロフィールのリンクから\n${SITE_URL}`,
  en: `${CTA_HEADLINE.en}\nTap the link in our profile\n${SITE_URL}`,
  es: `${CTA_HEADLINE.es}\nToca el enlace en el perfil\n${SITE_URL}`,
  pt: `${CTA_HEADLINE.pt}\nToque no link do perfil\n${SITE_URL}`,
  id: `${CTA_HEADLINE.id}\nKetuk tautan di profil\n${SITE_URL}`,
  ar: `${CTA_HEADLINE.ar}\nاضغط على الرابط في الملف الشخصي\n${SITE_URL}`,
  fr: `${CTA_HEADLINE.fr}\nTouchez le lien dans notre profil\n${SITE_URL}`,
  de: `${CTA_HEADLINE.de}\nTippe auf den Link in unserem Profil\n${SITE_URL}`,
};

function siteLink(source: string): string {
  return `${SITE_URL}/?utm_source=${source}&utm_medium=caption`;
}

/**
 * Threads and Facebook turn a URL in the body into a tappable link, unlike an Instagram caption or
 * a Shorts description, so those two get the site link itself instead of the profile detour.
 */
function linkCta(lang: Language, source: 'threads' | 'facebook'): string {
  return `${CTA_HEADLINE[lang]}\n${siteLink(source)}`;
}

/** TikTok profile links need 1,000 followers, so the domain is spelled out instead. */
export const TIKTOK_DESCRIPTION_CTA: Record<Language, string> = {
  ja: `▼ あなたの本当の星座を調べる
検索: ${SITE_DOMAIN}`,
  en: `▼ Find your true sidereal sign
Search: ${SITE_DOMAIN}`,
  es: `▼ Descubre tu verdadero signo sideral
Busca: ${SITE_DOMAIN}`,
  pt: `▼ Descubra seu verdadeiro signo sideral
Busque: ${SITE_DOMAIN}`,
  id: `▼ Temukan zodiak sideralmu yang sebenarnya
Cari: ${SITE_DOMAIN}`,
  ar: `▼ اكتشف برجك الحقيقي
ابحث عن: ${SITE_DOMAIN}`,
  fr: `▼ Découvrez votre véritable signe sidéral
Recherchez : ${SITE_DOMAIN}`,
  de: `▼ Finde dein wahres siderisches Sternzeichen
Suche: ${SITE_DOMAIN}`,
};

/** Comments render the URL as a tappable link, unlike a Shorts description. */
export const COMMENT_URL = `${SITE_URL}/?utm_source=youtube&utm_medium=comment`;

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
export function youtubeComment(lang: Language, channelId?: string): string {
  return [YOUTUBE_COMMENT[lang], channelId ? subscribeBlock(lang, channelId) : undefined]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Posted under every upload. It names what the sign in the video actually is, so a viewer who
 * only knows their Western sun sign has a reason to look their own up.
 */
export const YOUTUBE_COMMENT: Record<Language, string> = {
  ja: `この動画の星座は、インド占星術（ジョーティシュ）で使うサイデリアル月星座です。生まれた瞬間の月の位置で決まるので、あなたが知っている西洋占星術の星座とは違うことがよくあります。\n▼ あなたの本当の月星座を無料で確認\n${COMMENT_URL}`,
  en: `The sign in this video is your sidereal Moon sign, the one Jyotish (Indian astrology) reads. It comes from where the Moon stood at your birth, so it is often not the Western sun sign you know.\n▼ Check your real Moon sign free\n${COMMENT_URL}`,
  es: `El signo de este video es tu signo lunar sideral, el que lee el Jyotish (astrología india). Depende de dónde estaba la Luna al nacer, así que muchas veces no coincide con el signo solar occidental que conoces.\n▼ Consulta gratis tu verdadero signo lunar\n${COMMENT_URL}`,
  pt: `O signo deste vídeo é o seu signo lunar sideral, o que o Jyotish (astrologia indiana) lê. Ele vem de onde a Lua estava no seu nascimento, por isso muitas vezes não é o signo solar ocidental que você conhece.\n▼ Veja gratuitamente o seu verdadeiro signo lunar\n${COMMENT_URL}`,
  id: `Zodiak dalam video ini adalah zodiak bulan sideral, yang dibaca dalam Jyotish (astrologi India). Zodiak ini ditentukan posisi Bulan saat Anda lahir, jadi sering berbeda dari zodiak matahari versi Barat yang Anda kenal.\n▼ Cek gratis zodiak bulan Anda yang sebenarnya\n${COMMENT_URL}`,
  ar: `البرج في هذا الفيديو هو برج القمر الفلكي الذي يعتمده الجيوتيش (التنجيم الهندي). يُحدَّد بموضع القمر لحظة ميلادك، ولذلك يختلف كثيرًا عن برج الشمس الغربي الذي تعرفه.\n▼ تعرّف مجانًا على برج القمر الحقيقي الخاص بك\n${COMMENT_URL}`,
  fr: `Le signe de cette vidéo est votre signe lunaire sidéral, celui que lit le Jyotish (astrologie indienne). Il dépend de la position de la Lune à votre naissance, il diffère donc souvent du signe solaire occidental que vous connaissez.\n▼ Vérifiez gratuitement votre vrai signe lunaire\n${COMMENT_URL}`,
  de: `Das Sternzeichen in diesem Video ist dein siderisches Mondzeichen, das im Jyotish (indische Astrologie) gelesen wird. Es ergibt sich aus dem Stand des Mondes bei deiner Geburt und weicht deshalb oft von deinem westlichen Sonnenzeichen ab.\n▼ Dein echtes Mondzeichen kostenlos prüfen\n${COMMENT_URL}`,
};

/**
 * Hashtag search only surfaces an account that keeps using the same tags, so captions lead with a
 * fixed set per language and the generated tags fill the remaining slots.
 */
const CORE_HASHTAGS: Record<Language, readonly string[]> = {
  ja: ['#インド占星術', '#ジョーティシュ', '#月星座', '#LibertasJyotish'],
  en: ['#VedicAstrology', '#Jyotish', '#MoonSign', '#LibertasJyotish'],
  es: ['#AstrologiaVedica', '#Jyotish', '#SignoLunar', '#LibertasJyotish'],
  pt: ['#AstrologiaVedica', '#Jyotish', '#SignoLunar', '#LibertasJyotish'],
  id: ['#AstrologiVeda', '#Jyotish', '#ZodiakBulan', '#LibertasJyotish'],
  ar: ['#التنجيم_الهندي', '#جيوتيش', '#برج_القمر', '#LibertasJyotish'],
  fr: ['#AstrologieVedique', '#Jyotish', '#SigneLunaire', '#LibertasJyotish'],
  de: ['#VedischeAstrologie', '#Jyotish', '#Mondzeichen', '#LibertasJyotish'],
};

/** YouTube treats long hashtag lists as spam, so keep only the leading few. */
export function limitHashtags(hashtags: string, max = 4): string {
  return hashtags
    .split(/\s+/)
    .filter((tag) => tag.startsWith('#'))
    .slice(0, max)
    .join(' ');
}

export function captionHashtags(lang: Language, generated: string, max: number): string {
  const tags = [...CORE_HASHTAGS[lang]];
  const seen = new Set(tags.map((tag) => tag.toLowerCase()));
  for (const tag of generated.split(/\s+/).filter((tag) => tag.startsWith('#'))) {
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
}

export function buildDescription({
  lang,
  body,
  hashtags,
  platform,
  period,
  subscribeChannelId,
  moonSign,
}: DescriptionParams): string {
  const cta =
    platform === 'tiktok'
      ? TIKTOK_DESCRIPTION_CTA[lang]
      : platform === 'threads' || platform === 'facebook'
        ? linkCta(lang, platform)
        : DESCRIPTION_CTA[lang];
  const subscribe = subscribeChannelId ? subscribeBlock(lang, subscribeChannelId) : undefined;
  const tags = captionHashtags(lang, hashtags, platform === 'instagram' ? 6 : 4);
  return [moonSign ? MOON_SIGN_CAPTION[lang] : undefined, period, body, cta, subscribe, tags]
    .filter(Boolean)
    .join('\n\n');
}
