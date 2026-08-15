import { google, sheets_v4 } from 'googleapis';
import { requireEnv } from '@/lib/env';
import { getGoogleCredentials } from '@/lib/google-credentials';

export type Language = 'ja' | 'en' | 'es' | 'pt' | 'id' | 'ar';
export type Platform = 'YouTube' | 'TikTok' | 'Instagram';
export type TargetType = 'All_Signs' | 'Zodiac_Sign';
export type ScriptStatus = 'Pending' | 'Script_Done' | 'Error';
export type RenderStatus = 'Pending' | 'Rendered' | 'Error';
export type PostStatus = 'Pending' | 'Posted' | 'Error';
export type Pattern = '20s' | '65s';

export interface Channel {
  channel_id: string;
  platform: Platform;
  lang_code: Language;
  account_handle: string;
  youtube_refresh_token?: string;
  /** Per-language OAuth client, so each language gets its own YouTube API quota. */
  youtube_client_id?: string;
  youtube_client_secret?: string;
  tiktok_access_token?: string;
  tiktok_refresh_token?: string;
  /** ISO timestamp at which `tiktok_access_token` expires. */
  tiktok_token_expires_at?: string;
  ig_access_token?: string;
  ig_user_id?: string;
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

export const SHEET_NAMES = {
  channels: 'Channels',
  contentQueue: 'Content_Queue',
  scriptOutputs: 'Script_Outputs',
  renderOutputs: 'Render_Outputs',
  weeklyTransits: 'Weekly_Transits',
} as const;

type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

/** A sheet row keyed by header name, plus its 1-based row number in the sheet. */
interface SheetRow {
  rowNumber: number;
  values: Record<string, string>;
}

interface SheetTable {
  headers: string[];
  rows: SheetRow[];
}

function columnLetter(index: number): string {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;
  private tableCache = new Map<SheetName, SheetTable>();

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: getGoogleCredentials(),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = requireEnv('GOOGLE_SHEETS_ID');
  }

  private async loadTable(sheet: SheetName): Promise<SheetTable> {
    const cached = this.tableCache.get(sheet);
    if (cached) return cached;

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: sheet,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const values = (response.data.values || []) as unknown[][];
    if (values.length === 0) {
      throw new Error(`Sheet "${sheet}" is empty: a header row is required`);
    }

    const headers = values[0].map((header) => String(header ?? '').trim());
    const rows: SheetRow[] = values.slice(1).map((rawRow, index) => {
      const record: Record<string, string> = {};
      headers.forEach((header, columnIndex) => {
        const cell = rawRow[columnIndex];
        record[header] = cell === undefined || cell === null ? '' : String(cell);
      });
      return { rowNumber: index + 2, values: record };
    });

    const table = { headers, rows };
    this.tableCache.set(sheet, table);
    return table;
  }

  private invalidate(sheet: SheetName): void {
    this.tableCache.delete(sheet);
  }

