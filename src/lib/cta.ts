import { Language } from '@/services/sheets';

export const SITE_URL = 'https://www.libertas-jyotish.com';

/** Small print under the CTA button; the site link itself lives in the profile. */
export const CTA_NOTES: Record<Language, string> = {
  ja: '※プロフィール欄のサイトURLをクリック',
  en: 'Tap the link in our profile',
  es: 'Toca el enlace en el perfil',
  pt: 'Toque no link do perfil',
  id: 'Ketuk tautan di profil',
  ar: 'اضغط على الرابط في الملف الشخصي',
};

/** Shorts descriptions render URLs as plain text, so the profile link is the only tappable route. */
export const DESCRIPTION_CTA: Record<Language, string> = {
  ja: `▼ あなたの本当の星座を調べる\nプロフィールのリンクから\n${SITE_URL}`,
  en: `▼ Find your true sidereal sign\nTap the link in our profile\n${SITE_URL}`,
  es: `▼ Descubre tu verdadero signo sideral\nToca el enlace en el perfil\n${SITE_URL}`,
  pt: `▼ Descubra seu verdadeiro signo sideral\nToque no link do perfil\n${SITE_URL}`,
  id: `▼ Temukan zodiak sideralmu yang sebenarnya\nKetuk tautan di profil\n${SITE_URL}`,
  ar: `▼ اكتشف برجك الحقيقي\nاضغط على الرابط في الملف الشخصي\n${SITE_URL}`,
};

/** Required so astrology content is not read as medical, financial or legal advice. */
export const DISCLAIMERS: Record<Language, string> = {
  ja: 'エンターテインメントを目的とした内容です。医療・投資・法律上の判断は専門家にご相談ください。',
  en: 'For entertainment purposes only. Consult a professional for medical, financial or legal decisions.',
  es: 'Solo con fines de entretenimiento. Consulta a un profesional para decisiones médicas, financieras o legales.',
  pt: 'Apenas para entretenimento. Consulte um profissional para decisões médicas, financeiras ou jurídicas.',
  id: 'Hanya untuk hiburan. Konsultasikan dengan profesional untuk keputusan medis, keuangan, atau hukum.',
  ar: 'المحتوى لأغراض الترفيه فقط. استشر مختصاً في القرارات الطبية أو المالية أو القانونية.',
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
}

export function buildDescription({ lang, body, hashtags }: DescriptionParams): string {
  return [body, DESCRIPTION_CTA[lang], DISCLAIMERS[lang], limitHashtags(hashtags)]
    .filter(Boolean)
    .join('\n\n');
}
