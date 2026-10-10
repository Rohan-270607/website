# Backend

Supabase (Postgres, Auth, Storage, RLS) + Vercel serverless functions in `/api`,
deployed in the same Vercel project as the site. [`API.md`](API.md) is the
contract the frontend uses, and [`DECISIONS.md`](DECISIONS.md) explains why
things are the way they are.

```
supabase/migrations/     0001 schema, 0002 RLS, 0003 storage bucket
supabase/seed.sql        placeholder data (+ the admin email you must change)
supabase/tests/rls.sql   proves the security rules
api/                     contact.ts  track.ts  resume.ts  health.ts  (one file = one endpoint)
api/_lib/                env, supabase client, http wrapper, validation, rate limit, hashing, email
api/_types/              database.ts (DB rows)  api.ts (request/response shapes)
api/_tests/              vitest handler tests, security scan
```

What the site uses: the contact form (`/api/contact`) and analytics
(`/api/track`). The database also has tables for projects, posts, skills and
so on, ready for when the content moves out of `src/content/profile.ts`;
nothing reads them yet.

## Local development

Requires Node 20+. Run these from the repo root.

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
npm test                  # unit tests, no network or database needed
npm run dev:full          # `vercel dev`: the site and /api together on http://localhost:3000
```

`npm test` uses a fake database, so it works before Supabase exists. To exercise
the real thing, set up Supabase first (next section).

## Setup and deploy, step by step

### 1. Create the Supabase project
1. Sign in at <https://supabase.com> → **New project**. Pick a region near you and save the database password.
2. **Project Settings → API**: copy the **Project URL**, the **anon public** key (for the frontend) and the **service_role** key (for the API only; treat it like a password).
3. **Authentication → Providers → Email**: keep Email enabled (magic links) and **turn off "Allow new users to sign up"**. Then **Authentication → Users → Add user → Send invitation** to your own address. That creates the only account that can sign in.
4. **Authentication → URL Configuration**: set the Site URL and add your frontend URLs (including `http://localhost:5173` or similar) under Redirect URLs so magic links come back to your site.

### 2. Run the migrations
Easiest (no CLI): open **SQL Editor** and run, in order, the full contents of
`supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_storage.sql`.

Or with the Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
```

### 3. Set your admin email, then seed
Open `supabase/seed.sql` and change **`change_me@example.com`** (the first insert,
marked `>>> CHANGE THIS <<<`) to the same address you invited in step 1.3 (lowercase).
Run the file in the SQL Editor. Everything else in it is placeholder content you
can edit later in the Table Editor. The two `sample-draft`/`draft` rows are
hidden on purpose and show that drafts stay private.

Already seeded with the wrong email? Fix it in the SQL Editor:
```sql
update admin_emails set email = 'you@yourdomain.com' where email = 'change_me@example.com';
```

### 4. Prove the security rules
Paste `supabase/tests/rls.sql` into the SQL Editor and run it. It prints
`ALL RLS CHECKS PASSED` or stops at the first failing expectation. It runs in a
transaction that rolls back, so it's safe on a database with real data.

### 5. Upload the resume
**Storage → media → upload** `resume/resume.pdf`, then in the Table Editor set
`profile.resume_path` to `resume/resume.pdf`. (Path conventions: `docs/DECISIONS.md`.)

### 6. Environment variables
Local: `cp .env.example .env` and fill it in. Generate the salt with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

On Vercel: **Project → Settings → Environment Variables**, add each variable
from `.env.example` for Production (and Preview if you use it):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SALT`, `ALLOWED_ORIGINS`
(your real frontend origin, e.g. `https://yourname.dev`) and, optionally,
`RESEND_API_KEY`, `NOTIFY_TO_EMAIL`, `NOTIFY_FROM_EMAIL`.
Do not prefix them with `VITE_`/`NEXT_PUBLIC_`.

### 7. Deploy
```bash
npx vercel login
npx vercel link
npx vercel --prod
```
or import the repo in the Vercel dashboard (framework preset: **Vite**, auto-detected). The site builds to `dist/` and the functions in `api/` are picked up automatically.

### 8. Smoke test with curl
Replace `$BASE` with your URL (`http://localhost:3000` locally).
```bash
BASE=https://your-project.vercel.app

curl -i $BASE/api/health                      # 200 {"status":"ok","db":"ok",...}

curl -i -X POST $BASE/api/contact -H "Content-Type: application/json" \
  -d '{"name":"Smoke","email":"smoke@example.com","subject":"Test","message":"Hello from curl"}'
                                              # 200 {"ok":true}; row appears in messages
curl -i -X POST $BASE/api/contact -H "Content-Type: application/json" \
  -d '{"name":"","email":"nope"}'             # 400 validation_error
curl -i $BASE/api/contact                     # 405 + Allow: POST

curl -i -X POST $BASE/api/track -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0 smoke" \
  -d '{"kind":"pageview","path":"/"}'         # 202; row appears in events

curl -i $BASE/api/resume                      # 302 with Location: .../media/resume/resume.pdf

# What the frontend sees (anon key): published rows only, no drafts
curl "$SUPABASE_URL/rest/v1/projects?select=slug" -H "apikey: $ANON_KEY"
curl "$SUPABASE_URL/rest/v1/messages?select=*"    -H "apikey: $ANON_KEY"   # must NOT return data
```

## Security notes
- The service-role key is read in exactly one file, `api/_lib/env.ts`, and used in one, `api/_lib/supabase.ts`, only imported inside `api/`. `api/_tests/security.test.ts` fails if that ever changes.
- All API env vars are server-side. The site itself needs no keys: it only calls `/api` on its own domain.
- `.env` is git-ignored; only `.env.example` is committed.

## Recommended dev dependencies (not installed)
`@types/node` as a dev dependency would let you type-check the functions as a normal script (`tsc -p api`). It was left out per the dependency rule; the type-check passes when run with the copy of the Node types that `@vercel/node` brings along:
`npx tsc -p api --typeRoots node_modules/@vercel/node/node_modules/@types`.
