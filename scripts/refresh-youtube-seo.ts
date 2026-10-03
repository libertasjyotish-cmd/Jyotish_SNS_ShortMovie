/**
 * Backfills sign tags and the keyword opening line onto already-posted YouTube videos.
 *
 * Usage: npm run refresh:seo -- [lang...] [week...] [--apply]
 *   e.g. npm run refresh:seo -- fr de 2026-W40 --apply
 * Without `--apply` it only prints what would change. Quota: 1 unit per video read,
 * 50 per write, so run it after the day's uploads and keep the language list small.
 */
import { google } from 'googleapis';
import { parseSignThemeId } from '@/lib/sign-themes';
import { zodiacName } from '@/lib/zodiac-names';
import { buildVideoTags } from '@/lib/youtube-seo';
import { GoogleSheetsService } from '@/services/sheets';
import { LANGUAGES, type Language } from '@/lib/languages';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const weeks = args.filter((a) => /^\d{4}-W\d+$/.test(a));
const langs = args.filter((a): a is Language => (LANGUAGES as readonly string[]).includes(a));

/** YouTube returns tags alphabetically, so only membership can be compared. */
function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');
}

async function main() {
  const sheets = new GoogleSheetsService();
  const queue = await sheets.getAllQueueTasks();
  const tasks = queue.filter(
    (t) =>
      (weeks.length === 0 || weeks.includes(t.week_id)) &&
      (langs.length === 0 || langs.includes(t.lang_code)) &&
      (t.posted_refs ?? []).some((r) => r.platform === 'YouTube' && r.post_id),
  );
  const byLang: Partial<Record<Language, typeof tasks>> = {};
  for (const t of tasks) byLang[t.lang_code] = [...(byLang[t.lang_code] ?? []), t];

  let changed = 0;
  for (const lang of LANGUAGES) {
    const rows = byLang[lang];
    if (!rows) continue;
    const channel = await sheets.getChannelConfig(lang, 'YouTube');
    if (!channel?.youtube_refresh_token) {
      console.log(lang, 'no channel');
      continue;
    }
    const auth = new google.auth.OAuth2(
      channel.youtube_client_id ?? undefined,
      channel.youtube_client_secret ?? undefined,
    );
    auth.setCredentials({ refresh_token: channel.youtube_refresh_token });
    const yt = google.youtube({ version: 'v3', auth });

    for (const task of rows) {
      const videoId = (task.posted_refs ?? []).find(
        (r: { platform: string; post_id?: string }) => r.platform === 'YouTube',
      )?.post_id;
      if (!videoId) continue;
      const current = await yt.videos.list({ part: ['snippet'], id: [videoId] });
      const snippet = current.data.items?.[0]?.snippet;
      if (!snippet?.title) {
        console.log(lang, task.task_id, videoId, 'missing video');
        continue;
      }
      const series = task.theme_id ? parseSignThemeId(task.theme_id)?.series : undefined;
      const tags = buildVideoTags({
        lang: task.lang_code,
        zodiacSign: zodiacName(task.zodiac_sign, task.lang_code),
        series,
      });
      const description = snippet.description ?? '';
      // The title carries the searched phrase, which the body script never names on its own.
      const withKeyword = description.startsWith(snippet.title)
        ? description
        : `${snippet.title}\n\n${description}`;
      if (withKeyword === description && sameTags(snippet.tags ?? [], tags)) continue;
      changed += 1;
      const reasons = [
        withKeyword === description ? null : 'description',
        sameTags(snippet.tags ?? [], tags) ? null : 'tags',
      ].filter(Boolean);
      console.log(
        `${apply ? 'FIX ' : 'DIFF'} ${lang} ${task.week_id} ${task.task_id} (${reasons.join('+')})`,
      );
      console.log('  now:', (snippet.tags ?? []).slice(0, 4).join(', ') || '(none)');
      console.log('  new:', tags.slice(0, 4).join(', '));
      if (!apply) continue;
      await yt.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            title: snippet.title,
            description: withKeyword,
            tags,
            categoryId: snippet.categoryId,
            defaultLanguage: snippet.defaultLanguage,
            defaultAudioLanguage: snippet.defaultAudioLanguage,
          },
        },
      });
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  console.log('changed', changed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
