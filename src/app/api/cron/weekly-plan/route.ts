import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { optionalEnv } from '@/lib/env';
import { buildTransitReference } from '@/lib/ephemeris';
import {
  DayOfWeek,
  isoWeekId,
  isPromoScriptId,
  nextWeekStart,
  PROMO_DAY,
  scheduledPostTime,
  THEME_DAYS,
  ZODIAC_DAYS,
} from '@/lib/schedule';
import {
  ContentQueue,
  EvergreenScript,
  GoogleSheetsService,
  Language,
  LANGUAGES,
} from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function plannedLanguages(): Language[] {
  const configured = (optionalEnv('PLAN_LANGUAGES') ?? 'ja')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
  return configured.filter((code): code is Language =>
    LANGUAGES.includes(code as Language)
  );
}

/** The script that has waited longest for this day of the week. */
function pickScript(
  scripts: EvergreenScript[],
  day: DayOfWeek,
  taken: Set<string>,
  promo: boolean,
): EvergreenScript | undefined {
  return scripts
    .filter(
      (script) =>
        script.day_of_week === day &&
        isPromoScriptId(script.script_id) === promo &&
        !taken.has(script.script_id),
    )
    .sort((a, b) => a.last_used_week.localeCompare(b.last_used_week))[0];
}

/**
 * Whether the promotion takes over `PROMO_DAY` this week. Off by default: the copy is
 * written and rotated only once the product it points at is open.
 */
function promoEnabled(): boolean {
  return (optionalEnv('PROMO_ENABLED') ?? 'false').toLowerCase() === 'true';
}

function baseTask(
  weekId: string,
  day: DayOfWeek,
  weekStart: Date,
  lang: Language,
  slot?: number,
) {
  return {
    week_id: weekId,
    day_of_week: day,
    lang_code: lang,
    script_status: 'Pending' as const,
    render_status_30s: 'Pending' as const,
    render_status_65s: 'Pending' as const,
    render_attempts_30s: 0,
    render_attempts_65s: 0,
    post_status: 'Pending' as const,
    scheduled_post_time: scheduledPostTime(weekStart, day, slot),
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
    const plannedTasks = await sheets.getQueueTasks(weekId);
    const existing = new Set(plannedTasks.map((task) => task.task_id));
    // A theme slot carries a rotating script id, so its task id differs on every run;
    // the slot itself is what must stay unique.
    const filledThemeSlots = new Set(
      plannedTasks
        .filter((task) => task.target_type === 'Theme' || task.target_type === 'Promo')
        .map((task) => `${task.lang_code}/${task.day_of_week}`),
    );

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
        if (filledThemeSlots.has(`${lang}/${day}`)) continue;

        const promo = promoEnabled() && day === PROMO_DAY;
        const theme = pickScript(themes, day, taken, promo);
        if (!theme) {
          skippedDays.push(`${lang}/${day}`);
          continue;
        }
        taken.add(theme.script_id);

        const task: ContentQueue = {
          ...baseTask(weekId, day, weekStart, lang),
          task_id: `${weekId}-${lang}-${theme.script_id}`,
          target_type: promo ? 'Promo' : 'Theme',
          theme_id: theme.script_id,
        };
        if (existing.has(task.task_id)) continue;

        await sheets.addQueueTask(task);
        await sheets.markEvergreenUsed(theme.script_id, lang, weekId);
        created.push(task.task_id);
      }

      for (const { day, signs } of ZODIAC_DAYS) {
        for (let slot = 0; slot < signs.length; slot += 1) {
          const sign = signs[slot];
          const task: ContentQueue = {
            ...baseTask(weekId, day, weekStart, lang, slot),
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
