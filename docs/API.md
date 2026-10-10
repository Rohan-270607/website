# API contract

This is the contract between the backend and any frontend. Types for everything
below live in [`api/_types/api.ts`](../api/_types/api.ts) (API) and
[`api/_types/database.ts`](../api/_types/database.ts) (database rows).

The site currently uses `POST /api/contact` (`src/components/ContactForm.tsx`) and
`POST /api/track` (`src/track.ts`).

There are two ways the frontend talks to the backend:

1. **Read content directly from Supabase** with `supabase-js` and the public anon key (projects, posts, ...). Row Level Security guarantees visitors only ever see published rows.
2. **Call the `/api` functions** for anything that writes on behalf of anonymous visitors (contact form, analytics) or needs a server secret.

Never put the service-role key in the frontend. The frontend needs only the
Supabase URL and the **anon** key (both are safe to expose).

---

## Conventions

- Base URL: the same domain as the frontend on Vercel (`/api/...`), or `http://localhost:3000/api/...` under `vercel dev`.
- Bodies are JSON (`Content-Type: application/json`).
- **CORS:** browser requests are accepted only from origins listed in `ALLOWED_ORIGINS`. A request from any other origin gets `403 origin_not_allowed`. Requests with no `Origin` header (curl, server-to-server) are accepted.
- Every response carries `Cache-Control: no-store` plus basic security headers.

### Error shape

Every non-2xx JSON response (except the 302 redirect) looks like this:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Some fields are invalid.",
    "details": [{ "field": "email", "message": "Invalid email address" }]
  }
}
```

Switch on `code`, not `message`. `details` is present only for `validation_error`.

| HTTP | `code` | Meaning |
| ---- | ------ | ------- |
| 400 | `validation_error` | One or more fields invalid; see `details` |
| 400 | `invalid_json` | Body missing, not JSON, or not an object |
| 403 | `origin_not_allowed` | Browser origin not in `ALLOWED_ORIGINS` |
| 404 | `resume_not_set` | `/api/resume` called before a resume was uploaded |
| 405 | `method_not_allowed` | Wrong HTTP method; the `Allow` header lists the right one |
| 429 | `rate_limited` | Too many requests; wait `Retry-After` seconds |
| 500 | `internal_error` | Server problem; nothing internal is revealed. Safe to retry later |

---

## `POST /api/contact`

Stores a contact-form message (and emails the owner if notifications are configured).

**Request body**

| Field | Type | Rules |
| ----- | ---- | ----- |
| `name` | string | required, 1-100 chars |
| `email` | string | required, valid email, max 254 |
| `subject` | string | required, 1-150 chars |
| `message` | string | required, 1-5000 chars |
| `website` | string | **honeypot**, optional. Render a hidden input (off-screen + `tabindex="-1"` + `autocomplete="off"`; not `display:none`, which some bots skip) and send it empty |

Control characters are stripped; unknown fields are rejected (`400`).

**Responses**

| Status | Body |
| ------ | ---- |
| 200 | `{ "ok": true }` |
| 400 | `validation_error` / `invalid_json` |
| 403, 405, 429, 500 | error shape above |

Limit: **5 messages per hour per visitor** (by hashed IP). A filled honeypot also returns `200 { "ok": true }` so bots can't tell they were caught; nothing is stored.

```bash
curl -i -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","subject":"Hello","message":"Nice portfolio!","website":""}'
```

---

## `POST /api/track`

Records one privacy-friendly analytics event. No cookies, no raw IP or user agent is stored (only salted, daily-rotating hashes), query strings and fragments are dropped from `path`/`referrer`.

**Request body**

| Field | Type | Rules |
| ----- | ---- | ----- |
| `kind` | `"pageview"` \| `"resume_download"` \| `"project_click"` | required |
| `path` | string | required, must start with `/`, max 500 |
| `referrer` | string | optional absolute URL; only origin + path is kept |
| `ref_id` | string | optional, `[A-Za-z0-9_-]`, max 100 (e.g. the project slug for `project_click`) |

**Responses**

| Status | Body |
| ------ | ---- |
| 202 | `{ "ok": true }`. Returned both when the event was stored and when it was ignored as a bot |
| 400 | `validation_error` / `invalid_json` |
| 403, 405, 429, 500 | error shape above |

Limit: **120 events per hour per visitor**. Fire and forget; don't block the UI on it. `navigator.sendBeacon(url, JSON.stringify(body))` works too (a `text/plain` body is accepted).

```bash
curl -i -X POST http://localhost:3000/api/track \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 smoke-test" \
  -d '{"kind":"pageview","path":"/","referrer":"https://example.com/"}'
