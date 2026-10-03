/**
 * Explains why a language's recent uploads stopped getting views.
 *
 * Usage: npm run diagnose:reach -- <lang> [count]
 * Prints, newest first, each posted video's publish time, lifetime views and the fields that
 * silently kill reach (privacy, processing, made-for-kids, missing tags/thumbnail), then the
 * channel's daily views and traffic sources. Reads only: 1 quota unit per 50 videos.
 * YouTube Analytics lags 1-2 days, so compare publish-day against publish-day, never totals.
 */
import { google } from 'googleapis';
import type { Language } from '@/lib/languages';
import { GoogleSheetsService } from '@/services/sheets';

const [langArg, countArg] = process.argv.slice(2);
const lang = (langArg ?? 'en') as Language;
const count = Number(countArg ?? 24);

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const sheets = new GoogleSheetsService();
  const channel = await sheets.getChannelConfig(lang, 'YouTube');
  if (!channel?.youtube_refresh_token) throw new Error(`${lang}: no YouTube channel`);

  const auth = new google.auth.OAuth2(
    channel.youtube_client_id ?? undefined,
    channel.youtube_client_secret ?? undefined,
  );
  auth.setCredentials({ refresh_token: channel.youtube_refresh_token });
  const yt = google.youtube({ version: 'v3', auth });
  const analytics = google.youtubeAnalytics({ version: 'v2', auth });

  const queue = await sheets.getAllQueueTasks();
  const posted = queue
    .filter((t) => t.lang_code === lang)
    .map((t) => ({
      task: t,
      videoId: (t.posted_refs ?? []).find(
        (r: { platform: string; post_id?: string }) => r.platform === 'YouTube',
      )?.post_id,
    }))
    .filter((p): p is { task: (typeof queue)[number]; videoId: string } => Boolean(p.videoId))
    .slice(-count);

  for (let i = 0; i < posted.length; i += 50) {
    const batch = posted.slice(i, i + 50);
    const res = await yt.videos.list({
      part: ['snippet', 'status', 'statistics', 'contentDetails'],
      id: batch.map((b) => b.videoId),
    });
    const byId = new Map((res.data.items ?? []).map((v) => [v.id, v]));
    for (const { task, videoId } of batch) {
      const v = byId.get(videoId);
      if (!v) {
        console.log(`${task.task_id} ${videoId} MISSING (deleted or not visible)`);
        continue;
      }
      const flags = [
        v.status?.privacyStatus !== 'public' ? `privacy=${v.status?.privacyStatus}` : null,
        v.status?.uploadStatus !== 'processed' ? `upload=${v.status?.uploadStatus}` : null,
        v.status?.rejectionReason ? `rejected=${v.status.rejectionReason}` : null,
        v.status?.madeForKids ? 'madeForKids' : null,
        (v.snippet?.tags ?? []).length === 0 ? 'no tags' : null,
        v.snippet?.thumbnails?.maxres ? null : 'no custom thumbnail',
        v.contentDetails?.regionRestriction ? 'region restricted' : null,
      ].filter(Boolean);
      console.log(
        `${task.week_id} ${task.task_id} pub=${v.snippet?.publishedAt} views=${v.statistics?.viewCount ?? '?'} ${flags.length ? `[${flags.join(', ')}]` : 'ok'}`,
      );
      console.log(`  ${v.snippet?.title}`);
    }
  }

  const end = new Date();
  const start = new Date(end.getTime() - 21 * 24 * 3600 * 1000);
  for (const dimensions of ['day', 'insightTrafficSourceType']) {
    const report = await analytics.reports.query({
      ids: 'channel==MINE',
      startDate: dateOnly(start),
      endDate: dateOnly(end),
      metrics: 'views,averageViewPercentage',
      dimensions,
      sort: dimensions === 'day' ? 'day' : '-views',
    });
    console.log(`--- ${dimensions}`);
    for (const row of report.data.rows ?? []) console.log(' ', row.join('\t'));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
