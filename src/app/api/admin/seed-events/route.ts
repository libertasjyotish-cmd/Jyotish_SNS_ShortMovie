import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { eventScriptId, eventsForWeek } from '@/lib/event-calendar';
import { plannedLanguages } from '@/lib/plan-languages';
import { PROMO_DAY, promoPostTime, weekStartFromId } from '@/lib/schedule';
import { ContentQueue, GoogleSheetsService, Language } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Puts the calendar's sky events into a week that was planned before the calendar existed:
 * each event takes its Thursday slot, and the product promo planned there is parked as Hold
 * unless it has started posting. `weekly-plan` does this by itself for every later week.
 *
 *   GET /api/admin/seed-events?week=2026-W43[&langs=ja,en][&apply=1]   (dry run without apply)
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const weekId = params.get('week') ?? '';
  const weekStart = weekStartFromId(weekId);
  if (!weekStart) return NextResponse.json({ error: 'pass ?week=YYYY-Www' }, { status: 400 });
  const langs = (params.get('langs')?.split(',') as Language[] | undefined) ?? plannedLanguages();
  const apply = params.get('apply') === '1';

  const events = eventsForWeek(weekStart);
  const sheets = new GoogleSheetsService();
  const tasks = await sheets.getQueueTasks(weekId);
  const hold: string[] = [];
  const add: ContentQueue[] = [];
  const skipped: string[] = [];

  for (const lang of langs) {
    events.forEach((event, slot) => {
      const time = promoPostTime(weekStart, lang, slot);
      const taskId = `${weekId}-${lang}-${eventScriptId(event)}`;
      if (tasks.some((task) => task.task_id === taskId && task.post_status !== 'Hold')) return;
      const occupant = tasks.find(
        (task) =>
          task.lang_code === lang &&
          task.target_type === 'Promo' &&
          task.scheduled_post_time === time &&
          task.post_status !== 'Hold',
      );
      if (occupant && (occupant.post_status === 'Posted' || (occupant.posted_refs?.length ?? 0) > 0)) {
        skipped.push(`${occupant.task_id}: already posting`);
        return;
      }
      if (occupant) hold.push(occupant.task_id);
      add.push({
        task_id: taskId,
        week_id: weekId,
        day_of_week: PROMO_DAY,
        lang_code: lang,
        target_type: 'Promo',
        theme_id: eventScriptId(event),
        script_status: 'Pending',
        script_attempts: 0,
        render_status_30s: 'Pending',
        render_status_65s: 'Pending',
        render_attempts_30s: 0,
        render_attempts_65s: 0,
        post_status: 'Pending',
        scheduled_post_time: time,
      });
    });
  }

  if (apply) {
    // Hold first, so no two live rows ever share the slot.
    await sheets.holdTasks(hold);
    await sheets.addQueueTasks(add);
  }
  return NextResponse.json({
    week_id: weekId,
    apply,
    events: events.map(eventScriptId),
    hold,
    add: add.map((task) => `${task.task_id} @ ${task.scheduled_post_time}`),
    skipped,
  });
}
