/** Wanted public profile copy for the eight Facebook pages. */
import { SITE_URL } from '@/lib/cta';
import { Language } from '@/services/sheets';

/** Facebook caps the short description at 255 characters. */
export const ABOUT: Record<Language, string> = {
  ja: 'インド占星術（サイデリアル・Lahiri）で読む、あなたの本当の星座。毎日の運勢と、星座別の週間動画を配信しています。無料の星座チェックと毎日の鑑定はサイトから。娯楽目的のコンテンツです。',
  en: 'Your true sign, read with Indian astrology (sidereal, Lahiri). Daily readings plus weekly videos for every sign. Free sign check and the daily reading on our site. For entertainment purposes.',
  es: 'Tu signo verdadero según la astrología india (sideral, Lahiri). Lectura diaria y vídeos semanales de cada signo. Consulta gratis tu signo en la web. Contenido de entretenimiento.',
  pt: 'Seu signo verdadeiro pela astrologia indiana (sideral, Lahiri). Leitura diária e vídeos semanais de cada signo. Descubra seu signo gratuitamente no site. Conteúdo de entretenimento.',
  id: 'Zodiak aslimu menurut astrologi India (sideral, Lahiri). Ramalan harian dan video mingguan tiap zodiak. Cek zodiakmu gratis di situs kami. Konten hiburan.',
  ar: 'برجك الحقيقي وفق علم التنجيم الهندي (الفلكي، لاهيري). قراءة يومية وفيديوهات أسبوعية لكل برج. تحقّق من برجك مجانًا على موقعنا. محتوى للترفيه.',
  fr: 'Votre vrai signe selon l’astrologie indienne (sidérale, Lahiri). Lecture quotidienne et vidéos hebdomadaires pour chaque signe. Signe gratuit sur notre site. Contenu de divertissement.',
  de: 'Dein wahres Sternzeichen nach indischer Astrologie (siderisch, Lahiri). Tägliche Deutung und wöchentliche Videos je Zeichen. Kostenloser Zeichen-Check auf der Website. Nur zur Unterhaltung.',
};

export function website(lang: Language): string {
  return `${SITE_URL}/${lang}/mypage?utm_source=facebook&utm_medium=profile#premium`;
}
