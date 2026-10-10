import { route, readJsonBody, sendJson } from './_lib/http.js';
import { trackSchema, validationError } from './_lib/validation.js';
import { getEnv } from './_lib/env.js';
import { getDb } from './_lib/supabase.js';
import { clientIp, hashValue, isBot, userAgent } from './_lib/request.js';
import { enforceRateLimit } from './_lib/rateLimit.js';
import { recordEvent } from './_lib/events.js';

const MAX_PER_HOUR = 120; // generous for a real visitor clicking around, tiny for a script

export default route(['POST'], async (req, res) => {
  const parsed = trackSchema.safeParse(readJsonBody(req));
  if (!parsed.success) throw validationError(parsed.error);

  // Bots get the normal response so they learn nothing, but nothing is stored.
  if (isBot(userAgent(req))) return sendJson(res, 202, { ok: true });

  const { IP_HASH_SALT } = getEnv();
  const db = getDb();
  await enforceRateLimit(db, `track:${hashValue(clientIp(req), IP_HASH_SALT)}`, MAX_PER_HOUR, 3600);

  const { kind, path, referrer, ref_id } = parsed.data;
  await recordEvent(db, req, { kind, path, referrer, ref_id });

  // 202 Accepted: analytics is fire-and-forget; the caller needs nothing back.
  sendJson(res, 202, { ok: true });
});
