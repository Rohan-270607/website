-- tests/rls.sql: proves the Row Level Security rules.
--
-- Run against a database where migrations 0001-0003 are applied, as a
-- superuser/owner (the Supabase SQL editor's "postgres" role is fine):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/rls.sql
-- or paste the whole file into the Supabase SQL editor.
--
-- It impersonates each role with SET ROLE plus fake JWT claims, exactly the way
-- PostgREST does. Any failed expectation raises an exception and stops the
-- script. Everything runs inside a transaction that is rolled back at the end,
-- so it leaves no fixtures behind (it is safe on a database holding real data).

begin;

-- ------------------------------------------------------------ fixtures (as owner)
insert into admin_emails (email) values ('rls-admin@example.com');
insert into projects (slug, title, published) values
  ('rls-test-published', 'Published', true),
  ('rls-test-draft',     'Draft',     false);
insert into posts (slug, title, published) values
  ('rls-test-post-pub',   'Published post', true),
  ('rls-test-post-draft', 'Draft post',     false);
insert into messages (name, email, subject, body) values ('Fixture', 'f@example.com', 'Hi', 'Hello');
insert into events (kind, path) values ('pageview', '/');
insert into profile (id, name) values (1, 'RLS Fixture') on conflict (id) do nothing;

-- ============================================================ ANON (a visitor)
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare n int;
begin
  -- can read published rows
  select count(*) into n from projects where slug = 'rls-test-published';
  if n <> 1 then raise exception 'FAIL: anon cannot read a published project'; end if;
  select count(*) into n from posts where slug = 'rls-test-post-pub';
  if n <> 1 then raise exception 'FAIL: anon cannot read a published post'; end if;
  select count(*) into n from profile;
  if n < 1 then raise exception 'FAIL: anon cannot read profile'; end if;

  -- cannot read drafts
  select count(*) into n from projects where published = false;
  if n <> 0 then raise exception 'FAIL: anon can read draft projects'; end if;
  select count(*) into n from posts where published = false;
  if n <> 0 then raise exception 'FAIL: anon can read draft posts'; end if;

  -- cannot write content (RLS filters writes to 0 rows, or a privilege error is raised; both are fine)
  begin
    insert into projects (slug, title, published) values ('rls-anon-insert', 'x', true);
    raise exception 'FAIL: anon inserted a project';
  exception when insufficient_privilege then null; end;
  begin
    update projects set title = 'hacked';
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FAIL: anon updated % project rows', n; end if;
  exception when insufficient_privilege then null; end;
  begin
    delete from projects;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FAIL: anon deleted % project rows', n; end if;
  exception when insufficient_privilege then null; end;

  -- cannot read or write the private tables
  begin
    select count(*) into n from messages;
    if n <> 0 then raise exception 'FAIL: anon can read messages'; end if;
  exception when insufficient_privilege then null; end;
  begin
    insert into messages (name, email, subject, body) values ('a', 'a@example.com', 's', 'b');
    raise exception 'FAIL: anon inserted a message';
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into n from events;
    if n <> 0 then raise exception 'FAIL: anon can read events'; end if;
  exception when insufficient_privilege then null; end;
  begin
    insert into events (kind) values ('pageview');
    raise exception 'FAIL: anon inserted an event';
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into n from rate_limits;
    if n <> 0 then raise exception 'FAIL: anon can read rate_limits'; end if;
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into n from admin_emails;
    if n <> 0 then raise exception 'FAIL: anon can read admin_emails'; end if;
  exception when insufficient_privilege then null; end;
  begin
    perform rate_limit_hit('rls-anon', 60);
    raise exception 'FAIL: anon can call rate_limit_hit';
  exception when insufficient_privilege then null; end;

  -- is_admin() is false for a visitor
  if is_admin() then raise exception 'FAIL: is_admin() true for anon'; end if;

  -- storage: cannot upload
  begin
    insert into storage.objects (bucket_id, name) values ('media', 'rls-anon.png');
    raise exception 'FAIL: anon inserted into storage.objects';
  exception when insufficient_privilege then null; end;
end $$;

reset role;

-- ============================================================ SIGNED-IN NON-ADMIN
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001","email":"stranger@example.com"}', true);

do $$
declare n int;
begin
  if is_admin() then raise exception 'FAIL: is_admin() true for a non-admin'; end if;

  -- still sees the public site
  select count(*) into n from projects where slug = 'rls-test-published';
  if n <> 1 then raise exception 'FAIL: signed-in user cannot read published project'; end if;
  select count(*) into n from projects where published = false;
  if n <> 0 then raise exception 'FAIL: non-admin can read draft projects'; end if;

  -- cannot write content
  begin
    insert into projects (slug, title, published) values ('rls-user-insert', 'x', true);
    raise exception 'FAIL: non-admin inserted a project';
  exception when insufficient_privilege then null; end;
  begin
    update projects set title = 'hacked';
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FAIL: non-admin updated % project rows', n; end if;
  exception when insufficient_privilege then null; end;
  begin
    delete from posts;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FAIL: non-admin deleted % post rows', n; end if;
  exception when insufficient_privilege then null; end;
  begin
    update profile set name = 'hacked';
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FAIL: non-admin updated profile'; end if;
  exception when insufficient_privilege then null; end;

  -- cannot read private tables
  select count(*) into n from messages;
  if n <> 0 then raise exception 'FAIL: non-admin can read messages'; end if;
  select count(*) into n from events;
  if n <> 0 then raise exception 'FAIL: non-admin can read events'; end if;
  begin
    update messages set status = 'archived';
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FAIL: non-admin updated messages'; end if;
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into n from admin_emails;
    if n <> 0 then raise exception 'FAIL: non-admin can read admin_emails'; end if;
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into n from rate_limits;
    if n <> 0 then raise exception 'FAIL: non-admin can read rate_limits'; end if;
  exception when insufficient_privilege then null; end;

  -- cannot upload to storage
  begin
    insert into storage.objects (bucket_id, name) values ('media', 'rls-user.png');
    raise exception 'FAIL: non-admin inserted into storage.objects';
  exception when insufficient_privilege then null; end;
end $$;

reset role;

-- ============================================================ ADMIN
set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002","email":"RLS-Admin@Example.com"}', true);

do $$
declare n int;
begin
  -- note the mixed-case email above: is_admin() must compare case-insensitively
  if not is_admin() then raise exception 'FAIL: is_admin() false for the admin'; end if;

  select count(*) into n from projects where published = false;
  if n < 1 then raise exception 'FAIL: admin cannot read drafts'; end if;

  insert into projects (slug, title, published) values ('rls-admin-insert', 'Admin made', false);
  update projects set title = 'Renamed' where slug = 'rls-admin-insert';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin cannot update a project'; end if;
  delete from projects where slug = 'rls-admin-insert';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: admin cannot delete a project'; end if;

  select count(*) into n from messages;
  if n < 1 then raise exception 'FAIL: admin cannot read messages'; end if;
  update messages set status = 'read';
  get diagnostics n = row_count;
  if n < 1 then raise exception 'FAIL: admin cannot update message status'; end if;

  -- the admin may change status but not rewrite what a visitor wrote
  begin
    update messages set body = 'edited';
    raise exception 'FAIL: admin edited a message body';
  exception when insufficient_privilege then null; end;
  begin
    delete from messages;
    raise exception 'FAIL: admin deleted messages (no delete grant expected)';
  exception when insufficient_privilege then null; end;

  select count(*) into n from events;
  if n < 1 then raise exception 'FAIL: admin cannot read events'; end if;
  begin
    insert into events (kind) values ('pageview');
    raise exception 'FAIL: admin inserted an event from the browser role';
  exception when insufficient_privilege then null; end;

  -- even the admin cannot see the service-only tables from a browser session
  begin
    select count(*) into n from admin_emails;
    if n <> 0 then raise exception 'FAIL: admin can read admin_emails'; end if;
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into n from rate_limits;
    if n <> 0 then raise exception 'FAIL: admin can read rate_limits'; end if;
  exception when insufficient_privilege then null; end;

  -- storage: admin can write to the media bucket, and only that bucket
  insert into storage.objects (bucket_id, name) values ('media', 'rls-admin.png');
  begin
    insert into storage.objects (bucket_id, name) values ('some-other-bucket', 'x.png');
    raise exception 'FAIL: admin wrote to a bucket other than media';
  exception when insufficient_privilege or foreign_key_violation then null; end;
end $$;

reset role;

-- ============================================================ SERVICE ROLE (the API)
set local role service_role;

do $$
declare a int; b int;
begin
  a := rate_limit_hit('rls-key', 3600);
  b := rate_limit_hit('rls-key', 3600);
  if a <> 1 or b <> 2 then raise exception 'FAIL: rate_limit_hit did not count 1,2 (got %,%)', a, b; end if;
end $$;

reset role;

do $$ begin raise notice 'ALL RLS CHECKS PASSED'; end $$;

rollback;
