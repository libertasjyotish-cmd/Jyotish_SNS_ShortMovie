/**
 * Prints the wanted Facebook page profile text per language as an HTML sheet, for pasting by hand:
 * the Graph API rejects `pages_manage_metadata` for this app, so profiles cannot be synced.
 */
import { writeFileSync } from 'node:fs';

import { ABOUT, website } from './facebook-profile-copy';
import { GoogleSheetsService, LANGUAGES, Language } from '@/services/sheets';

const LABEL: Record<Language, string> = {
  ja: '日本語',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  id: 'Indonesia',
  ar: 'العربية',
  fr: 'Français',
  de: 'Deutsch',
};

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main(): Promise<void> {
  const sheets = new GoogleSheetsService();
  const sections: string[] = [];

  for (const lang of LANGUAGES) {
    const channel = await sheets.getChannelConfig(lang, 'Facebook');
    const pageId = channel?.fb_page_id ?? '';
    sections.push(`<section${lang === 'ar' ? ' dir="rtl"' : ''}>
  <h2>${LABEL[lang]} <span>${lang}</span></h2>
  <p class="page">${
    pageId
      ? `<a href="https://www.facebook.com/${pageId}/settings/?tab=page_info">ページ情報を編集</a> (${pageId})`
      : 'ページ未設定'
  }</p>
  <h3>紹介文 (about)</h3>
  <pre>${escape(ABOUT[lang])}</pre>
  <h3>ウェブサイト (website)</h3>
  <pre>${escape(website(lang))}</pre>
</section>`);
  }

  const html = `<!doctype html>
<html lang="ja">
<meta charset="utf-8">
<title>Facebookページ プロフィール文（8言語）</title>
<style>
  body { font: 16px/1.7 system-ui, sans-serif; margin: 0 auto; max-width: 56rem; padding: 2rem 1.25rem 4rem; color: #1c1e21; }
  h1 { font-size: 1.5rem; }
  section { border-top: 1px solid #dadde1; padding-top: 1.25rem; margin-top: 1.75rem; }
  h2 { font-size: 1.15rem; margin: 0; }
  h2 span { color: #65676b; font-weight: 400; font-size: .85rem; }
  h3 { font-size: .85rem; color: #65676b; margin: 1rem 0 .35rem; text-transform: uppercase; letter-spacing: .04em; }
  .page { margin: .35rem 0 0; font-size: .9rem; }
  pre { background: #f0f2f5; border-radius: .5rem; padding: .85rem 1rem; margin: 0; white-space: pre-wrap; word-break: break-word; font: inherit; }
</style>
<h1>Facebookページ プロフィール文（8言語）</h1>
<p>各ページの「ページ情報」で、紹介文とウェブサイトを以下のとおり貼り付けてください。</p>
${sections.join('\n')}
</html>
`;
  const out = process.argv[2] ?? 'facebook-profiles.html';
  writeFileSync(out, html);
  console.log(out);
}

void main();
