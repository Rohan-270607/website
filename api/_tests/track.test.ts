import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, mockReq, mockRes, setTestEnv } from './helpers.js';

let current = fakeDb();
vi.mock('../_lib/supabase.js', () => ({ getDb: () => current.db }));

import handler from '../track.js';

const valid = { kind: 'project_click', path: '/projects/x?utm=1#top', referrer: 'https://google.com/search?q=secret', ref_id: 'sample-project-one' };

beforeEach(() => {
  setTestEnv();
  current = fakeDb();
});

describe('POST /api/track', () => {
  it('records an event with hashes only and strips query strings', async () => {
    const out = mockRes();
    await handler(mockReq({ body: valid }), out.res);

    expect(out.statusCode).toBe(202);
    const row = current.inserted[0].row;
    expect(current.inserted[0].table).toBe('events');
    expect(row).toMatchObject({ kind: 'project_click', path: '/projects/x', referrer: 'https://google.com/search', ref_id: 'sample-project-one' });
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.ua_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain('203.0.113.7');
    expect(JSON.stringify(row)).not.toContain('Mozilla');
  });

  it('accepts text/plain string bodies (navigator.sendBeacon)', async () => {
    const out = mockRes();
    await handler(mockReq({ body: JSON.stringify({ kind: 'pageview', path: '/' }) }), out.res);
    expect(out.statusCode).toBe(202);
    expect(current.inserted).toHaveLength(1);
  });

  it.each([
    ['bad kind', { ...valid, kind: 'purchase' }],
    ['path without leading slash', { ...valid, path: 'about' }],
    ['bad ref_id', { ...valid, ref_id: 'a b<script>' }],
    ['extra field', { ...valid, email: 'a@b.c' }],
  ])('rejects invalid input: %s', async (_name, body) => {
    const out = mockRes();
    await handler(mockReq({ body }), out.res);
    expect(out.statusCode).toBe(400);
    expect(out.body.error.code).toBe('validation_error');
    expect(current.inserted).toHaveLength(0);
  });

  it('ignores bots silently (same response, nothing stored)', async () => {
    const out = mockRes();
    await handler(mockReq({ body: valid, headers: { 'user-agent': 'Googlebot/2.1' } }), out.res);
    expect(out.statusCode).toBe(202);
    expect(current.inserted).toHaveLength(0);
    expect(current.db.rpc).not.toHaveBeenCalled();
  });

  it('returns 429 when the per-IP cap is exceeded', async () => {
    current = fakeDb({ rpcCount: 121 });
    const out = mockRes();
    await handler(mockReq({ body: valid }), out.res);
    expect(out.statusCode).toBe(429);
    expect(current.inserted).toHaveLength(0);
  });

  it('rejects wrong methods', async () => {
    const out = mockRes();
    await handler(mockReq({ method: 'GET' }), out.res);
    expect(out.statusCode).toBe(405);
  });
});
