import { route, readJsonBody, sendJson } from './_lib/http.js';
import { contactSchema, validationError } from './_lib/validation.js';
import { getEnv } from './_lib/env.js';
import { getDb } from './_lib/supabase.js';
import { clientIp, hashValue, userAgent } from './_lib/request.js';
import { enforceRateLimit } from './_lib/rateLimit.js';
import { notifyNewMessage } from './_lib/email.js';

const MAX_PER_HOUR = 5;

export default route(['POST'], async (req, res) => {
  const body = readJsonBody(req);

  // Honeypot first, before validation or any database work. A bot that fills
  // the hidden field gets the same "success" a real visitor would, so it has
  // no signal to adapt to. Nothing is stored.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return sendJson(res, 200, { ok: true });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) throw validationError(parsed.error);
  const { name, email, subject, message } = parsed.data;

  const { IP_HASH_SALT } = getEnv();
  const ipHash = hashValue(clientIp(req), IP_HASH_SALT);
  const db = getDb();

  // After validation, so typos don't burn a visitor's quota and malformed junk
  // is rejected without touching the database at all.
  await enforceRateLimit(db, `contact:${ipHash}`, MAX_PER_HOUR, 3600);

  const { error } = await db.from('messages').insert({
    name,
    email,
    subject,
    body: message,
    ip_hash: ipHash,
    user_agent: userAgent(req).slice(0, 300),
  });
  if (error) throw new Error('could not save message'); // → generic 500, details stay in logs

  // Awaited on purpose: serverless platforms may freeze the function the moment
  // the response is sent, killing an un-awaited request. Never throws.
  await notifyNewMessage({ name, email, subject, message });

  sendJson(res, 200, { ok: true });
});
