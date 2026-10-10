import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, mockReq, mockRes, setTestEnv, ORIGIN } from './helpers.js';

let current = fakeDb();
vi.mock('../_lib/supabase.js', () => ({ getDb: () => current.db }));

import handler from '../contact.js';

const valid = { name: 'Ada', email: 'Ada@Example.com', subject: 'Hello', message: 'Nice site!' };

beforeEach(() => {
  setTestEnv();
  current = fakeDb();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /api/contact', () => {
  it('stores a valid message, normalises it and never stores a raw IP', async () => {
    const out = mockRes();
    await handler(mockReq({ body: valid }), out.res);

    expect(out.statusCode).toBe(200);
    expect(out.body).toEqual({ ok: true });
    const row = current.inserted[0].row;
    expect(current.inserted[0].table).toBe('messages');
    expect(row.email).toBe('ada@example.com');
    expect(row.body).toBe('Nice site!');
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain('203.0.113.7');
  });

  it('strips control characters and newlines from single-line fields', async () => {
    const out = mockRes();
    await handler(mockReq({ body: { ...valid, subject: 'Hi\r\nBcc: evil@x.com\u0000', message: 'a\u0007b\nc' } }), out.res);
    const row = current.inserted[0].row;
    expect(row.subject).toBe('Hi Bcc: evil@x.com');
    expect(row.body).toBe('ab\nc');
  });

  it('rejects invalid input with field-level errors and stores nothing', async () => {
    const out = mockRes();
    await handler(mockReq({ body: { ...valid, email: 'nope', message: 'x'.repeat(5001) } }), out.res);

    expect(out.statusCode).toBe(400);
    expect(out.body.error.code).toBe('validation_error');
    expect(out.body.error.details.map((d: any) => d.field).sort()).toEqual(['email', 'message']);
    expect(current.inserted).toHaveLength(0);
  });

  it('rejects unknown fields and non-JSON bodies', async () => {
    const a = mockRes();
    await handler(mockReq({ body: { ...valid, admin: true } }), a.res);
    expect(a.statusCode).toBe(400);

    const b = mockRes();
    await handler(mockReq({ body: 'not json{' }), b.res);
    expect(b.statusCode).toBe(400);
    expect(b.body.error.code).toBe('invalid_json');
  });

  it('pretends success when the honeypot is filled, and stores nothing', async () => {
    const out = mockRes();
    await handler(mockReq({ body: { ...valid, website: 'http://spam.example' } }), out.res);

    expect(out.statusCode).toBe(200);
    expect(out.body).toEqual({ ok: true });
    expect(current.inserted).toHaveLength(0);
    expect(current.db.rpc).not.toHaveBeenCalled();
  });

  it('returns 429 with Retry-After when the rate limit is exceeded', async () => {
    current = fakeDb({ rpcCount: 6 }); // limit is 5 per hour
    const out = mockRes();
    await handler(mockReq({ body: valid }), out.res);

    expect(out.statusCode).toBe(429);
    expect(out.body.error.code).toBe('rate_limited');
    expect(Number(out.header('retry-after'))).toBeGreaterThan(0);
    expect(current.inserted).toHaveLength(0);
  });

  it('allows exactly the limit (5th request in the window)', async () => {
    current = fakeDb({ rpcCount: 5 });
    const out = mockRes();
    await handler(mockReq({ body: valid }), out.res);
    expect(out.statusCode).toBe(200);
  });

  it('rejects wrong methods with 405 and an Allow header', async () => {
    const out = mockRes();
    await handler(mockReq({ method: 'GET' }), out.res);
    expect(out.statusCode).toBe(405);
    expect(out.header('allow')).toBe('POST');
  });

  it('hides database errors behind a generic 500', async () => {
    current = fakeDb({ insertError: true });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = mockRes();
    await handler(mockReq({ body: valid }), out.res);

    expect(out.statusCode).toBe(500);
    expect(out.body.error.code).toBe('internal_error');
    expect(JSON.stringify(out.body)).not.toContain('boom');
  });

  describe('email notification', () => {
    const emailEnv = { RESEND_API_KEY: 're_test_key', NOTIFY_TO_EMAIL: 'me@example.com' };

    it('is skipped when RESEND_API_KEY is not set', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await handler(mockReq({ body: valid }), mockRes().res);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('is sent when configured', async () => {
      setTestEnv(emailEnv);
      const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      const out = mockRes();
      await handler(mockReq({ body: valid }), out.res);

      expect(out.statusCode).toBe(200);
      expect(fetchMock).toHaveBeenCalledOnce();
      const sent = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
      expect(sent.to).toEqual(['me@example.com']);
      expect(sent.reply_to).toBe('ada@example.com');
    });

    it('still returns success when the email provider fails', async () => {
      setTestEnv(emailEnv);
      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const out = mockRes();
      await handler(mockReq({ body: valid }), out.res);

      expect(out.statusCode).toBe(200);
      expect(current.inserted).toHaveLength(1);
    });
  });

  describe('CORS', () => {
    it('echoes an allowed origin and answers preflight', async () => {
      const out = mockRes();
      await handler(mockReq({ method: 'OPTIONS', headers: { origin: ORIGIN } }), out.res);
      expect(out.statusCode).toBe(204);
      expect(out.header('access-control-allow-origin')).toBe(ORIGIN);
      expect(out.header('access-control-allow-methods')).toContain('POST');
    });

    it('refuses a disallowed origin before doing any work', async () => {
      const out = mockRes();
      await handler(mockReq({ body: valid, headers: { origin: 'https://evil.example' } }), out.res);
      expect(out.statusCode).toBe(403);
      expect(out.header('access-control-allow-origin')).toBeUndefined();
      expect(current.inserted).toHaveLength(0);
    });

    it('sets security headers on every response', async () => {
      const out = mockRes();
      await handler(mockReq({ method: 'GET' }), out.res);
      expect(out.header('x-content-type-options')).toBe('nosniff');
      expect(out.header('cache-control')).toBe('no-store');
    });
  });
});
