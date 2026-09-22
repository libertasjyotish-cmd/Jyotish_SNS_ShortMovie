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

/** Shorts descriptions render URLs as plain text, so the profile link is the only tappable route. */
export const DESCRIPTION_CTA: Record<Language, string> = {
  ja: `▼ あなたの本当の星座を調べる\nプロフィールのリンクから\n${SITE_URL}`,
  en: `▼ Find your true sidereal sign\nTap the link in our profile\n${SITE_URL}`,
  es: `▼ Descubre tu verdadero signo sideral\nToca el enlace en el perfil\n${SITE_URL}`,
  pt: `▼ Descubra seu verdadeiro signo sideral\nToque no link do perfil\n${SITE_URL}`,
  id: `▼ Temukan zodiak sideralmu yang sebenarnya\nKetuk tautan di profil\n${SITE_URL}`,
  ar: `▼ اكتشف برجك الحقيقي\nاضغط على الرابط في الملف الشخصي\n${SITE_URL}`,
  fr: `▼ Découvrez votre véritable signe sidéral\nTouchez le lien dans notre profil\n${SITE_URL}`,
  de: `▼ Finde dein wahres siderisches Sternzeichen\nTippe auf den Link in unserem Profil\n${SITE_URL}`,
};

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

/** Required so astrology content is not read as medical, financial or legal advice. */
export const DISCLAIMERS: Record<Language, string> = {
  ja: 'エンターテインメントを目的とした内容です。医療・投資・法律上の判断は専門家にご相談ください。',
  en: 'For entertainment purposes only. Consult a professional for medical, financial or legal decisions.',
  es: 'Solo con fines de entretenimiento. Consulta a un profesional para decisiones médicas, financieras o legales.',
  pt: 'Apenas para entretenimento. Consulte um profissional para decisões médicas, financeiras ou jurídicas.',
  id: 'Hanya untuk hiburan. Konsultasikan dengan profesional untuk keputusan medis, keuangan, atau hukum.',
  ar: 'المحتوى لأغراض الترفيه فقط. استشر مختصاً في القرارات الطبية أو المالية أو القانونية.',
  fr: "À des fins de divertissement uniquement. Consultez un professionnel pour toute décision médicale, financière ou juridique.",
  de: 'Nur zu Unterhaltungszwecken. Wende dich bei medizinischen, finanziellen oder rechtlichen Entscheidungen an Fachleute.',
};

/** YouTube treats long hashtag lists as spam, so keep only the leading few. */
export function limitHashtags(hashtags: string, max = 4): string {
  return hashtags
    .split(/\s+/)
    .filter((tag) => tag.startsWith('#'))
    .slice(0, max)
    .join(' ');
}

export interface DescriptionParams {
  lang: Language;
  body: string;
  hashtags: string;
  platform?: 'default' | 'tiktok';
  /** Dated week a sign reading covers; it opens the caption so older posts date themselves. */
  period?: string;
}

export function buildDescription({
  lang,
  body,
  hashtags,
  platform,
  period,
}: DescriptionParams): string {
  const cta = platform === 'tiktok' ? TIKTOK_DESCRIPTION_CTA[lang] : DESCRIPTION_CTA[lang];
  return [period, body, cta, DISCLAIMERS[lang], limitHashtags(hashtags)]
    .filter(Boolean)
    .join('\n\n');
}
