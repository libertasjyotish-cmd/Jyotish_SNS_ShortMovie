import { NextRequest, NextResponse } from 'next/server';
import { adminTokenMatches, isAdminAuthorized } from '@/lib/admin-auth';
import { buildDescription } from '@/lib/cta';
import { GeneratedScript } from '@/services/gemini';
import { GoogleSheetsService, Language } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_DAYS = 7;

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
  if (!Number.isFinite(days) || days <= 0) {
    return NextResponse.json({ error: 'Invalid days' }, { status: 400 });
  }

  try {
    const sheets = new GoogleSheetsService();
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const tasks = (await sheets.getAllQueueTasks())
      .filter((task) => task.render_status_65s === 'Rendered')
      .filter((task) => !lang || task.lang_code === lang)
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
        }),
      });
    }

    return NextResponse.json({ days, count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('TikTok manual queue failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
