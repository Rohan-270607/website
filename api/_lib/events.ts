import type { VercelRequest } from '@vercel/node';
import type { Db } from './supabase.js';
import type { Database } from '../_types/database.js';
import { getEnv } from './env.js';
import { clientIp, hashValue, userAgent } from './request.js';

type NewEvent = Pick<Database['public']['Tables']['events']['Insert'], 'kind' | 'path' | 'referrer' | 'ref_id'>;

// Shared by /api/track and /api/resume. Only salted hashes are stored; the raw
// IP and user agent are used for the hash and then dropped.
export async function recordEvent(db: Db, req: VercelRequest, event: NewEvent): Promise<void> {
  const { IP_HASH_SALT } = getEnv();
  const { error } = await db.from('events').insert({
    ...event,
    ip_hash: hashValue(clientIp(req), IP_HASH_SALT),
    ua_hash: hashValue(userAgent(req), IP_HASH_SALT),
  });
  if (error) throw new Error('could not record event');
}
