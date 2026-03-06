alter table public.posts
add column if not exists cover_image_path text;

alter table public.posts
add column if not exists cover_image_bucket text;

update public.posts
set cover_image_bucket = 'post-images'
where cover_image_path is not null
  and (cover_image_bucket is null or cover_image_bucket = '');

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'post-images',
  'post-images',
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

drop policy if exists "Post images read policy" on storage.objects;
create policy "Post images read policy"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'post-images'
  and (
    public.is_editor(auth.uid())
    or exists (
      select 1
      from public.posts p
      where p.cover_image_bucket = bucket_id
        and p.cover_image_path = name
        and p.status = 'published'
    )
  )
);

drop policy if exists "Post images write policy" on storage.objects;
create policy "Post images write policy"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'post-images'
  and public.is_editor(auth.uid())
)
with check (
  bucket_id = 'post-images'
  and public.is_editor(auth.uid())
);

