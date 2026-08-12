import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/services/sheets';

export async function POST(req: NextRequest) {
  // Scenario 2 Callback: Createmate Webhook
  const sheetsService = new GoogleSheetsService();

  try {
    const payload = await req.json();
    // Expected payload from Createmate containing render status and url
    const { status, id, url, context } = payload;
    
    if (status === 'succeeded') {
      // Stub: parse task_id and pattern from context or custom fields
      const taskId = context?.taskId || 'unknown_task';
      const pattern = context?.pattern || '20s';
      
      const renderOutput: any = { task_id: taskId };
      
      if (pattern === '20s') {
        renderOutput.video_url_20s = url;
        renderOutput.rendered_at = new Date().toISOString();
        await sheetsService.saveRenderOutput(renderOutput);
        await sheetsService.updateRenderStatus(taskId, '20s', 'Rendered');
      } else if (pattern === '65s') {
        renderOutput.video_url_65s = url;
        renderOutput.rendered_at = new Date().toISOString();
        await sheetsService.saveRenderOutput(renderOutput);
        await sheetsService.updateRenderStatus(taskId, '65s', 'Rendered');
      }
    }

    return NextResponse.json({ status: 'Webhook received and processed' });
  } catch (error: any) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
