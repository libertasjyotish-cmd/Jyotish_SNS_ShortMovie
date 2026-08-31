import { NextRequest, NextResponse } from 'next/server';
import { isRendererCallbackAuthorized } from '@/lib/auth';
import { GoogleSheetsService, Pattern, RenderOutput } from '@/services/sheets';

export const dynamic = 'force-dynamic';

interface RendererCallbackPayload {
  queue_task_id?: string;
  pattern?: Pattern;
  url?: string;
  duration?: number;
  error?: string;
}

/** Closes out a queue row once Cloud Run finishes a render it accepted earlier. */
export async function POST(req: NextRequest) {
  if (!isRendererCallbackAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await req.json()) as RendererCallbackPayload;
  const taskId = payload.queue_task_id;
  const pattern = payload.pattern;
  if (!taskId || (pattern !== '20s' && pattern !== '65s')) {
    return NextResponse.json({ error: 'Missing task_id or pattern' }, { status: 400 });
  }

  const sheets = new GoogleSheetsService();

  if (!payload.url) {
    console.error(`Render failed for ${taskId} (${pattern}):`, payload.error);
    await sheets.updateRenderStatus(taskId, pattern, 'Error');
    return NextResponse.json({ status: 'Render failure recorded', task_id: taskId });
  }

  const output: RenderOutput = { task_id: taskId, rendered_at: new Date().toISOString() };
  if (pattern === '20s') {
    output.video_url_20s = payload.url;
    output.duration_20s = payload.duration;
  } else {
    output.video_url_65s = payload.url;
    output.duration_65s = payload.duration;
  }
  await sheets.saveRenderOutput(output);
  await sheets.updateRenderStatus(taskId, pattern, 'Rendered');

  return NextResponse.json({ status: 'Render recorded', task_id: taskId, pattern });
}
