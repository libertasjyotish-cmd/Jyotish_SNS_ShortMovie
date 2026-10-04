/**
 * Puts the language path into the site URL of every YouTube channel's About text.
 *
 * Usage: npm run sync:youtube-about -- [lang...] [--apply]
 * The site serves `/` in Japanese whatever the viewer's language is, so a bare link in a
 * non-Japanese channel's About sends that audience to a Japanese page. Rewrites only the URL
 * (the copy is left as the user wrote it) and appends a link line to a channel that has none.
 * Dry-run unless --apply is passed. Costs 50 quota units per updated channel.
 */
import { google } from 'googleapis';
import { CTA_HEADLINE, SITE_URL } from '@/lib/cta';
import { LANGUAGES, Language } from '@/lib/languages';
import { GoogleSheetsService } from '@/services/sheets';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const langs = (args.filter((a) => !a.startsWith('--')) as Language[]).filter((l) =>
  LANGUAGES.includes(l),
);
const targets = langs.length > 0 ? langs : LANGUAGES;

/** Matches the site URL only when it is not already followed by a language path. */
function bareSiteUrl(): RegExp {
  return new RegExp(`${SITE_URL.replace(/\./g, '\\.')}(?!/[a-z])/?`, 'g');
}

export function withLanguagePath(description: string, lang: Language): string {
  const site = `${SITE_URL}/${lang}`;
  if (bareSiteUrl().test(description)) return description.replace(bareSiteUrl(), site);
  if (description.includes(site)) return description;
  return `${description.trimEnd()}\n\n${CTA_HEADLINE[lang]}\n${site}`;
}

async function main() {
  const sheets = new GoogleSheetsService();
  for (const lang of targets) {
    const channel = await sheets.getChannelConfig(lang, 'YouTube');
    if (!channel?.youtube_refresh_token) {
      console.log(`${lang}: no YouTube channel, skipped`);
      continue;
    }
    const auth = new google.auth.OAuth2(
      channel.youtube_client_id ?? undefined,
      channel.youtube_client_secret ?? undefined,
    );
    auth.setCredentials({ refresh_token: channel.youtube_refresh_token });
    const yt = google.youtube({ version: 'v3', auth });

    const current = await yt.channels.list({ part: ['brandingSettings'], mine: true });
    const item = current.data.items?.[0];
    const branding = item?.brandingSettings;
    const description = branding?.channel?.description ?? '';
    const wanted = withLanguagePath(description, lang);
    if (wanted === description) {
      console.log(`${lang}: already language-specific`);
      continue;
    }
    console.log(`${lang}: ${apply ? 'updating' : 'would update'}\n${wanted}\n`);
    if (!apply || !item?.id) continue;
    await yt.channels.update({
      part: ['brandingSettings'],
      requestBody: {
        id: item.id,
        brandingSettings: { ...branding, channel: { ...branding?.channel, description: wanted } },
      },
    });
  }
}

void main();
