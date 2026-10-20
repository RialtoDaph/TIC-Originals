import 'server-only';
import { serverEnv } from './env';

export interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Uint8Array }[];
}

export type EmailResult = { sent: true } | { sent: false; reason: 'not_configured' | 'failed' };

/**
 * Sends a transactional email through Resend (https://resend.com) when RESEND_API_KEY is set.
 * Without a key the email is only logged, so local development and tests work offline.
 */
export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const key = serverEnv.resendApiKey();
  if (!key) {
    console.info(`[email:not-configured] to=${input.to} subject=${JSON.stringify(input.subject)}`);
    return { sent: false, reason: 'not_configured' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: serverEnv.emailFrom(),
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        reply_to: input.replyTo,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString('base64'),
        })),
      }),
    });
    if (!res.ok) {
      console.error('[email] send failed', res.status, await res.text());
      return { sent: false, reason: 'failed' };
    }
    return { sent: true };
  } catch (e) {
    console.error('[email] send failed', e);
    return { sent: false, reason: 'failed' };
  }
}
