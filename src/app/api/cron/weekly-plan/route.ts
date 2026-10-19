import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { optionalEnv } from '@/lib/env';
import { buildTransitReference } from '@/lib/ephemeris';
import { plannedLanguages } from '@/lib/plan-languages';
import { eventScriptId, eventsForWeek } from '@/lib/event-calendar';
import {
  DayOfWeek,
  isoWeekId,
  isPromoScriptId,
  nextWeekStart,
  PROMO_DAY,
  PROMO_SLOTS,
  promoPostTime,
  scheduledPostTime,
  THEME_DAYS,
  THEME_SLOTS,
  ZODIAC_DAYS,
  zodiacPostWeekStart,
} from '@/lib/schedule';
import {
  compareSignThemePick,
  parseSignThemeId,
  SIGNS_BY_DAY,
  signThemeSlotScriptId,
} from '@/lib/sign-themes';
import {
  ContentQueue,
  EvergreenScript,
  GoogleSheetsService,
  Language,
  LANGUAGES,
} from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * The script that has waited longest for this day of the week. Days that run a sign series
 * take only that series, so the older general-audience scripts left in the sheet are never
 * picked up again in their place.
 */
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
        !script.week_id &&
        !parseSignThemeId(script.script_id) &&
        !taken.has(script.script_id),
    )
    .sort(compareSignThemePick)[0];
}

/**
 * The sign-series script a slot must carry. The slot decides it, not the order the rows sit in
 * the sheet, so Monday always speaks to aries through cancer and the whole week stays in one
 * series.
 */
function pickSignTheme(
  scripts: EvergreenScript[],
  weekId: string,
  day: DayOfWeek,
  slot: number,
): EvergreenScript | undefined {
  const scriptId = signThemeSlotScriptId(weekId, day, slot);
  return scriptId ? scripts.find((script) => script.script_id === scriptId) : undefined;
}

/**
 * The scripts for `PROMO_DAY`: the sky events of the calendar that fall from this Thursday to the
 * next (`eventsForWeek`), then product copy for the remaining slots.
 */
function pickPromoScripts(
  scripts: EvergreenScript[],
  weekStart: Date,
  taken: Set<string>,
): { script_id: string; event: boolean }[] {
  const picked = eventsForWeek(weekStart).map((e) => ({ script_id: eventScriptId(e), event: true }));
  while (picked.length < PROMO_SLOTS) {
    const product = pickScript(scripts, PROMO_DAY, taken, true);
    if (!product) break;
    taken.add(product.script_id);
    picked.push({ script_id: product.script_id, event: false });
  }
  return picked;
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
  slot: number,
) {
  return {
    week_id: weekId,
    day_of_week: day,
    lang_code: lang,
    script_status: 'Pending' as const,
    script_attempts: 0,
    render_status_30s: 'Pending' as const,
    render_status_65s: 'Pending' as const,
    render_attempts_30s: 0,
    render_attempts_65s: 0,
    post_status: 'Pending' as const,
    scheduled_post_time: scheduledPostTime(weekStart, day, lang, slot),
  };
}

