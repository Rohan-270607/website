import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, mockReq, mockRes, setTestEnv } from './helpers.js';

let current = fakeDb();
vi.mock('../_lib/supabase.js', () => ({ getDb: () => current.db }));

import handler from '../health.js';

beforeEach(() => {
  setTestEnv();
  current = fakeDb();
});

describe('GET /api/health', () => {
  it('reports ok when the database answers', async () => {
    const out = mockRes();
    await handler(mockReq({ method: 'GET' }), out.res);
    expect(out.statusCode).toBe(200);
    expect(out.body).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('reports degraded (503) without leaking the error', async () => {
    current = fakeDb({ selectError: true });
    const out = mockRes();
    await handler(mockReq({ method: 'GET' }), out.res);
    expect(out.statusCode).toBe(503);
    expect(out.body).toMatchObject({ status: 'degraded', db: 'unreachable' });
    expect(JSON.stringify(out.body)).not.toContain('boom');
  });

  it('rejects wrong methods', async () => {
    const out = mockRes();
    await handler(mockReq({ method: 'POST' }), out.res);
    expect(out.statusCode).toBe(405);
  });

  it('returns a generic 500 when env vars are missing', async () => {
    setTestEnv({ IP_HASH_SALT: undefined });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = mockRes();
    await handler(mockReq({ method: 'GET' }), out.res);
    expect(out.statusCode).toBe(500);
    expect(JSON.stringify(out.body)).not.toContain('IP_HASH_SALT');
  });
});
