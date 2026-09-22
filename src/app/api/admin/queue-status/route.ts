import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { dispatchLanguages, isDispatchEnabled } from '@/lib/dispatch-gate';
import { ContentQueue, GoogleSheetsService } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface WeekSummary {
  week_id: string;
  total: number;
  script_done: number;
  script_error: number;
  rendered: number;
  render_error: number;
  render_pending: number;
  posted: number;
  post_error: number;
}

function summarize(weekId: string, tasks: ContentQueue[]): WeekSummary {
  const patterns = (task: ContentQueue) => [task.render_status_30s, task.render_status_65s];
  return {
    week_id: weekId,
    total: tasks.length,
    script_done: tasks.filter((t) => t.script_status === 'Script_Done').length,
    script_error: tasks.filter((t) => t.script_status === 'Error').length,
    rendered: tasks.filter((t) => patterns(t).every((s) => s === 'Rendered')).length,
    render_error: tasks.filter((t) => patterns(t).some((s) => s === 'Error')).length,
    render_pending: tasks.filter((t) => patterns(t).some((s) => s === 'Pending' || s === 'Rendering'))
      .length,
    posted: tasks.filter((t) => t.post_status === 'Posted').length,
    post_error: tasks.filter((t) => t.post_status === 'Error').length,
  };
}

/** A task whose posting window has passed while it is still waiting on a script or a render. */
function blockedReason(task: ContentQueue): string | null {
  if (task.script_status !== 'Script_Done') return `script_${task.script_status.toLowerCase()}`;
  const renders = [task.render_status_30s, task.render_status_65s];
  if (renders.some((status) => status === 'Error')) return 'render_error';
  if (renders.some((status) => status !== 'Rendered')) return 'render_incomplete';
  return null;
}

/**
 * Aggregated pipeline state for the daily monitoring job: per-week counts, overdue tasks, and the
 * posting gates. Read-only, so it never advances the queue.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tasks = await new GoogleSheetsService().getAllQueueTasks();
    const now = Date.now();

    const weeks = Array.from(new Set(tasks.map((task) => task.week_id))).sort();
    const overdue = tasks
      .filter((task) => task.post_status === 'Pending')
      .filter((task) => {
        const scheduled = new Date(task.scheduled_post_time).getTime();
        return Number.isFinite(scheduled) && scheduled <= now;
      })
      .map((task) => ({
        task_id: task.task_id,
        lang_code: task.lang_code,
        scheduled_post_time: task.scheduled_post_time,
        blocked_by: blockedReason(task),
      }));

    return NextResponse.json({
      checked_at: new Date().toISOString(),
      dispatch_enabled: isDispatchEnabled(),
      dispatch_languages: dispatchLanguages(),
      weeks: weeks.map((weekId) =>
        summarize(
          weekId,
          tasks.filter((task) => task.week_id === weekId),
        ),
      ),
      script_errors: tasks.filter((t) => t.script_status === 'Error').map((t) => t.task_id),
      render_errors: tasks
        .filter((t) => t.render_status_30s === 'Error' || t.render_status_65s === 'Error')
        .map((t) => t.task_id),
      post_errors: tasks.filter((t) => t.post_status === 'Error').map((t) => t.task_id),
      overdue_count: overdue.length,
      overdue: overdue.slice(0, 50),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Queue status failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
