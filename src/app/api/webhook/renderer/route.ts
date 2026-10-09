import { NextRequest, NextResponse } from 'next/server';
import { isRendererCallbackAuthorized } from '@/lib/auth';
import { ensureCover } from '@/lib/cover';
import { GeneratedScript } from '@/services/gemini';
import { COVER_AHEAD_TIMEOUT_MS } from '@/services/renderer';
import { GoogleSheetsService, Pattern, RenderOutput } from '@/services/sheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
  if (!taskId || (pattern !== '30s' && pattern !== '65s')) {
    return NextResponse.json({ error: 'Missing task_id or pattern' }, { status: 400 });
  }

  const sheets = new GoogleSheetsService();

  if (!payload.url) {
    console.error(`Render failed for ${taskId} (${pattern}):`, payload.error);
    await sheets.updateRenderStatus(taskId, pattern, 'Error');
    return NextResponse.json({ status: 'Render failure recorded', task_id: taskId });
  }

  const output: RenderOutput = { task_id: taskId, rendered_at: new Date().toISOString() };
  if (pattern === '30s') {
    output.video_url_30s = payload.url;
    output.duration_30s = payload.duration;
  } else {
    output.video_url_65s = payload.url;
    output.duration_65s = payload.duration;
  }
  await sheets.saveRenderOutput(output);
  await sheets.updateRenderStatus(taskId, pattern, 'Rendered');
  if (pattern === '30s') await drawCover(sheets, taskId);

  return NextResponse.json({ status: 'Render recorded', task_id: taskId, pattern });
}

/**
 * Draws the cover as soon as the video exists, hours before the slot airs. Doing it while
 * posting instead left the post with whatever frame the platform picked whenever the renderer
 * was cold, because the posting request cannot wait minutes for a still.
 */
async function drawCover(sheets: GoogleSheetsService, taskId: string): Promise<void> {
  const weekId = /^(\d{4}-W\d{2})/.exec(taskId)?.[1];
  if (!weekId) return;
  const [tasks, scriptOutput, renderOutput] = await Promise.all([
    sheets.getQueueTasks(weekId),
    sheets.getScriptOutput(taskId),
    sheets.getRenderOutput(taskId),
  ]);
  const task = tasks.find((candidate) => candidate.task_id === taskId);
  if (!task || !scriptOutput) return;

  const script: GeneratedScript = JSON.parse(scriptOutput.script_30s_json);
  await ensureCover({
    sheets,
    task,
    hook: script.hook_text,
    renderOutput,
    timeoutMs: COVER_AHEAD_TIMEOUT_MS,
  });
}
