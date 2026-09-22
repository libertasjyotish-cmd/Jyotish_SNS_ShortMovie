import { NextRequest, NextResponse } from 'next/server';
import { adminTokenMatches, isAdminAuthorized } from '@/lib/admin-auth';
import { buildDescription } from '@/lib/cta';
import { weekPeriodLabel } from '@/lib/period';
import { GeneratedScript } from '@/services/gemini';
import { DayOfWeek } from '@/lib/schedule';
import { ContentQueue, GoogleSheetsService, Language } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_DAYS = 7;

type TikTokAccount = 'ja' | 'global';

/**
 * TikTok needs one phone number per account, so the eight languages share two accounts: `ja`
 * carries the Japanese theme videos and `global` carries the rest, English every week and the
 * other six on alternating ISO weeks, one per day.
 */
const GLOBAL_ROTATION: Record<DayOfWeek, [Language, Language]> = {
  Mon: ['en', 'en'],
  Tue: ['es', 'de'],
  Wed: ['pt', 'id'],
  Thu: ['fr', 'ar'],
  Fri: ['en', 'en'],
  Sat: ['en', 'en'],
  Sun: ['en', 'en'],
};

function isOddWeek(week_id: string): boolean {
  return Number(week_id.split('-W')[1]) % 2 === 1;
}

function belongsToAccount(task: ContentQueue, account: TikTokAccount): boolean {
  if (account === 'ja') return task.lang_code === 'ja';
  if (task.lang_code === 'ja') return false;
  const pair = GLOBAL_ROTATION[task.day_of_week as DayOfWeek];
  return Boolean(pair) && task.lang_code === pair[isOddWeek(task.week_id) ? 0 : 1];
}

interface ManualItem {
  task_id: string;
  lang_code: Language;
  scheduled_post_time: string;
  target: string;
  video_url: string;
  caption: string;
}

/**
 * Worklist for the manual TikTok upload: TikTok never appears in the dispatch because its
 * Content Posting API app was rejected for own-account publishing, so the 65s renders and
 * their captions are listed here and uploaded through TikTok Studio by hand.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (!isAdminAuthorized(request) && !adminTokenMatches(params.get('token') ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = Number(params.get('days') ?? DEFAULT_DAYS);
  const lang = params.get('lang');
  const includeZodiac = params.get('include_zodiac') === '1';
  const account = params.get('account') as TikTokAccount | null;
  if (!Number.isFinite(days) || days <= 0) {
    return NextResponse.json({ error: 'Invalid days' }, { status: 400 });
  }
  if (account && account !== 'ja' && account !== 'global') {
    return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
  }

  try {
    const sheets = new GoogleSheetsService();
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const tasks = (await sheets.getAllQueueTasks())
      .filter((task) => task.render_status_65s === 'Rendered')
      .filter((task) => !lang || task.lang_code === lang)
      .filter((task) => includeZodiac || task.target_type !== 'Zodiac_Sign')
      .filter((task) => !account || belongsToAccount(task, account))
      .filter((task) => {
        const scheduled = new Date(task.scheduled_post_time).getTime();
        return Number.isFinite(scheduled) && scheduled >= since;
      })
      .sort((a, b) => a.scheduled_post_time.localeCompare(b.scheduled_post_time));

    const items: ManualItem[] = [];
    for (const task of tasks) {
      const [scriptOutput, renderOutput] = await Promise.all([
        sheets.getScriptOutput(task.task_id),
        sheets.getRenderOutput(task.task_id),
      ]);
      if (!scriptOutput || !renderOutput?.video_url_65s) continue;
      const script: GeneratedScript = JSON.parse(scriptOutput.script_65s_json);
      items.push({
        task_id: task.task_id,
        lang_code: task.lang_code,
        scheduled_post_time: task.scheduled_post_time,
        target: task.zodiac_sign || task.target_type,
        video_url: renderOutput.video_url_65s,
        caption: buildDescription({
          lang: task.lang_code,
          body: script.hook_text,
          hashtags: scriptOutput.hashtags,
          platform: 'tiktok',
          period:
            task.target_type === 'Zodiac_Sign'
              ? weekPeriodLabel(task.week_id, task.lang_code)
              : undefined,
        }),
      });
    }

    return NextResponse.json({
      days,
      account: account ?? null,
      include_zodiac: includeZodiac,
      count: items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('TikTok manual queue failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
