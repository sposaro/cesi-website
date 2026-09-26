import { optionalEnv } from './env';

/** Sends email through Resend if RESEND_API_KEY is set; otherwise logs and skips. */
export async function sendEmail(msg: { to: string; subject: string; html: string; replyTo?: string }) {
  const key = optionalEnv('RESEND_API_KEY');
  if (!key) {
    console.log(`[email skipped: no RESEND_API_KEY] to=${msg.to} subject=${msg.subject}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: optionalEnv('EMAIL_FROM') ?? 'Swan City Scuba <onboarding@resend.dev>',
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      reply_to: msg.replyTo,
    }),
  });
  if (!res.ok) console.error(`Email to ${msg.to} failed: ${res.status} ${await res.text()}`);
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
