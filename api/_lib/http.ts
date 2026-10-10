import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnv } from './env.js';

export type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

export interface FieldIssue {
  field: string;
  message: string;
}

// Throw this from anywhere inside a handler; route() turns it into the JSON
// error response. Anything that is NOT an HttpError becomes a generic 500 so
// internal details (SQL errors, stack traces) can never leak to a caller.
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: FieldIssue[],
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export function sendJson(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}

function sendError(res: VercelResponse, err: HttpError): void {
  if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
  sendJson(res, err.status, {
    error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
  });
}

// Headers that make sense for a JSON API: no sniffing, no framing, no caching
// of responses, and no scripts if someone opens an endpoint in a browser tab.
function setSecurityHeaders(res: VercelResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
}

/**
 * Wraps a handler with everything every endpoint needs: security headers,
 * CORS, OPTIONS preflight, method allow-list and the error boundary.
 */
export function route(methods: string[], handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    setSecurityHeaders(res);
    try {
      const env = getEnv();
      const origin = req.headers.origin;

      // Browsers always send Origin on cross-site requests. If it is present
      // and not ours, refuse outright rather than just withholding the CORS
      // headers (which would still let the request run and write to the DB).
      // Non-browser callers (curl, uptime monitors) send no Origin and pass.
      if (origin) {
        if (!env.ALLOWED_ORIGINS.includes(origin)) {
          throw new HttpError(403, 'origin_not_allowed', 'Origin not allowed.');
        }
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }

      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.status(204).end();
        return;
      }

      if (!req.method || !methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        throw new HttpError(405, 'method_not_allowed', `Use ${methods.join(' or ')}.`);
      }

      await handler(req, res);
    } catch (err) {
      if (err instanceof HttpError) return sendError(res, err);
      // Log the message only; the full error object can contain request data.
      console.error('[api] unhandled error:', err instanceof Error ? err.message : 'unknown');
      sendError(res, new HttpError(500, 'internal_error', 'Something went wrong.'));
    }
  };
}

// Vercel parses application/json for us, but a body sent as text/plain
// (what navigator.sendBeacon produces) arrives as a string, so handle both.
export function readJsonBody(req: VercelRequest): Record<string, unknown> {
  let body: unknown = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON.');
    }
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'invalid_json', 'Request body must be a JSON object.');
  }
  return body as Record<string, unknown>;
}
