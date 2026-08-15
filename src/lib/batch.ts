import { optionalEnv, requireEnv } from './env';

const MAX_CHAIN = 30;

export function numberEnv(name: string, fallback: number): number {
  const raw = optionalEnv(name);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Runs `worker` over `items` with a bounded concurrency, stopping before a new
 * item is started once `budgetMs` has elapsed. Returns the items left untouched.
 */
export async function runWithinBudget<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  options: { concurrency: number; budgetMs: number }
): Promise<T[]> {
  const startedAt = Date.now();
  let next = 0;

  const runners = Array.from({ length: Math.min(options.concurrency, items.length) }, async () => {
    while (next < items.length && Date.now() - startedAt < options.budgetMs) {
      const item = items[next];
      next += 1;
      await worker(item);
    }
  });

  await Promise.all(runners);
  return items.slice(next);
}

/**
 * Serverless invocations are time-boxed, so a batch that still has work left
 * hands the remainder to a fresh invocation of the same endpoint. The request is
 * only kicked off (the response is never awaited) because the platform keeps
 * running it after the caller disconnects.
 */
export async function triggerNextBatch(path: string, chain: number): Promise<boolean> {
  if (chain >= MAX_CHAIN) {
    console.error(`Chain limit reached for ${path}`);
    return false;
  }

  const url = new URL(path, requireEnv('PUBLIC_BASE_URL'));
  url.searchParams.set('chain', String(chain + 1));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${requireEnv('CRON_SECRET')}` },
      signal: controller.signal,
    });
  } catch {
    // Aborting our own client side is expected; the invocation keeps running.
  } finally {
    clearTimeout(timer);
  }
  return true;
}
