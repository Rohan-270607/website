import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The repository root (this file is api/_tests/security.test.ts).
const root = fileURLToPath(new URL('../..', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (['node_modules', '.git', '.vercel', 'dist', '.claude'].includes(name)) return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const rel = (f: string) => relative(root, f).split(sep).join('/');
const code = walk(root).filter((f) => /\.(ts|tsx|js|mjs|json|html)$/.test(f) && !rel(f).startsWith('api/_tests/'));

describe('service-role key hygiene', () => {
  it('is referenced only in api/_lib/env.ts and api/_lib/supabase.ts', () => {
    const offenders = code.filter((f) => /SERVICE_ROLE/i.test(readFileSync(f, 'utf8'))).map(rel);
    expect(offenders.sort()).toEqual(['api/_lib/env.ts', 'api/_lib/supabase.ts']);
  });

  it('api/_lib/supabase.ts is imported only from inside api/ (never by the frontend in src/)', () => {
    const importers = code
      .filter((f) => /from ['"][./]+(_lib\/)?supabase(\.js)?['"]/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(importers.length).toBeGreaterThan(0); // the regex still matches real imports
    for (const f of importers) expect(f.startsWith('api/')).toBe(true);
  });

  it('no shipped file carries a framework-public env prefix next to a secret', () => {
    // NEXT_PUBLIC_/VITE_/PUBLIC_ variables are inlined into browser bundles.
    const bad = walk(root)
      .filter((f) => /(^|\/)\.env(\.|$)/.test(rel(f)) || rel(f) === 'README.md' || rel(f).startsWith('docs/'))
      .filter((f) => /(NEXT_PUBLIC|VITE|PUBLIC)_[A-Z_]*(SERVICE_ROLE|RESEND|IP_HASH_SALT)/.test(readFileSync(f, 'utf8')));
    expect(bad.map(rel)).toEqual([]);
  });
});

describe('repository hygiene', () => {
  it('git-ignores real env files', () => {
    const ignore = readFileSync(join(root, '.gitignore'), 'utf8');
    expect(ignore).toMatch(/^\.env$/m);
  });
});
