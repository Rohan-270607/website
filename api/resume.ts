import { route, HttpError } from './_lib/http.js';
import { getEnv } from './_lib/env.js';
import { getDb } from './_lib/supabase.js';
import { clientIp, hashValue, isBot, userAgent } from './_lib/request.js';
import { hitRateLimit } from './_lib/rateLimit.js';
import { recordEvent } from './_lib/events.js';

const MAX_LOGGED_PER_HOUR = 20;

export default route(['GET'], async (req, res) => {
  const env = getEnv();
  const db = getDb();

  const { data: profile, error } = await db.from('profile').select('resume_path').limit(1).maybeSingle();
  if (error) throw new Error('could not read profile');
  if (!profile?.resume_path) throw new HttpError(404, 'resume_not_set', 'No resume has been uploaded yet.');

  // Logging is best-effort and abuse-capped: a failure here, a bot, or a
  // refresh-spammer must never stop a real person from getting the PDF.
  if (!isBot(userAgent(req))) {
    try {
      const ipHash = hashValue(clientIp(req), env.IP_HASH_SALT);
      const { allowed } = await hitRateLimit(db, `resume:${ipHash}`, MAX_LOGGED_PER_HOUR, 3600);
      if (allowed) await recordEvent(db, req, { kind: 'resume_download', path: '/api/resume' });
    } catch (err) {
      console.error('[resume] could not log download:', err instanceof Error ? err.message : 'unknown');
    }
  }

  // Build the public URL from our own env + the stored path. No user input is
  // involved, so this can't be turned into an open redirect.
  const objectPath = profile.resume_path.split('/').map(encodeURIComponent).join('/');
  const target = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/media/${objectPath}`;

  res.setHeader('Location', target);
  res.status(302).end();
});
