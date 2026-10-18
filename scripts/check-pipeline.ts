/**
 * Walks every combination of script / render / post state, retry count and distance to the slot
 * through `nextPipelineAction()` (built from the planners the watchdog runs) and fails when an
 * unposted row near its slot has nothing that moves it forward.
 */
import {
  MAX_RENDER_ATTEMPTS,
  MAX_SCRIPT_ATTEMPTS,
  RENDER_LEAD_MINUTES,
  RENDER_STALE_MINUTES,
  nextPipelineAction,
} from '../src/lib/watchdog';
import { hasGivenUp, MAX_PLATFORM_FAILURES, retryAllowed } from '../src/lib/post-retry';
import type { ContentQueue, PostStatus, RenderStatus, ScriptStatus, TargetType } from '../src/services/sheets';

const now = new Date('2026-10-19T12:00:00Z');
const minutes = (m: number) => new Date(now.getTime() + m * 60_000).toISOString();

const scripts: ScriptStatus[] = ['Pending', 'Script_Done', 'Error'];
const renders: RenderStatus[] = ['Pending', 'Rendering', 'Rendered', 'Error'];
const posts: PostStatus[] = ['Pending', 'Error', 'Posted', 'Hold'];
const targets: TargetType[] = ['Zodiac_Sign', 'Theme', 'Promo'];
const slotOffsets = [-1440, -120, -30, 0, 30, 119, 121, 300, 359, 361, 1440, 4320];
const failures: string[] = [];

// A failing platform is retried after a gap and dropped after MAX_PLATFORM_FAILURES.
{
  const at = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
  const once = { failures: { YouTube: { count: 1, at: at(10) } } };
  const twice = { failures: { YouTube: { count: 2, at: at(60) } } };
  const thrice = { failures: { YouTube: { count: MAX_PLATFORM_FAILURES, at: at(1) } } };
  if (retryAllowed(once, now)) failures.push('retry 10m after the 1st failure');
  if (!retryAllowed({ failures: { YouTube: { count: 1, at: at(31) } } }, now))
    failures.push('no retry 31m after the 1st failure');
  if (retryAllowed(twice, now)) failures.push('retry 60m after the 2nd failure');
  if (!retryAllowed(thrice, now) || !hasGivenUp(thrice, 'YouTube'))
    failures.push('a platform failed 3 times must be dropped, not block the row');
}

for (const target of targets)
  for (const script_status of scripts)
    for (const render_status_30s of renders)
      for (const post_status of posts)
        for (const attempts of [0, MAX_SCRIPT_ATTEMPTS, MAX_SCRIPT_ATTEMPTS + 2])
          for (const renderAttempts of [0, MAX_RENDER_ATTEMPTS, MAX_RENDER_ATTEMPTS + 2])
            for (const startedAgo of [5, RENDER_STALE_MINUTES + 1])
              for (const offset of slotOffsets) {
                const task: ContentQueue = {
                  task_id: `t-${target}-${script_status}-${render_status_30s}-${post_status}`,
                  week_id: '2026-W43',
                  day_of_week: 'Mon',
                  lang_code: 'ja',
                  target_type: target,
                  zodiac_sign: 'aries',
                  theme_id: target === 'Zodiac_Sign' ? undefined : 'sign-compat-aries',
                  script_status,
                  script_attempts: attempts,
                  render_status_30s,
                  render_status_65s: 'Pending',
                  render_started_at_30s: minutes(-startedAgo),
                  render_attempts_30s: renderAttempts,
                  render_attempts_65s: 0,
                  post_status,
                  scheduled_post_time: minutes(offset),
                };
                const action = nextPipelineAction(task, now);
                const unposted = post_status === 'Pending' || post_status === 'Error';
                const near = offset <= RENDER_LEAD_MINUTES;
                if (unposted && near && action === 'wait') {
                  const due = offset <= 0;
                  // A finished video waiting for its own slot is the only correct wait.
                  if (!(render_status_30s === 'Rendered' && script_status === 'Script_Done' && !due)) {
                    failures.push(
                      `${target} script=${script_status}(${attempts}) render=${render_status_30s}(${renderAttempts}, started ${startedAgo}m ago) post=${post_status} slot ${offset}m: nothing moves it`,
                    );
                  }
                }
                if (!unposted && action !== 'done') failures.push(`${task.task_id}: posted row still acted on`);
              }

if (failures.length > 0) {
  console.error(`${failures.length} stuck states:`);
  for (const line of Array.from(new Set(failures)).slice(0, 40)) console.error(`  ${line}`);
  process.exit(1);
}
console.log('check:pipeline ok: every unposted state near its slot has a next step');
