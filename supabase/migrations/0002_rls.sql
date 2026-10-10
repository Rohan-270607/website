-- 0002_rls.sql: Row Level Security.
-- Model: two kinds of browser callers (anon = visitor, authenticated = someone
-- who signed in) plus the API's service-role key, which bypasses RLS entirely.
-- Table GRANTs are the first gate, policies the second; we tighten both so a
-- mistake in one doesn't open the door.

alter table profile      enable row level security;
alter table projects     enable row level security;
alter table skills       enable row level security;
alter table timeline     enable row level security;
alter table posts        enable row level security;
alter table services     enable row level security;
alter table messages     enable row level security;
alter table events       enable row level security;
alter table rate_limits  enable row level security;
alter table admin_emails enable row level security;

-- ---------------------------------------------------------------- grants
-- Supabase grants everything on new tables to anon/authenticated and relies on
-- RLS. Strip that back to what we actually need.
revoke all on profile, projects, skills, timeline, posts, services,
              messages, events, rate_limits, admin_emails
  from anon, authenticated;

grant select on profile, projects, skills, timeline, posts, services to anon;
grant select, insert, update, delete
  on profile, projects, skills, timeline, posts, services to authenticated;

-- Inbox: the owner may read messages and change only the status column
-- (new -> read -> archived). Nobody can edit what a visitor wrote.
grant select on messages to authenticated;
grant update (status) on messages to authenticated;
grant select on events to authenticated;
-- rate_limits and admin_emails: no grants at all. Only service_role touches them.

-- ---------------------------------------------------------------- public content
-- "to anon, authenticated": a signed-in non-admin is still a visitor and
-- should see the public site exactly like everyone else.
create policy "public reads profile"  on profile  for select to anon, authenticated using (true);
create policy "public reads projects" on projects for select to anon, authenticated using (published);
create policy "public reads skills"   on skills   for select to anon, authenticated using (published);
create policy "public reads timeline" on timeline for select to anon, authenticated using (published);
create policy "public reads posts"    on posts    for select to anon, authenticated using (published);
create policy "public reads services" on services for select to anon, authenticated using (published);

-- ---------------------------------------------------------------- admin content
create policy "admin manages profile"  on profile  for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin manages projects" on projects for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin manages skills"   on skills   for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin manages timeline" on timeline for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin manages posts"    on posts    for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin manages services" on services for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------- private data
create policy "admin reads messages"   on messages for select to authenticated using (is_admin());
create policy "admin updates messages" on messages for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin reads events"     on events   for select to authenticated using (is_admin());
-- rate_limits, admin_emails: RLS on + zero policies = closed to everyone but service_role.

-- ---------------------------------------------------------------- function privileges
-- Postgres lets PUBLIC execute new functions by default. The counter function
-- must only be callable by the API; is_admin() must stay callable because the
-- policies above run it as the caller.
revoke execute on function rate_limit_hit(text, int) from public, anon, authenticated;
grant  execute on function rate_limit_hit(text, int) to service_role;
