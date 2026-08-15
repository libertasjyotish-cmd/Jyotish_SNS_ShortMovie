import { NextRequest, NextResponse } from 'next/server';
import { isWebhookAuthorized } from '@/lib/auth';
import {
  correctedSpeed,
  DURATION_BOUNDS,
  isDurationAcceptable,
  MAX_RENDER_ATTEMPTS,
  startRender,
} from '@/lib/render';
import { CreatomateService, parseRenderMetadata } from '@/services/creatomate';
import { GoogleSheetsService, RenderOutput } from '@/services/sheets';

export const dynamic = 'force-dynamic';

interface CreatomateWebhookPayload {
  id?: string;
  status?: string;
  url?: string;
  duration?: number;
  error_message?: string;
  metadata?: string;
}

export async function POST(req: NextRequest) {
  if (!isWebhookAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as CreatomateWebhookPayload;
    const metadata = parseRenderMetadata(payload.metadata);
    if (!metadata) {
      return NextResponse.json({ error: 'Missing or invalid metadata' }, { status: 400 });
    }

    const { taskId, pattern, attempt, speed } = metadata;
    const sheetsService = new GoogleSheetsService();

    if (payload.status !== 'succeeded' || !payload.url) {
      console.error(`Render failed for ${taskId} (${pattern}):`, payload.error_message);
      await sheetsService.updateRenderStatus(taskId, pattern, 'Error');
      return NextResponse.json({ status: 'Render failure recorded', task_id: taskId });
    }

    const renderOutput: RenderOutput = { task_id: taskId, rendered_at: new Date().toISOString() };
    if (pattern === '20s') {
      renderOutput.video_url_20s = payload.url;
      renderOutput.duration_20s = payload.duration;
    } else {
      renderOutput.video_url_65s = payload.url;
      renderOutput.duration_65s = payload.duration;
    }
    await sheetsService.saveRenderOutput(renderOutput);

    if (!isDurationAcceptable(pattern, payload.duration) && payload.duration !== undefined) {
      const { min, max } = DURATION_BOUNDS[pattern];
      if (attempt >= MAX_RENDER_ATTEMPTS) {
        console.error(
          `Duration ${payload.duration}s outside ${min}-${max}s for ${taskId} (${pattern}) after ${attempt} attempts`,
        );
        await sheetsService.updateRenderStatus(taskId, pattern, 'Error');
        return NextResponse.json({ status: 'Duration out of bounds', task_id: taskId });
      }

      const scriptOutput = await sheetsService.getScriptOutput(taskId);
      if (!scriptOutput) throw new Error(`No script output for ${taskId}`);

      await startRender(sheetsService, new CreatomateService(), {
        taskId,
        language: scriptOutput.lang_code,
        pattern,
        script: JSON.parse(pattern === '20s' ? scriptOutput.script_20s_json : scriptOutput.script_65s_json),
        attempt: attempt + 1,
        speed: correctedSpeed(pattern, payload.duration, speed),
      });

      return NextResponse.json({
        status: 'Re-rendering with corrected speed',
        task_id: taskId,
        attempt: attempt + 1,
      });
    }

    await sheetsService.updateRenderStatus(taskId, pattern, 'Rendered');
    return NextResponse.json({ status: 'Webhook processed', task_id: taskId, pattern });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook processing failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
