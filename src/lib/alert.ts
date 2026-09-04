import axios from 'axios';
import { optionalEnv } from '@/lib/env';

/**
 * Posts a plain-text alert to `ALERT_WEBHOOK_URL`, whose `{ "text": ... }` body is what
 * Slack and Discord incoming webhooks both accept. Alerting is skipped when unset, so the
 * pipeline runs the same with or without it.
 */
export async function sendAlert(lines: string[]): Promise<boolean> {
  const url = optionalEnv('ALERT_WEBHOOK_URL');
  if (!url || lines.length === 0) return false;

  const text = lines.join('\n');
  try {
    await axios.post(url, { text, content: text }, { timeout: 10_000 });
    return true;
  } catch (error) {
    console.error('Alert delivery failed:', error instanceof Error ? error.message : error);
    return false;
  }
}
