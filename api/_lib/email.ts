import { getEnv } from './env.js';

export interface ContactNotification {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Optional: does nothing unless RESEND_API_KEY and NOTIFY_TO_EMAIL are set.
// Never throws, because the visitor's message is already saved by the time we
// get here and a flaky email provider must not turn that into an error.
// Calls Resend's REST API directly, which saves a dependency.
export async function notifyNewMessage(msg: ContactNotification): Promise<void> {
  const env = getEnv();
  if (!env.RESEND_API_KEY || !env.NOTIFY_TO_EMAIL) return;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.NOTIFY_FROM_EMAIL ?? 'Portfolio <onboarding@resend.dev>',
        to: [env.NOTIFY_TO_EMAIL],
        reply_to: msg.email, // hitting Reply answers the visitor
        subject: `Portfolio message: ${msg.subject}`,
        // Plain text only: visitor input is never interpreted as HTML.
        text: `From: ${msg.name} <${msg.email}>\n\n${msg.message}`,
      }),
      // Don't let a slow provider hold the function open.
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error('[email] Resend rejected the notification, status', response.status);
  } catch (err) {
    console.error('[email] notification failed:', err instanceof Error ? err.message : 'unknown');
  }
}
