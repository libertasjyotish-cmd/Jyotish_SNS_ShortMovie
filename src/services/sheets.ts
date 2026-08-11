import { google } from 'googleapis';

export type Language = 'JP' | 'EN' | 'ES' | 'PT' | 'ID' | 'AR';

export type ContentStatus = 'DRAFT' | 'RENDERED' | 'SCHEDULED' | 'PUBLISHED';
export type ContentType = 'FORECAST' | 'THEME';

export interface SheetRow {
  content_id: string; // A
  content_type: ContentType; // B
  scheduled_date: string; // C
  target_group: string; // D
  
  // Pattern A (20s) Scripts (E - J)
  script_pattern_a_jp: string;
  script_pattern_a_en: string;
  script_pattern_a_es: string;
  script_pattern_a_pt: string;
  script_pattern_a_id: string;
  script_pattern_a_ar: string;
  
  // Pattern B (61s) Scripts (K - P)
  script_pattern_b_jp: string;
  script_pattern_b_en: string;
  script_pattern_b_es: string;
  script_pattern_b_pt: string;
  script_pattern_b_id: string;
  script_pattern_b_ar: string;
  
  // Audio URLs (Q - V)
  audio_url_jp: string;
  audio_url_en: string;
  audio_url_es: string;
  audio_url_pt: string;
  audio_url_id: string;
  audio_url_ar: string;
  
  video_url_pattern_a: string; // W
  video_url_pattern_b: string; // X
  status: ContentStatus; // Y
  updated_at: string; // Z
}

export class GoogleSheetsService {
  private sheets;
  private spreadsheetId: string;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
  }

  async getPendingContents(): Promise<SheetRow[]> {
    // Stub: fetch rows where status != 'PUBLISHED'
    return [];
  }

  async updateContentStatus(contentId: string, status: ContentStatus): Promise<void> {
    // Stub: update status column
  }
}
