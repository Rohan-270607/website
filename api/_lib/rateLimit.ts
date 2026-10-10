import type { Db } from './supabase.js';
import { HttpError } from './http.js';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds until the current window ends
}

// Fixed-window counter kept in Postgres (see rate_limit_hit in migration 0001).
// Chosen over in-memory counters because serverless instances don't share
// memory, so an in-memory limit would silently not limit.
export async function hitRateLimit(
  db: Db,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const { data, error } = await db.rpc('rate_limit_hit', {
    p_key: key,
    p_window_seconds: windowSeconds,
  });
  if (error || typeof data !== 'number') throw new Error('rate limit check failed');

  const secondsIntoWindow = Math.floor(Date.now() / 1000) % windowSeconds;
  return { allowed: data <= max, retryAfter: windowSeconds - secondsIntoWindow };
}

// Same check, but answers the caller with a 429 when the limit is exceeded.
export async function enforceRateLimit(
  db: Db,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<void> {
  const { allowed, retryAfter } = await hitRateLimit(db, key, max, windowSeconds);
  if (!allowed) {
    throw new HttpError(429, 'rate_limited', 'Too many requests. Please try again later.', undefined, retryAfter);
  }
}
