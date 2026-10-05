import { Pattern } from '@/services/sheets';

/**
 * Patterns the pipeline renders on a schedule. Only the 30s cut is published; the 65s one feeds
 * the manual TikTok queue, so rendering it for every slot pays Cloud Run for videos nobody posts.
 * Ask for it explicitly (`/api/cron/render-batch?patterns=65s`) when a TikTok upload is planned.
 */
export const SCHEDULED_PATTERNS: Pattern[] = ['30s'];

export const ALL_PATTERNS: Pattern[] = ['30s', '65s'];
