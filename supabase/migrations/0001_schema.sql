-- 0001_schema.sql: tables, enums, indexes, triggers, helper functions.
-- Row Level Security lives in 0002 so this file reads as "the data model" only.

-- ---------------------------------------------------------------- enums
create type project_status as enum ('planned', 'in_progress', 'shipped');
create type timeline_kind  as enum ('education', 'experience', 'hackathon', 'certification', 'other');
create type message_status as enum ('new', 'read', 'archived');
create type event_kind     as enum ('pageview', 'resume_download', 'project_click');

-- ---------------------------------------------------------------- shared trigger
-- One trigger function keeps updated_at honest even when rows are edited
-- from the Supabase dashboard instead of through an app.
create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profile (exactly one row)
create table profile (
  -- The check constraint makes a second row impossible, so the frontend can
  -- always ask for "the" profile without ordering or filtering.
  id            int primary key default 1 check (id = 1),
  name          text not null,
  headline      text not null default '',
  bio_md        text not null default '',
  location      text,
  public_email  text,
  avatar_path   text,                       -- path inside the "media" bucket
  resume_path   text,                       -- path inside the "media" bucket
  socials       jsonb not null default '{}'::jsonb check (jsonb_typeof(socials) = 'object'),
  open_to       text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- projects
create table projects (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title          text not null,
  summary        text not null default '',
  description_md text not null default '',
  role           text,
  tech           text[] not null default '{}',
  status         project_status not null default 'planned',
  featured       boolean not null default false,
  sort_order     int not null default 0,
  -- Links must be http(s): the frontend puts these in href attributes, and
  -- a "javascript:" URL there would be an XSS hole.
  live_url       text check (live_url ~* '^https?://'),
  repo_url       text check (repo_url ~* '^https?://'),
  cover_path     text,
  gallery        jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array'),
  accent_color   text check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  started_on     date,
  published      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index projects_listing_idx on projects (published, featured desc, sort_order);

-- ---------------------------------------------------------------- skills
create table skills (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null default 'general',
  sort_order int not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index skills_listing_idx on skills (published, category, sort_order);

-- ---------------------------------------------------------------- timeline
create table timeline (
  id             uuid primary key default gen_random_uuid(),
  kind           timeline_kind not null default 'other',
  org            text not null,
  title          text not null,
  start_date     date not null,
  end_date       date,                       -- null = ongoing
  description_md text not null default '',
  sort_order     int not null default 0,
  published      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index timeline_listing_idx on timeline (published, start_date desc);

-- ---------------------------------------------------------------- posts
create table posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null,
  excerpt      text not null default '',
  content_md   text not null default '',
  tags         text[] not null default '{}',
  published    boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index posts_listing_idx on posts (published, published_at desc);
create index posts_tags_idx on posts using gin (tags);

-- Stamp published_at the first time a post goes live, so the admin never has
-- to remember to set it and a published post can't have a null date.
create function set_post_published_at() returns trigger
language plpgsql as $$
begin
  if new.published and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end $$;
create trigger posts_published_at before insert or update on posts
  for each row execute function set_post_published_at();

-- ---------------------------------------------------------------- services
create table services (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  price_hint   text,                         -- free text, e.g. "from $X", not a number
  turnaround   text,
  link_url     text check (link_url ~* '^https?://'),
  sort_order   int not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index services_listing_idx on services (published, sort_order);

-- ---------------------------------------------------------------- messages (contact form inbox)
-- Length limits are repeated from the API's zod schema on purpose: the API is
-- the first line of defence, the database is the last.
create table messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  email       text not null check (char_length(email) between 3 and 254),
  subject     text not null check (char_length(subject) between 1 and 150),
  body        text not null check (char_length(body) between 1 and 5000),
  ip_hash     text,                          -- salted hash, never the raw IP
  user_agent  text check (char_length(user_agent) <= 300),
  status      message_status not null default 'new',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index messages_inbox_idx on messages (status, created_at desc);

-- ---------------------------------------------------------------- events (privacy-friendly analytics)
create table events (
  id         bigint generated always as identity primary key,
  kind       event_kind not null,
  path       text check (char_length(path) <= 500),
  referrer   text check (char_length(referrer) <= 500),
  ref_id     text check (char_length(ref_id) <= 100),   -- e.g. a project slug for project_click
  ua_hash    text,
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index events_kind_time_idx on events (kind, created_at desc);
create index events_ref_idx on events (ref_id) where ref_id is not null;

-- ---------------------------------------------------------------- rate_limits
-- Fixed-window counters. One row per (key, window), e.g. ('contact:<iphash>', 14:00).
create table rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on rate_limits (window_start);

-- Atomically bump the counter and return the new value. Doing this in one SQL
-- statement (insert ... on conflict) avoids the race you'd get from
-- "select the count, then update it" when two requests arrive together.
create function rate_limit_hit(p_key text, p_window_seconds int) returns int
language plpgsql as $$
declare
  v_start timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning rate_limits.count into v_count;

  -- Opportunistic cleanup so the table can't grow forever. All our windows are
  -- an hour or less, so anything older than a day is dead weight.
  delete from rate_limits where window_start < now() - interval '1 day';

  return v_count;
end $$;

-- ---------------------------------------------------------------- admin allowlist
create table admin_emails (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

-- Returns true only when the signed-in user's JWT email is on the allowlist.
-- SECURITY DEFINER because admin_emails is invisible to anon/authenticated;
-- the function reads it on their behalf but only ever returns a boolean.
-- The email claim in a Supabase JWT is verified by Supabase Auth (a magic
-- link proves ownership of the address), and anon tokens carry no email.
create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------- updated_at triggers
create trigger set_updated_at before update on profile  for each row execute function set_updated_at();
create trigger set_updated_at before update on projects for each row execute function set_updated_at();
create trigger set_updated_at before update on skills   for each row execute function set_updated_at();
create trigger set_updated_at before update on timeline for each row execute function set_updated_at();
create trigger set_updated_at before update on posts    for each row execute function set_updated_at();
create trigger set_updated_at before update on services for each row execute function set_updated_at();
create trigger set_updated_at before update on messages for each row execute function set_updated_at();
