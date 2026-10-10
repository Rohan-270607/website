import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env.js';
import type { Database } from '../_types/database.js';

export type Db = SupabaseClient<Database>;

let client: Db | undefined;

// The ONLY place the service-role key is read. It bypasses Row Level Security,
// so this module must only ever be imported from /api handlers (server side).
// tests/security.test.ts fails the build if the key shows up anywhere else.
export function getDb(): Db {
  if (!client) {
    const env = getEnv();
    client = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      // Serverless functions are stateless: no session storage or token refresh.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
