import { GET as dispatch } from '../daily-dispatch/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Runs between the posting windows (10 and 20 minutes after each) and only publishes videos
 * already handed to Instagram/Threads that were still transcoding.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.searchParams.set('containers', '1');
  return dispatch(new Request(url, { headers: request.headers }));
}
