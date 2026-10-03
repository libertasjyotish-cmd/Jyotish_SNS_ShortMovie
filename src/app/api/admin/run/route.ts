import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { optionalEnv } from '@/lib/env';
import { GET as dailyDispatch } from '@/app/api/cron/daily-dispatch/route';
import { GET as expireWeekly } from '@/app/api/cron/expire-weekly/route';
import { GET as renderBatch } from '@/app/api/cron/render-batch/route';
import { GET as watchdog } from '@/app/api/cron/watchdog/route';
import { GET as weeklyGenerate } from '@/app/api/cron/weekly-generate/route';
import { GET as weeklyPlan } from '@/app/api/cron/weekly-plan/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * The scheduled jobs, run by hand from the dashboard. Each is the same handler Vercel Cron
 * calls, so a run from the browser and a run from the schedule cannot drift apart.
 */
const JOBS = {
  'weekly-plan': weeklyPlan,
  'weekly-generate': weeklyGenerate,
  'render-batch': renderBatch,
  'daily-dispatch': dailyDispatch,
  watchdog,
  'expire-weekly': expireWeekly,
} as const;

type JobName = keyof typeof JOBS;
const JOB_NAMES = Object.keys(JOBS) as JobName[];

function isJobName(value: string): value is JobName {
  return value in JOBS;
}

/**
 * Runs one scheduled job on demand, so a stuck week can be pushed forward from the dashboard
 * instead of waiting for the next cron. Signed in with the admin token; the cron secret stays
 * on the server and is only used to call the job's own handler.
 */
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const job = url.searchParams.get('job') ?? '';
  if (!isJobName(job)) {
    return NextResponse.json({ error: `Unknown job: ${job}`, jobs: JOB_NAMES }, { status: 400 });
  }

  const cronSecret = optionalEnv('CRON_SECRET');
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  // The job reads its own query string (`recompute`, `chain`), so everything but `job` is kept.
  const jobUrl = new URL(`/api/cron/${job}`, url.origin);
  url.searchParams.forEach((value, key) => {
    if (key !== 'job') jobUrl.searchParams.set(key, value);
  });

  const started = Date.now();
  const response = await JOBS[job](
    new Request(jobUrl, { headers: { authorization: `Bearer ${cronSecret}` } }),
  );
  const body = (await response.json()) as unknown;
  return NextResponse.json(
    { job, status: response.status, took_ms: Date.now() - started, result: body },
    { status: response.ok ? 200 : 502 },
  );
}
