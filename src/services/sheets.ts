import { google } from 'googleapis';

export type Language = 'ja' | 'en' | 'es' | 'pt' | 'id' | 'ar';
export type Platform = 'YouTube' | 'TikTok' | 'Instagram';
export type TargetType = 'All_Signs' | 'Zodiac_Sign';
export type ScriptStatus = 'Pending' | 'Script_Done' | 'Error';
export type RenderStatus = 'Pending' | 'Rendered' | 'Error';
export type PostStatus = 'Pending' | 'Posted' | 'Error';

export interface Channel {
  channel_id: string;
  platform: Platform;
  lang_code: Language;
  account_handle: string;
  youtube_refresh_token?: string;
  tiktok_access_token?: string;
  ig_access_token?: string;
  creatomate_template_20s: string;
  creatomate_template_65s: string;
}

export interface ContentQueue {
  task_id: string;
  week_id: string;
  day_of_week: string;
  lang_code: Language;
  target_type: TargetType;
  zodiac_sign?: string;
  script_status: ScriptStatus;
  render_status_20s: RenderStatus;
  render_status_65s: RenderStatus;
  post_status: PostStatus;
  scheduled_post_time: string;
}

export interface ScriptOutput {
  task_id: string;
  week_id: string;
  lang_code: Language;
  zodiac_sign?: string;
  transit_reference: string;
  script_20s_json: string;
  script_65s_json: string;
  hashtags: string;
  created_at: string;
}

export interface RenderOutput {
  task_id: string;
  creatomate_render_id_20s?: string;
  video_url_20s?: string;
  creatomate_render_id_65s?: string;
  video_url_65s?: string;
  duration_20s?: number;
  duration_65s?: number;
  rendered_at?: string;
}

export interface WeeklyTransit {
  week_id: string;
  transit_data: string;
}

export class GoogleSheetsService {
  private sheets;
  private spreadsheetId: string;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
  }

  async getWeeklyTransits(weekId: string): Promise<WeeklyTransit | null> {
    // Stub: fetch from Weekly_Transits table
    return null;
  }
  
  async getPendingScripts(): Promise<ContentQueue[]> {
    // Stub: fetch from Content_Queue where script_status = 'Pending'
    return [];
  }

  async updateScriptStatus(taskId: string, status: ScriptStatus): Promise<void> {
    // Stub: update script_status in Content_Queue
  }
  
  async saveScriptOutput(output: ScriptOutput): Promise<void> {
    // Stub: insert into Script_Outputs
  }

  async getPendingRenders(): Promise<ContentQueue[]> {
    // Stub: fetch from Content_Queue where script_status = 'Script_Done' and (render_status_20s = 'Pending' or render_status_65s = 'Pending')
    return [];
  }

  async updateRenderStatus(taskId: string, pattern: '20s' | '65s', status: RenderStatus): Promise<void> {
    // Stub: update render_status_20s or render_status_65s in Content_Queue
  }
  
  async saveRenderOutput(output: RenderOutput): Promise<void> {
    // Stub: insert/update Render_Outputs
  }

  async getPendingPosts(): Promise<ContentQueue[]> {
    // Stub: fetch from Content_Queue where render_status_* = 'Rendered' and post_status = 'Pending'
    return [];
  }

  async updatePostStatus(taskId: string, status: PostStatus): Promise<void> {
    // Stub: update post_status in Content_Queue
  }
  
  async getChannelConfig(lang_code: Language, platform: Platform): Promise<Channel | null> {
    // Stub: fetch channel config from Channels table
    return null;
  }
}
