-- 0003_storage.sql: the single public "media" bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media',
  true,                                  -- public: files are served by URL without a token
  5 * 1024 * 1024,                       -- 5 MB per file
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files by URL without consulting policies, so we
-- deliberately add NO anon SELECT policy: visitors can fetch a known file but
-- cannot list the bucket and discover unpublished uploads.
-- The admin gets every operation (list, upload, overwrite, delete).
create policy "admin manages media" on storage.objects
  for all to authenticated
  using      (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