/**
 * Fills next week's `Content_Queue`: evergreen themes Monday to Wednesday, two report
 * promotions on Thursday once `PROMO_ENABLED` is on (the week's sky event takes one of them), then
 * the twelve Moon-sign readings spread over the Friday to Sunday before it, and computes the week's
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
    const filledThemeSlots = new Map<string, number>();
    for (const task of plannedTasks.filter((task) => task.target_type === 'Theme')) {
      const key = `${task.lang_code}/${task.day_of_week}`;
      filledThemeSlots.set(key, (filledThemeSlots.get(key) ?? 0) + 1);
    }
    const promoCounts = new Map<Language, number>();
    for (const task of plannedTasks.filter((task) => task.target_type === 'Promo')) {
      promoCounts.set(task.lang_code, (promoCounts.get(task.lang_code) ?? 0) + 1);
    }

    const recompute = new URL(request.url).searchParams.get('recompute') === '1';
    const storedTransit = await sheets.getWeeklyTransits(weekId);
    const transitWritten = recompute || !storedTransit;
    if (transitWritten) {
      await sheets.saveWeeklyTransits({
        week_id: weekId,
        transit_data: buildTransitReference(weekId, weekStart),
      });
    }

    const pending: ContentQueue[] = [];
    const themeUses: { scriptId: string; lang_code: Language; weekId: string }[] = [];
    const skippedDays: string[] = [];

    for (const lang of plannedLanguages()) {
      const themes = await sheets.getEvergreenScripts(lang);
      const taken = new Set<string>();

      for (const day of THEME_DAYS) {
        if (promoEnabled() && day === PROMO_DAY) continue;
        const planned = filledThemeSlots.get(`${lang}/${day}`) ?? 0;
        // A per-sign series fills the day with four signs; `PROMO_DAY` without the promotion
        // falls back to a single theme video.
        const slots = SIGNS_BY_DAY[day] ? THEME_SLOTS : 1;

        for (let slot = planned; slot < slots; slot += 1) {
          const theme =
            pickSignTheme(themes, weekId, day, slot) ?? pickScript(themes, day, taken, false);
          if (!theme) {
            skippedDays.push(`${lang}/${day}`);
            break;
          }
          taken.add(theme.script_id);

          // A sign-targeted evergreen carries its sign, so the label on the video, the title and
          // the caption read the same way they do for a weekly reading.
          const signTheme = parseSignThemeId(theme.script_id);
          const task: ContentQueue = {
            ...baseTask(weekId, day, weekStart, lang, slot),
            task_id: `${weekId}-${lang}-${theme.script_id}`,
            target_type: 'Theme',
            theme_id: theme.script_id,
            zodiac_sign: signTheme?.sign,
          };
          if (existing.has(task.task_id)) continue;

          pending.push(task);
          themeUses.push({ scriptId: theme.script_id, lang_code: lang, weekId });
        }
      }

      if (promoEnabled()) {
        const planned = promoCounts.get(lang) ?? 0;
        const promos = pickPromoScripts(themes, weekStart, taken).slice(planned);
        if (planned + promos.length < PROMO_SLOTS) skippedDays.push(`${lang}/${PROMO_DAY}`);

        promos.forEach((promo, index) => {
          const slot = planned + index;
          const task: ContentQueue = {
            ...baseTask(weekId, PROMO_DAY, weekStart, lang, slot),
            scheduled_post_time: promoPostTime(weekStart, lang, slot),
            task_id: `${weekId}-${lang}-${promo.script_id}`,
            target_type: 'Promo',
            theme_id: promo.script_id,
          };
          if (existing.has(task.task_id)) return;

          pending.push(task);
          if (!promo.event) themeUses.push({ scriptId: promo.script_id, lang_code: lang, weekId });
        });
      }

      for (const { day, signs } of ZODIAC_DAYS) {
        for (let slot = 0; slot < signs.length; slot += 1) {
          const sign = signs[slot];
          const task: ContentQueue = {
            ...baseTask(weekId, day, zodiacPostWeekStart(weekStart), lang, slot),
            task_id: `${weekId}-${lang}-${sign.toLowerCase()}`,
            target_type: 'Zodiac_Sign',
            zodiac_sign: sign,
          };
          if (existing.has(task.task_id)) continue;

          pending.push(task);
        }
      }
    }

    // One write per sheet: a row-at-a-time plan runs into the Sheets per-minute write quota
    // partway through the languages and leaves the week half planned.
    await sheets.addQueueTasks(pending);
    await sheets.markEvergreenUsedMany(themeUses);

    return NextResponse.json({
      status: 'Weekly plan completed',
      week_id: weekId,
      transit_written: transitWritten,
      created: pending.length,
      task_ids: pending.map((task) => task.task_id),
      skipped_theme_slots: skippedDays,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Weekly plan failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
