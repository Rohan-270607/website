# Decisions

One short paragraph per major decision, and why.

**Two ways in: direct reads for content, serverless functions for writes.** Public content (projects, posts...) can be read straight from Supabase by a frontend, because Row Level Security already guarantees visitors only see published rows, and that avoids writing and hosting a read API that does nothing but forward queries. Anything anonymous visitors *write* (contact, analytics) or that needs a secret goes through `/api`, because the browser must never hold a key that can write to protected tables.

**Row Level Security plus table GRANTs, both locked down.** Supabase grants every privilege on new tables to `anon`/`authenticated` and relies on RLS alone. I revoke that and re-grant only what's needed, so a policy mistake doesn't open a table by itself. `messages`, `events`, `rate_limits` and `admin_emails` have RLS on and no public policies: only the API (service-role key, which bypasses RLS) can touch them. The admin may change a message's `status` column and nothing else (column-level grant), so even a stolen admin session can't rewrite what visitors said. `supabase/tests/rls.sql` proves these rules.

**Admin = allowlist of emails checked in the JWT (`is_admin()`).** No roles table, no custom claims: the owner's address sits in `admin_emails`, and `is_admin()` compares it with the email claim Supabase puts in a verified JWT. It is `SECURITY DEFINER` so it can read the table visitors can't, and returns only a boolean. Simple enough to explain in one sentence; swap for roles if a second person ever needs different permissions. Also turn off public sign-ups in Supabase Auth so strangers can't even create accounts.

**Single `profile` row enforced by `check (id = 1)`.** The database makes a second row impossible, so the frontend never has to ask "which one?".

**Rate limiting in Postgres, not memory.** Serverless instances don't share memory, so an in-process counter would silently fail to limit. A fixed-window counter in `rate_limits`, updated by one atomic `insert ... on conflict do update` (`rate_limit_hit`), is race-free and needs no extra service (Redis). Trade-off: a fixed window allows a short burst at a window boundary (up to 2x), acceptable for a portfolio.

**IP and user-agent hashing.** Raw IPs are never stored. They are hashed with HMAC-SHA256 using a secret salt (`IP_HASH_SALT`), and the UTC date is mixed in, so hashes rotate daily: good enough for rate limiting and daily unique counts, useless for following a person across days. A plain unsalted hash would be reversible because IPv4 has only about 4 billion values. No cookies are used anywhere, so no consent banner is needed for this analytics. Query strings/fragments are stripped from paths and referrers for the same privacy reason.

**Bots get the same answer as humans.** A filled honeypot returns the normal success response, and a detected bot on `/api/track` gets `202`, so neither learns anything to adapt to. Bot detection by user-agent is a courtesy to keep stats clean, not a security boundary.

**CORS: allow-list, and refuse (not just omit headers).** CORS headers only tell browsers whether they may *read* a response; the request still runs. For endpoints that write to the database, a browser request from an unknown origin is rejected with 403 before any work is done. Non-browser clients (curl, monitors) send no `Origin` and are unaffected; the rate limit covers abuse from them.

**Errors never leak internals.** Handlers throw `HttpError` for expected failures; everything else becomes a generic `500 internal_error` and only the error *message* is logged. zod issues return field names and our own text, never the submitted values.

**Email via `fetch` to Resend, not the SDK.** One POST request; avoids a dependency. Email is optional and best-effort: the message is already saved when the email is attempted, so a provider failure is logged and the visitor still gets success.

**Dependencies:** runtime `zod`, `@supabase/supabase-js`, `@vercel/node` (types only at runtime); dev `vitest`. Nothing else for the backend. `@types/node` is *not* installed; see `BACKEND.md` for the one-line type-check.

**ES modules, imports ending in `.js`.** The site's `package.json` says `"type": "module"`, so Vercel runs the functions as ES modules, and Node's ES module loader needs the real file extension in relative imports. TypeScript writes them as `./_lib/env.js` (it resolves that to `env.ts` while type-checking; `api/tsconfig.json` uses `NodeNext` to enforce this). Helpers live in `api/_lib` because Vercel doesn't turn `_`-prefixed files into endpoints.

## Storage: bucket and path conventions

One public bucket, `media`, 5 MB per file, allowed types: PNG, JPEG, WebP, SVG, PDF. Public so image URLs work in plain `<img>` tags without signed URLs. There is deliberately **no anonymous SELECT policy**: public buckets serve a known URL without one, but visitors can't list the bucket and stumble on unpublished files. Only the admin can upload, overwrite, list or delete.

| What | Path | Column that stores it |
| ---- | ---- | --------------------- |
| Avatar | `avatar/avatar.<ext>` | `profile.avatar_path` |
| Resume | `resume/resume.pdf` | `profile.resume_path` |
| Project cover | `projects/<slug>/cover.<ext>` | `projects.cover_path` |
| Project gallery | `projects/<slug>/gallery/<n>.<ext>` | `projects.gallery[].path` |
| Post images (optional) | `posts/<slug>/<name>.<ext>` | referenced from Markdown |

Rules: lowercase, no spaces, paths are stored **relative to the bucket** (no bucket name, no URL) so a project move never breaks data. Re-uploading with `upsert: true` to the same path replaces the file in place; CDNs may cache the old one briefly, so append a version query (`?v=<updated_at>`) in the frontend if you need instant refresh.

**SVG caveat:** an SVG can contain script. Only the admin can upload, and the bucket is on the Supabase storage domain (not your site's origin), so the risk is accepted; still prefer `<img src>` (scripts don't run there) over inlining uploaded SVGs.
