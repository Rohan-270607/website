// Request/response contract for the /api endpoints. Plain interfaces (no zod)
// so the frontend can copy this file as-is. docs/API.md describes the same thing.

export interface ApiErrorBody {
  error: {
    /** Stable machine-readable code. Switch on this, not on `message`. */
    code:
      | 'validation_error'
      | 'invalid_json'
      | 'origin_not_allowed'
      | 'method_not_allowed'
      | 'rate_limited'
      | 'resume_not_set'
      | 'internal_error';
    /** Human-readable, safe to show to a visitor. */
    message: string;
    /** Present only for validation_error. */
    details?: { field: string; message: string }[];
  };
}

export interface ContactRequest {
  name: string; // 1-100 chars
  email: string; // valid email, max 254
  subject: string; // 1-150 chars
  message: string; // 1-5000 chars
  /** Honeypot. Render as a hidden input and always send it empty. */
  website?: string;
}
export interface OkResponse {
  ok: true;
}

export interface TrackRequest {
  kind: 'pageview' | 'resume_download' | 'project_click';
  /** Must start with "/". Query string and #fragment are discarded server-side. */
  path: string;
  /** Optional absolute URL of the previous page; only origin + path is kept. */
  referrer?: string;
  /** Optional, e.g. a project slug for project_click. [A-Za-z0-9_-], max 100. */
  ref_id?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'ok' | 'unreachable';
  time: string; // ISO 8601
}
