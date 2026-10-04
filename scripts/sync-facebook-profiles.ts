/**
 * Keeps the eight Facebook pages' public profile (short description and website) identical to the
 * copy below, so paid traffic always lands on the language's own daily reading page.
 *
 * Usage: `npm run sync:facebook-profiles` (dry run) / `-- --apply` (writes).
 */
import { SITE_URL } from '@/lib/cta';
import { GoogleSheetsService, LANGUAGES, Language } from '@/services/sheets';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

/** Facebook caps the short description at 255 characters. */
const ABOUT: Record<Language, string> = {
  ja: 'インド占星術（サイデリアル・Lahiri）で読む、あなたの本当の星座。毎日の運勢と、星座別の週間動画を配信しています。無料の星座チェックと毎日の鑑定はサイトから。娯楽目的のコンテンツです。',
  en: 'Your true sign, read with Indian astrology (sidereal, Lahiri). Daily readings plus weekly videos for every sign. Free sign check and the daily reading on our site. For entertainment purposes.',
  es: 'Tu signo verdadero según la astrología india (sideral, Lahiri). Lectura diaria y vídeos semanales de cada signo. Consulta gratis tu signo en la web. Contenido de entretenimiento.',
  pt: 'Seu signo verdadeiro pela astrologia indiana (sideral, Lahiri). Leitura diária e vídeos semanais de cada signo. Descubra seu signo gratuitamente no site. Conteúdo de entretenimento.',
  id: 'Zodiak aslimu menurut astrologi India (sideral, Lahiri). Ramalan harian dan video mingguan tiap zodiak. Cek zodiakmu gratis di situs kami. Konten hiburan.',
  ar: 'برجك الحقيقي وفق علم التنجيم الهندي (الفلكي، لاهيري). قراءة يومية وفيديوهات أسبوعية لكل برج. تحقّق من برجك مجانًا على موقعنا. محتوى للترفيه.',
  fr: 'Votre vrai signe selon l’astrologie indienne (sidérale, Lahiri). Lecture quotidienne et vidéos hebdomadaires pour chaque signe. Signe gratuit sur notre site. Contenu de divertissement.',
  de: 'Dein wahres Sternzeichen nach indischer Astrologie (siderisch, Lahiri). Tägliche Deutung und wöchentliche Videos je Zeichen. Kostenloser Zeichen-Check auf der Website. Nur zur Unterhaltung.',
};

function website(lang: Language): string {
  return `${SITE_URL}/${lang}/mypage?utm_source=facebook&utm_medium=profile#premium`;
}

async function graph(
  path: string,
  params: Record<string, string>,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const query = new URLSearchParams(params);
  const url =
    init?.method === 'POST' ? `${GRAPH_BASE}/${path}` : `${GRAPH_BASE}/${path}?${query}`;
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
    ...(init?.method === 'POST'
      ? {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: query.toString(),
        }
      : {}),
  });
  const payload = (await response.json()) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `HTTP ${response.status}`);
  }
  return payload;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const sheets = new GoogleSheetsService();

  for (const lang of LANGUAGES) {
    const channel = await sheets.getChannelConfig(lang, 'Facebook');
    if (!channel?.fb_page_id || !channel.fb_page_access_token) {
      console.log(`${lang}: no Facebook page configured`);
      continue;
    }

    const token = channel.fb_page_access_token;
    const current = (await graph(channel.fb_page_id, {
      fields: 'name,about,website',
      access_token: token,
    })) as { name?: string; about?: string; website?: string };

    const wanted = { about: ABOUT[lang], website: website(lang) };
    const changes = Object.entries(wanted).filter(
      ([field, value]) => current[field as 'about' | 'website'] !== value,
    );
    if (!changes.length) {
      console.log(`${lang}: up to date`);
      continue;
    }

    console.log(`${lang}: ${changes.map(([field]) => field).join(', ')}`);
    if (!apply) continue;

    try {
      await graph(
        channel.fb_page_id,
        { ...wanted, access_token: token },
        { method: 'POST' },
      );
      console.log(`${lang}: written`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(`${lang}: failed: ${message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
