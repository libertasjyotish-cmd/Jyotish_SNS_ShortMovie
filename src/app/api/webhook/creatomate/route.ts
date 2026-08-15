import { NextRequest, NextResponse } from 'next/server';
import { isWebhookAuthorized } from '@/lib/auth';
import { GoogleSheetsService, Pattern, RenderOutput } from '@/services/sheets';

export const dynamic = 'force-dynamic';

interface CreatomateWebhookPayload {
  id?: string;
  status?: string;
  url?: string;
  metadata?: string;
}

interface RenderMetadata {
  taskId: string;
  pattern: Pattern;
}

function parseMetadata(raw: string | undefined): RenderMetadata | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RenderMetadata>;
    if (!parsed.taskId || (parsed.pattern !== '20s' && parsed.pattern !== '65s')) return null;
    return { taskId: parsed.taskId, pattern: parsed.pattern };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!isWebhookAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as CreatomateWebhookPayload;
    const metadata = parseMetadata(payload.metadata);

    if (!metadata) {
      return NextResponse.json({ error: 'Missing or invalid metadata' }, { status: 400 });
    }

    const sheetsService = new GoogleSheetsService();
    const { taskId, pattern } = metadata;

    if (payload.status !== 'succeeded' || !payload.url) {
      await sheetsService.updateRenderStatus(taskId, pattern, 'Error');
      return NextResponse.json({ status: 'Render failure recorded', task_id: taskId });
    }

    const renderOutput: RenderOutput = { task_id: taskId, rendered_at: new Date().toISOString() };
    if (pattern === '20s') {
      renderOutput.video_url_20s = payload.url;
    } else {
      renderOutput.video_url_65s = payload.url;
    }

    await sheetsService.saveRenderOutput(renderOutput);
    await sheetsService.updateRenderStatus(taskId, pattern, 'Rendered');

    return NextResponse.json({ status: 'Webhook processed', task_id: taskId, pattern });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook processing failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
