import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, mockReq, mockRes, setTestEnv } from './helpers.js';

let current = fakeDb();
vi.mock('../_lib/supabase.js', () => ({ getDb: () => current.db }));

import handler from '../resume.js';

const profile = { resume_path: 'resume/My Resume.pdf' };

beforeEach(() => {
  setTestEnv();
  current = fakeDb({ profile });
});

describe('GET /api/resume', () => {
  it('logs a download and 302s to the public storage URL', async () => {
    const out = mockRes();
    await handler(mockReq({ method: 'GET' }), out.res);

    expect(out.statusCode).toBe(302);
    expect(out.header('location')).toBe('https://abcdefgh.supabase.co/storage/v1/object/public/media/resume/My%20Resume.pdf');
    expect(current.inserted).toHaveLength(1);
    expect(current.inserted[0].row).toMatchObject({ kind: 'resume_download' });
  });

  it('redirects without logging for bots', async () => {
    const out = mockRes();
    await handler(mockReq({ method: 'GET', headers: { 'user-agent': 'AhrefsBot' } }), out.res);
    expect(out.statusCode).toBe(302);
    expect(current.inserted).toHaveLength(0);
  });

  it('still redirects, but does not log, once the logging cap is exceeded', async () => {
    current = fakeDb({ profile, rpcCount: 21 });
    const out = mockRes();
    await handler(mockReq({ method: 'GET' }), out.res);
    expect(out.statusCode).toBe(302);
    expect(current.inserted).toHaveLength(0);
  });

  it('still redirects if logging fails', async () => {
    current = fakeDb({ profile, insertError: true });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = mockRes();
    await handler(mockReq({ method: 'GET' }), out.res);
    expect(out.statusCode).toBe(302);
  });

  it('404s when no resume is configured', async () => {
    current = fakeDb({ profile: { resume_path: null } });
    const out = mockRes();
    await handler(mockReq({ method: 'GET' }), out.res);
    expect(out.statusCode).toBe(404);
    expect(out.body.error.code).toBe('resume_not_set');
  });

  it('rejects wrong methods', async () => {
    const out = mockRes();
    await handler(mockReq({ method: 'POST' }), out.res);
    expect(out.statusCode).toBe(405);
    expect(out.header('allow')).toBe('GET');
  });
});
