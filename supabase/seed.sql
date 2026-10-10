-- seed.sql: PLACEHOLDER data only. Every value here is obviously fake; replace
-- it from the admin side (or edit this file before the first run).
-- Safe to re-run: every insert is idempotent.

-- >>> CHANGE THIS <<<  Your real login email goes on the next line.
-- Lowercase only. This is the one address that gets admin rights (see is_admin()).
insert into admin_emails (email) values ('change_me@example.com')
on conflict (email) do nothing;

insert into profile (id, name, headline, bio_md, location, public_email, socials, open_to)
values (
  1,
  'Your Name (placeholder)',
  'Your headline goes here',
  E'Placeholder bio. Replace with **your** own text.\n\nMarkdown is supported.',
  'Your City, Country',
  'hello@example.com',
  '{"github": "https://github.com/your-handle", "linkedin": "https://linkedin.com/in/your-handle"}',
  array['internships', 'freelance']
)
on conflict (id) do nothing;

insert into projects (slug, title, summary, description_md, role, tech, status, featured, sort_order, repo_url, accent_color, started_on, published)
values
  ('sample-project-one', 'Sample Project One', 'Placeholder summary.', E'Placeholder description.', 'Solo developer', array['TypeScript', 'Postgres'], 'shipped', true, 1, 'https://example.com/repo-one', '#3b82f6', '2025-01-01', true),
  ('sample-project-two', 'Sample Project Two', 'Another placeholder.', E'Placeholder description.', 'Team member', array['Python'], 'in_progress', false, 2, null, '#10b981', '2025-06-01', true),
  -- A draft on purpose: lets you confirm visitors can NOT see unpublished rows.
  ('sample-draft-project', 'Sample Draft (hidden)', 'Should never appear publicly.', '', null, '{}', 'planned', false, 99, null, null, null, false)
on conflict (slug) do nothing;

insert into skills (name, category, sort_order, published)
select * from (values
  ('Placeholder Skill A', 'languages', 1, true),
  ('Placeholder Skill B', 'languages', 2, true),
  ('Placeholder Skill C', 'tools', 1, true)
) as v(name, category, sort_order, published)
where not exists (select 1 from skills);

insert into timeline (kind, org, title, start_date, end_date, description_md, sort_order, published)
select * from (values
  ('education'::timeline_kind, 'Placeholder University', 'B.Sc. Placeholder', date '2022-09-01', date '2026-06-01', 'Placeholder.', 1, true),
  ('hackathon'::timeline_kind, 'Placeholder Hackathon', 'Finalist (placeholder)', date '2025-03-15', date '2025-03-17', 'Placeholder.', 2, true)
) as v(kind, org, title, start_date, end_date, description_md, sort_order, published)
where not exists (select 1 from timeline);

insert into posts (slug, title, excerpt, content_md, tags, published)
values
  ('hello-world-placeholder', 'Hello World (placeholder)', 'A placeholder post.', E'# Placeholder\n\nReplace me.', array['meta'], true),
  ('unpublished-draft-placeholder', 'Draft (hidden)', 'Should never appear publicly.', '', '{}', false)
on conflict (slug) do nothing;

insert into services (title, description, price_hint, turnaround, sort_order, published)
select * from (values
  ('Placeholder Service', 'Placeholder description.', 'Contact for pricing (placeholder)', '1-2 weeks (placeholder)', 1, true)
) as v(title, description, price_hint, turnaround, sort_order, published)
where not exists (select 1 from services);
