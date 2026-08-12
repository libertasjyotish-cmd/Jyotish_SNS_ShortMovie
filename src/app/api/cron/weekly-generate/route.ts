import { NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';
import { GoogleSheetsService } from '@/services/sheets';

export const maxDuration = 300; // Vercel limit for Serverless Functions

export async function GET() {
  // Scenario 1: Weekly Script Generation Pipeline
  // Triggered every Sunday 00:00 JST
  
  const sheetsService = new GoogleSheetsService();
  const geminiService = new GeminiService();
  
  try {
    // 1. Fetch upcoming week targets from Content_Queue that need generation
    const pendingTasks = await sheetsService.getPendingScripts();
    
    // In a real scenario we might need to get the transits for the week
    // e.g. const transits = await sheetsService.getWeeklyTransits(pendingTasks[0].week_id);
    
    // 2. Process tasks and call Gemini API
    for (const task of pendingTasks) {
       // Just a stub - transits should be fetched dynamically
       const scriptData = await geminiService.generateScript({
         week_id: task.week_id,
         lang_code: task.lang_code,
         target_type: task.target_type,
         zodiac_sign: task.zodiac_sign,
         transit_reference: "Sun transit in Leo" // stub
       });
       
       // 3. Save generated scripts to Sheets
       await sheetsService.saveScriptOutput({
         task_id: task.task_id,
         week_id: scriptData.week_id,
         lang_code: scriptData.lang_code,
         zodiac_sign: scriptData.zodiac_sign,
         transit_reference: scriptData.transit_reference,
         script_20s_json: JSON.stringify(scriptData.script_20s),
         script_65s_json: JSON.stringify(scriptData.script_65s),
         hashtags: scriptData.hashtags,
         created_at: new Date().toISOString()
       });
       
       // 4. Update status in Content_Queue
       await sheetsService.updateScriptStatus(task.task_id, 'Script_Done');
    }
    
    return NextResponse.json({ status: 'Weekly generation completed', processed: pendingTasks.length });
  } catch (error: any) {
    console.error('Weekly generation failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
