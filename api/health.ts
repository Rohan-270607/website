import { route, sendJson } from './_lib/http.js';
import { getDb } from './_lib/supabase.js';

export default route(['GET'], async (_req, res) => {
  let dbOk = false;
  try {
    // Cheapest possible real query. Only the outcome is reported, never the
    // error text, so the endpoint can't leak connection details.
    const { error } = await getDb().from('profile').select('id').limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }
  sendJson(res, dbOk ? 200 : 503, {
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'ok' : 'unreachable',
    time: new Date().toISOString(),
  });
});
