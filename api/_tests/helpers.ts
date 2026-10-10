import type { VercelRequest, VercelResponse } from '@vercel/node';
import { vi } from 'vitest';

export const ORIGIN = 'https://portfolio.example';

export function setTestEnv(overrides: Record<string, string | undefined> = {}): void {
  const base: Record<string, string | undefined> = {
    SUPABASE_URL: 'https://abcdefgh.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-not-real-0000',
    IP_HASH_SALT: 'test-salt-at-least-16-chars',
    ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173`,
    RESEND_API_KEY: undefined,
    NOTIFY_TO_EMAIL: undefined,
    NOTIFY_FROM_EMAIL: undefined,
  };
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

export function mockReq(init: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): VercelRequest {
  return {
    method: init.method ?? 'POST',
    body: init.body,
    headers: { 'user-agent': 'Mozilla/5.0 (test)', 'x-forwarded-for': '203.0.113.7', ...init.headers },
  } as unknown as VercelRequest;
}

export interface MockRes {
  res: VercelResponse;
  readonly statusCode: number;
  readonly body: any;
  header(name: string): string | undefined;
}

export function mockRes(): MockRes {
  const headers: Record<string, string> = {};
  const state = { statusCode: 200, body: undefined as unknown };
  const res = {
    setHeader: (k: string, v: string) => void (headers[k.toLowerCase()] = String(v)),
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(b: unknown) {
      state.body = b;
      return res;
    },
    end: () => res,
  };
  return {
    res: res as unknown as VercelResponse,
    get statusCode() {
      return state.statusCode;
    },
    get body() {
      return state.body;
    },
    header: (n) => headers[n.toLowerCase()],
  };
}

// A stand-in for the Supabase client that records writes and returns canned
// results. Handlers only use .rpc(), .from().insert() and
// .from().select().limit()[.maybeSingle()].
export function fakeDb(opts: {
  rpcCount?: number; // value rate_limit_hit returns
  insertError?: boolean;
  selectError?: boolean;
  profile?: { resume_path: string | null } | null;
} = {}) {
  const inserted: { table: string; row: any }[] = [];
  const result = () =>
    opts.selectError ? { data: null, error: { message: 'boom' } } : { data: opts.profile ?? null, error: null };
  const query: any = {
    select: () => query,
    limit: () => query,
    maybeSingle: async () => result(),
    then: (ok: any, fail: any) => Promise.resolve(result()).then(ok, fail),
  };
  return {
    inserted,
    db: {
      rpc: vi.fn(async () => ({ data: opts.rpcCount ?? 1, error: null })),
      from: (table: string) => ({
        ...query,
        insert: async (row: any) => {
          inserted.push({ table, row });
          return { error: opts.insertError ? { message: 'boom' } : null };
        },
      }),
    },
  };
}