```

(Without a browser-like `User-Agent` the call is treated as a bot: you still get `202` but nothing is stored.)

---

## `GET /api/resume`

Logs a `resume_download` event, then redirects to the resume PDF in storage. Link to it directly: `<a href="/api/resume">Download resume</a>`.

| Status | Meaning |
| ------ | ------- |
| 302 | `Location:` the public URL of the PDF |
| 404 | `resume_not_set`: upload a PDF and set `profile.resume_path` |
| 405, 500 | error shape above |

Logging is best effort and capped (20 logged downloads/hour/visitor); it never blocks the redirect.

```bash
curl -i http://localhost:3000/api/resume          # shows the 302 and Location header
curl -L -o resume.pdf http://localhost:3000/api/resume
```

---

## `GET /api/health`

For uptime monitors and smoke tests.

| Status | Body |
| ------ | ---- |
| 200 | `{ "status": "ok", "db": "ok", "time": "2026-01-01T12:00:00.000Z" }` |
| 503 | `{ "status": "degraded", "db": "unreachable", "time": "..." }` |

```bash
curl -i http://localhost:3000/api/health
```

---

## Reading content with supabase-js (anon key)

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../api/_types/database';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Visitors can run `SELECT` on exactly these tables, and RLS adds `published = true` automatically, so **you don't need to filter on `published`** (though doing so is harmless). Select only the columns you render.

| Need | Query |
| ---- | ----- |
| Profile (one row) | `supabase.from('profile').select('name, headline, bio_md, location, public_email, avatar_path, resume_path, socials, open_to').single()` |
| Project cards | `supabase.from('projects').select('slug, title, summary, tech, status, featured, live_url, repo_url, cover_path, accent_color').order('featured', { ascending: false }).order('sort_order')` |
| Project page | `supabase.from('projects').select('*').eq('slug', slug).single()`; add `.maybeSingle()` if you want `null` instead of an error for a 404 |
| Skills | `supabase.from('skills').select('name, category').order('category').order('sort_order')` |
| Timeline | `supabase.from('timeline').select('kind, org, title, start_date, end_date, description_md').order('start_date', { ascending: false })` |
| Post list | `supabase.from('posts').select('slug, title, excerpt, tags, published_at').order('published_at', { ascending: false })` |
| Post page | `supabase.from('posts').select('*').eq('slug', slug).single()` |
| Posts by tag | `supabase.from('posts').select('slug, title').contains('tags', ['react'])` |
| Services | `supabase.from('services').select('title, description, price_hint, turnaround, link_url').order('sort_order')` |

Anything else (`messages`, `events`, `rate_limits`, `admin_emails`) is **not readable or writable** by the anon key. Don't try; use `/api/contact` and `/api/track`.

### Shapes of the JSON columns

- `profile.socials`: object, e.g. `{ "github": "https://...", "linkedin": "https://..." }`. Render only `http(s)` URLs.
- `projects.gallery`: array, e.g. `[{ "path": "projects/my-slug/gallery/1.webp", "alt": "Dashboard" }]`.
- `*_md` columns are Markdown. **Sanitize rendered HTML** (e.g. DOMPurify) as defense in depth even though only the owner can write them.

### Images and files

Storage paths (`avatar_path`, `cover_path`, `gallery[].path`, `resume_path`) are relative to the public `media` bucket. Build URLs with:

```ts
const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
```

For the resume, link to `/api/resume` rather than the storage URL so downloads are counted.

### Mapping `kind` / `status` enums

- `projects.status`: `planned | in_progress | shipped`
- `timeline.kind`: `education | experience | hackathon | certification | other`

---

## Admin: managing content

There is no admin UI in this repo. The owner signs in with a **magic link** and then
edits content with the same `supabase-js` client; RLS lets exactly the emails in
`admin_emails` write.

```ts
// 1. Send the magic link. shouldCreateUser:false stops strangers creating accounts.
await supabase.auth.signInWithOtp({
  email: 'you@example.com',
  options: { shouldCreateUser: false, emailRedirectTo: 'https://your-domain.example/admin' },
});

// 2. After the user clicks the link they land on /admin with a session. Then:
const { data: isAdmin } = await supabase.rpc('is_admin'); // true only for allowlisted emails

// 3. Manage content (these succeed only for the admin):
await supabase.from('projects').insert({ slug: 'new-thing', title: 'New thing', published: false });
await supabase.from('projects').update({ published: true }).eq('slug', 'new-thing');

// Drafts are visible to the admin session only:
const { data: drafts } = await supabase.from('projects').select('*').eq('published', false);

// Inbox (admin only). The only editable column is `status`:
const { data: inbox } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
await supabase.from('messages').update({ status: 'read' }).eq('id', id);

// Analytics (admin only, read-only):
const { data: events } = await supabase.from('events').select('kind, path, ref_id, created_at').gte('created_at', since);

// Uploads (admin only), see docs/DECISIONS.md for path conventions:
await supabase.storage.from('media').upload(`projects/${slug}/cover.webp`, file, { upsert: true, contentType: 'image/webp' });
```

A signed-in user who is *not* on the allowlist can sign in but every write fails
and they can read nothing that a visitor can't.

Until a UI exists, the Supabase dashboard (Table Editor) does the same job.