  private async appendRow(sheet: SheetName, record: Record<string, string>): Promise<void> {
    const { headers } = await this.loadTable(sheet);
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheet}!A:${columnLetter(headers.length - 1)}`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [headers.map((header) => record[header] ?? '')] },
    });
    this.invalidate(sheet);
  }

  /** Writes only the given columns of an existing row, leaving the rest untouched. */
  private async patchRow(
    sheet: SheetName,
    rowNumber: number,
    patch: Record<string, string>,
  ): Promise<void> {
    const { headers } = await this.loadTable(sheet);
    const data = Object.entries(patch)
      .map(([header, value]) => {
        const columnIndex = headers.indexOf(header);
        if (columnIndex === -1) {
          throw new Error(`Column "${header}" not found in sheet "${sheet}"`);
        }
        return {
          range: `${sheet}!${columnLetter(columnIndex)}${rowNumber}`,
          values: [[value]],
        };
      });

    if (data.length === 0) return;

    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { valueInputOption: 'RAW', data },
    });
    this.invalidate(sheet);
  }

  /** Updates the row whose `task_id` matches, or appends a new one. */
  private async upsertByTaskId(
    sheet: SheetName,
    taskId: string,
    record: Record<string, string>,
  ): Promise<void> {
    const { rows } = await this.loadTable(sheet);
    const existing = rows.find((row) => row.values.task_id === taskId);
    if (existing) {
      await this.patchRow(sheet, existing.rowNumber, record);
      return;
    }
    await this.appendRow(sheet, { task_id: taskId, ...record });
  }

  private async findQueueRow(taskId: string): Promise<SheetRow> {
    const { rows } = await this.loadTable(SHEET_NAMES.contentQueue);
    const row = rows.find((candidate) => candidate.values.task_id === taskId);
    if (!row) {
      throw new Error(`task_id "${taskId}" not found in ${SHEET_NAMES.contentQueue}`);
    }
    return row;
  }

  private static toContentQueue(values: Record<string, string>): ContentQueue {
    return {
      task_id: values.task_id,
      week_id: values.week_id,
      day_of_week: values.day_of_week,
      lang_code: values.lang_code as Language,
      target_type: values.target_type as TargetType,
      zodiac_sign: values.zodiac_sign || undefined,
      script_status: (values.script_status || 'Pending') as ScriptStatus,
      render_status_20s: (values.render_status_20s || 'Pending') as RenderStatus,
      render_status_65s: (values.render_status_65s || 'Pending') as RenderStatus,
      post_status: (values.post_status || 'Pending') as PostStatus,
      scheduled_post_time: values.scheduled_post_time,
    };
  }

  async getWeeklyTransits(weekId: string): Promise<WeeklyTransit | null> {
    const { rows } = await this.loadTable(SHEET_NAMES.weeklyTransits);
    const row = rows.find((candidate) => candidate.values.week_id === weekId);
    if (!row) return null;
    return { week_id: row.values.week_id, transit_data: row.values.transit_data };
  }

  async getPendingScripts(): Promise<ContentQueue[]> {
    const { rows } = await this.loadTable(SHEET_NAMES.contentQueue);
    return rows
      .filter((row) => row.values.task_id && (row.values.script_status || 'Pending') === 'Pending')
      .map((row) => GoogleSheetsService.toContentQueue(row.values));
  }

  async updateScriptStatus(taskId: string, status: ScriptStatus): Promise<void> {
    const row = await this.findQueueRow(taskId);
    await this.patchRow(SHEET_NAMES.contentQueue, row.rowNumber, { script_status: status });
  }

  async saveScriptOutput(output: ScriptOutput): Promise<void> {
    await this.upsertByTaskId(SHEET_NAMES.scriptOutputs, output.task_id, {
      week_id: output.week_id,
      lang_code: output.lang_code,
      zodiac_sign: output.zodiac_sign ?? '',
      transit_reference: output.transit_reference,
      script_20s_json: output.script_20s_json,
      script_65s_json: output.script_65s_json,
      hashtags: output.hashtags,
      created_at: output.created_at,
    });
  }

  async getScriptOutput(taskId: string): Promise<ScriptOutput | null> {
    const { rows } = await this.loadTable(SHEET_NAMES.scriptOutputs);
    const row = rows.find((candidate) => candidate.values.task_id === taskId);
    if (!row) return null;
    return {
      task_id: row.values.task_id,
      week_id: row.values.week_id,
      lang_code: row.values.lang_code as Language,
      zodiac_sign: row.values.zodiac_sign || undefined,
      transit_reference: row.values.transit_reference,
      script_20s_json: row.values.script_20s_json,
      script_65s_json: row.values.script_65s_json,
      hashtags: row.values.hashtags,
      created_at: row.values.created_at,
    };
  }

  async getPendingRenders(): Promise<ContentQueue[]> {
    const { rows } = await this.loadTable(SHEET_NAMES.contentQueue);
    return rows
      .filter((row) => row.values.task_id && row.values.script_status === 'Script_Done')
      .filter(
        (row) =>
          (row.values.render_status_20s || 'Pending') === 'Pending' ||
          (row.values.render_status_65s || 'Pending') === 'Pending',
      )
      .map((row) => GoogleSheetsService.toContentQueue(row.values));
  }

  async updateRenderStatus(taskId: string, pattern: Pattern, status: RenderStatus): Promise<void> {
    const row = await this.findQueueRow(taskId);
    const column = pattern === '20s' ? 'render_status_20s' : 'render_status_65s';
    await this.patchRow(SHEET_NAMES.contentQueue, row.rowNumber, { [column]: status });
  }

  async saveRenderOutput(output: RenderOutput): Promise<void> {
    const patch: Record<string, string> = {};
    if (output.creatomate_render_id_20s !== undefined) {
      patch.creatomate_render_id_20s = output.creatomate_render_id_20s;
    }
    if (output.video_url_20s !== undefined) patch.video_url_20s = output.video_url_20s;
    if (output.creatomate_render_id_65s !== undefined) {
      patch.creatomate_render_id_65s = output.creatomate_render_id_65s;
    }
    if (output.video_url_65s !== undefined) patch.video_url_65s = output.video_url_65s;
    if (output.duration_20s !== undefined) patch.duration_20s = String(output.duration_20s);
    if (output.duration_65s !== undefined) patch.duration_65s = String(output.duration_65s);
    if (output.rendered_at !== undefined) patch.rendered_at = output.rendered_at;

    await this.upsertByTaskId(SHEET_NAMES.renderOutputs, output.task_id, patch);
  }

  async getRenderOutput(taskId: string): Promise<RenderOutput | null> {
    const { rows } = await this.loadTable(SHEET_NAMES.renderOutputs);
    const row = rows.find((candidate) => candidate.values.task_id === taskId);
    if (!row) return null;
    return {
      task_id: row.values.task_id,
      creatomate_render_id_20s: row.values.creatomate_render_id_20s || undefined,
      video_url_20s: row.values.video_url_20s || undefined,
      creatomate_render_id_65s: row.values.creatomate_render_id_65s || undefined,
      video_url_65s: row.values.video_url_65s || undefined,
      duration_20s: toNumber(row.values.duration_20s),
      duration_65s: toNumber(row.values.duration_65s),
      rendered_at: row.values.rendered_at || undefined,
    };
  }

  async getPendingPosts(): Promise<ContentQueue[]> {
    const { rows } = await this.loadTable(SHEET_NAMES.contentQueue);
    return rows
      .filter((row) => row.values.task_id && (row.values.post_status || 'Pending') === 'Pending')
      .filter(
        (row) =>
          row.values.render_status_20s === 'Rendered' && row.values.render_status_65s === 'Rendered',
      )
      .map((row) => GoogleSheetsService.toContentQueue(row.values));
  }

  async updatePostStatus(taskId: string, status: PostStatus): Promise<void> {
    const row = await this.findQueueRow(taskId);
    await this.patchRow(SHEET_NAMES.contentQueue, row.rowNumber, { post_status: status });
  }

  /** Persists rotated OAuth tokens back onto the channel's row. */
  async updateChannelTokens(channelId: string, patch: Record<string, string>): Promise<void> {
    const { rows } = await this.loadTable(SHEET_NAMES.channels);
    const row = rows.find((candidate) => candidate.values.channel_id === channelId);
    if (!row) {
      throw new Error(`channel_id "${channelId}" not found in ${SHEET_NAMES.channels}`);
    }
    await this.patchRow(SHEET_NAMES.channels, row.rowNumber, patch);
  }

  async getChannelConfig(lang_code: Language, platform: Platform): Promise<Channel | null> {
    const { rows } = await this.loadTable(SHEET_NAMES.channels);
    const row = rows.find(
      (candidate) =>
        candidate.values.lang_code === lang_code && candidate.values.platform === platform,
    );
    if (!row) return null;
    return {
      channel_id: row.values.channel_id,
      platform: row.values.platform as Platform,
      lang_code: row.values.lang_code as Language,
      account_handle: row.values.account_handle,
      youtube_refresh_token: row.values.youtube_refresh_token || undefined,
      youtube_client_id: row.values.youtube_client_id || undefined,
      youtube_client_secret: row.values.youtube_client_secret || undefined,
      tiktok_access_token: row.values.tiktok_access_token || undefined,
      tiktok_refresh_token: row.values.tiktok_refresh_token || undefined,
      tiktok_token_expires_at: row.values.tiktok_token_expires_at || undefined,
      ig_access_token: row.values.ig_access_token || undefined,
      ig_user_id: row.values.ig_user_id || undefined,
      creatomate_template_20s: row.values.creatomate_template_20s,
      creatomate_template_65s: row.values.creatomate_template_65s,
    };
  }
}
