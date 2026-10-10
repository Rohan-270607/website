import type { VercelRequest } from '@vercel/node';
import { createHmac } from 'node:crypto';

// On Vercel the platform sets x-forwarded-for itself (a client cannot spoof
// the first entry), so it is safe to trust here. Locally it may be absent.
export function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  const real = req.headers['x-real-ip'];
  return first || (Array.isArray(real) ? real[0] : real) || 'unknown';
}

export function userAgent(req: VercelRequest): string {
  const ua = req.headers['user-agent'];
  return (Array.isArray(ua) ? ua[0] : ua) ?? '';
}

// HMAC with a secret salt, not a bare SHA-256: IPv4 has only ~4 billion values,
// so an unsalted hash could be reversed by trying them all.
// The UTC date is mixed in, so the same visitor gets a different hash each day.
// That is enough for rate limiting and daily unique counts, but it means the
// stored data can't be used to follow a person over weeks.
export function hashValue(value: string, salt: string, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return createHmac('sha256', salt).update(`${day}|${value}`).digest('hex');
}

// Obvious crawlers and headless tools. This is a courtesy filter to keep the
// numbers sane, not a security control. An empty UA is treated as a bot too.
const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|monitor|uptime|pingdom/i;
export function isBot(ua: string): boolean {
  return ua.trim() === '' || BOT_PATTERN.test(ua);
}
