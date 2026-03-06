insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'home-slider',
  'home-slider',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Home slider read policy" on storage.objects;
create policy "Home slider read policy"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'home-slider'
);

drop policy if exists "Home slider write policy" on storage.objects;
create policy "Home slider write policy"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'home-slider'
  and public.is_editor(auth.uid())
)
with check (
  bucket_id = 'home-slider'
  and public.is_editor(auth.uid())
);

insert into public.site_settings (key, value)
values (
  'home_slider',
  '{"slides":[]}'::jsonb
)
on conflict (key) do nothing;
