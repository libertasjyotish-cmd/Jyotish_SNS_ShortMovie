import axios from 'axios';
import { optionalEnv } from '@/lib/env';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
/** Resend's shared sender, so alerts work before a domain is verified. */
const DEFAULT_ALERT_FROM = 'Libertas Jyotish <onboarding@resend.dev>';

/** Posts to a Slack/Discord incoming webhook; both accept this body. */
async function sendWebhook(url: string, text: string): Promise<boolean> {
  try {
    await axios.post(url, { text, content: text }, { timeout: 10_000 });
    return true;
  } catch (error) {
    console.error('Alert webhook failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function sendEmail(apiKey: string, to: string, lines: string[]): Promise<boolean> {
  try {
    await axios.post(
      RESEND_ENDPOINT,
      {
        from: optionalEnv('ALERT_EMAIL_FROM') ?? DEFAULT_ALERT_FROM,
        to: to.split(',').map((address) => address.trim()),
        subject: `[Libertas Jyotish] ${lines[0]}`.slice(0, 120),
        text: lines.join('\n'),
      },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10_000 },
    );
    return true;
  } catch (error) {
    console.error('Alert email failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Delivers a plain-text alert to whichever channels are configured: a Slack/Discord webhook
 * (`ALERT_WEBHOOK_URL`) and/or email via Resend (`RESEND_API_KEY` + `ALERT_EMAIL_TO`).
 * Alerting is skipped when neither is set, so the pipeline runs the same either way.
 */
export async function sendAlert(lines: string[]): Promise<boolean> {
  if (lines.length === 0) return false;

  const url = optionalEnv('ALERT_WEBHOOK_URL');
  const apiKey = optionalEnv('RESEND_API_KEY');
  const to = optionalEnv('ALERT_EMAIL_TO');
  const text = lines.join('\n');

  const delivered = await Promise.all([
    url ? sendWebhook(url, text) : Promise.resolve(false),
    apiKey && to ? sendEmail(apiKey, to, lines) : Promise.resolve(false),
  ]);

  return delivered.some(Boolean);
}
