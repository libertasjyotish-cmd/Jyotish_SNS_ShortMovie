import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/services/sheets';
import { CreatemateService } from '@/services/createmate';
import { GeneratedScript } from '@/services/gemini';

export const maxDuration = 300;

export async function GET() {
  // Scenario 2 Trigger: Createmate Batch Rendering (Mon-Sun sequential execution)
  const sheetsService = new GoogleSheetsService();
  const createmateService = new CreatemateService();

  try {
    const pendingRenders = await sheetsService.getPendingRenders();

    for (const task of pendingRenders) {
      // Stub: Fetch actual script data
      const scriptDataStub: GeneratedScript = {
        hook_text: '',
        body_script: '',
        cta_text: ''
      };

      // Trigger 20s pattern if pending
      if (task.render_status_20s === 'Pending') {
        const res20s = await createmateService.triggerRender({
          taskId: task.task_id,
          templateId: 'creatomate_template_20s', // normally fetched from channel config
          pattern: '20s',
          language: task.lang_code,
          scriptData: scriptDataStub
        });
        
        await sheetsService.saveRenderOutput({
          task_id: task.task_id,
          creatomate_render_id_20s: res20s.renderId,
        });
      }

      // Trigger 65s pattern if pending
      if (task.render_status_65s === 'Pending') {
        const res65s = await createmateService.triggerRender({
          taskId: task.task_id,
          templateId: 'creatomate_template_65s', // normally fetched from channel config
          pattern: '65s',
          language: task.lang_code,
          scriptData: scriptDataStub
        });
        
        await sheetsService.saveRenderOutput({
          task_id: task.task_id,
          creatomate_render_id_65s: res65s.renderId,
        });
      }
    }

    return NextResponse.json({ status: 'Render batch initiated', processed: pendingRenders.length });
  } catch (error: any) {
    console.error('Render batch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
