/**
 * Reports how the eight Facebook pages' public profile (short description and website) differs
 * from the wanted copy, so paid traffic always lands on the language's own daily reading page.
 *
 * `--apply` currently fails with `(#283) Requires pages_manage_metadata`: that scope is an
 * `Invalid Scope` for this app, so the diff has to be pasted by hand — `npm run print:facebook-profiles`
 * renders it as a sheet.
 *
 * Usage: `npm run sync:facebook-profiles` (dry run) / `-- --apply` (writes).
 */
import { ABOUT, website } from './facebook-profile-copy';
import { GoogleSheetsService, LANGUAGES } from '@/services/sheets';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

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
