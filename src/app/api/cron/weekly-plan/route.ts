import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { optionalEnv } from '@/lib/env';
import { buildTransitReference } from '@/lib/ephemeris';
import {
  DayOfWeek,
  isoWeekId,
  nextWeekStart,
  scheduledPostTime,
  THEME_DAYS,
  ZODIAC_DAYS,
} from '@/lib/schedule';
import { ContentQueue, EvergreenScript, GoogleSheetsService, Language } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SUPPORTED_LANGUAGES: Language[] = ['ja', 'en', 'es', 'pt', 'id', 'ar'];

function plannedLanguages(): Language[] {
  const configured = (optionalEnv('PLAN_LANGUAGES') ?? 'ja')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
  return configured.filter((code): code is Language =>
    SUPPORTED_LANGUAGES.includes(code as Language)
  );
}

/** The theme that has waited longest for this day of the week. */
function pickTheme(scripts: EvergreenScript[], day: DayOfWeek, taken: Set<string>): EvergreenScript | undefined {
  return scripts
    .filter((script) => script.day_of_week === day && !taken.has(script.script_id))
    .sort((a, b) => a.last_used_week.localeCompare(b.last_used_week))[0];
}

function baseTask(weekId: string, day: DayOfWeek, weekStart: Date, lang: Language) {
  return {
    week_id: weekId,
    day_of_week: day,
    lang_code: lang,
    script_status: 'Pending' as const,
    render_status_20s: 'Pending' as const,
    render_status_65s: 'Pending' as const,
    post_status: 'Pending' as const,
    scheduled_post_time: scheduledPostTime(weekStart, day),
  };
}

/**
 * Fills next week's `Content_Queue`: evergreen themes Monday to Thursday, then the
 * twelve Moon-sign readings spread over Friday to Sunday, and computes the week's
 * transit reference the readings are written from. Re-running is safe; tasks that
 * already exist for the week are skipped and an existing transit row is kept, so a
 * manually corrected reference survives. `?recompute=1` overwrites it.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sheets = new GoogleSheetsService();
    const weekStart = nextWeekStart(new Date());
    const weekId = isoWeekId(weekStart);
    const existing = new Set((await sheets.getQueueTasks(weekId)).map((task) => task.task_id));

    const recompute = new URL(request.url).searchParams.get('recompute') === '1';
    const storedTransit = await sheets.getWeeklyTransits(weekId);
    const transitWritten = recompute || !storedTransit;
    if (transitWritten) {
      await sheets.saveWeeklyTransits({
        week_id: weekId,
        transit_data: buildTransitReference(weekId, weekStart),
      });
    }

    const created: string[] = [];
    const skippedDays: string[] = [];

    for (const lang of plannedLanguages()) {
      const themes = await sheets.getEvergreenScripts(lang);
      const taken = new Set<string>();

      for (const day of THEME_DAYS) {
        const theme = pickTheme(themes, day, taken);
        if (!theme) {
          skippedDays.push(`${lang}/${day}`);
          continue;
        }
        taken.add(theme.script_id);

        const task: ContentQueue = {
          ...baseTask(weekId, day, weekStart, lang),
          task_id: `${weekId}-${lang}-${theme.script_id}`,
          target_type: 'Theme',
          theme_id: theme.script_id,
        };
        if (existing.has(task.task_id)) continue;

        await sheets.addQueueTask(task);
        await sheets.markEvergreenUsed(theme.script_id, lang, weekId);
        created.push(task.task_id);
      }

      for (const { day, signs } of ZODIAC_DAYS) {
        for (const sign of signs) {
          const task: ContentQueue = {
            ...baseTask(weekId, day, weekStart, lang),
            task_id: `${weekId}-${lang}-${sign.toLowerCase()}`,
            target_type: 'Zodiac_Sign',
            zodiac_sign: sign,
          };
          if (existing.has(task.task_id)) continue;

          await sheets.addQueueTask(task);
          created.push(task.task_id);
        }
      }
    }

    return NextResponse.json({
      status: 'Weekly plan completed',
      week_id: weekId,
      transit_written: transitWritten,
      created: created.length,
      task_ids: created,
      skipped_theme_slots: skippedDays,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Weekly plan failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
