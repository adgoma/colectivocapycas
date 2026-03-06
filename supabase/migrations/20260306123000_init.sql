create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('superadmin', 'editor', 'viewer')),
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid references auth.users(id),
  primary key (user_id, role)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content_md text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  cover_image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category text not null default 'general',
  file_name text not null,
  file_path text not null,
  bucket_name text not null default 'documents',
  mime_type text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  uploaded_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (bucket_name, file_path)
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  event_date date,
  cover_path text,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  caption text,
  file_name text not null,
  file_path text not null,
  bucket_name text not null default 'gallery',
  sort_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  uploaded_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (bucket_name, file_path)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  target_table text not null,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_posts_status_published_at on public.posts(status, published_at desc);
create index if not exists idx_documents_status_published_at on public.documents(status, published_at desc);
create index if not exists idx_documents_category on public.documents(category);
create index if not exists idx_albums_is_public_event_date on public.albums(is_public, event_date desc);
create index if not exists idx_photos_album_sort_order on public.photos(album_id, sort_order);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row
execute function public.set_updated_at();

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();

drop trigger if exists trg_albums_updated_at on public.albums;
create trigger trg_albums_updated_at
before update on public.albums
for each row
execute function public.set_updated_at();

drop trigger if exists trg_photos_updated_at on public.photos;
create trigger trg_photos_updated_at
before update on public.photos
for each row
execute function public.set_updated_at();

create or replace function public.has_role(target_user uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = target_user
      and ur.role = target_role
  );
$$;

create or replace function public.is_superadmin(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(target_user, 'superadmin');
$$;

create or replace function public.is_editor(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = target_user
      and ur.role in ('superadmin', 'editor')
  );
$$;

grant execute on function public.has_role(uuid, text) to anon, authenticated;
grant execute on function public.is_superadmin(uuid) to anon, authenticated;
grant execute on function public.is_editor(uuid) to anon, authenticated;

alter table public.site_settings enable row level security;
alter table public.user_roles enable row level security;
alter table public.posts enable row level security;
alter table public.documents enable row level security;
alter table public.albums enable row level security;
alter table public.photos enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Editors can write site settings" on public.site_settings;
create policy "Editors can write site settings"
on public.site_settings
for all
to authenticated
using (public.is_editor(auth.uid()))
with check (public.is_editor(auth.uid()));

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id or public.is_superadmin(auth.uid()));

drop policy if exists "Superadmin manages roles" on public.user_roles;
create policy "Superadmin manages roles"
on public.user_roles
for all
to authenticated
using (public.is_superadmin(auth.uid()))
with check (public.is_superadmin(auth.uid()));

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
on public.posts
for select
to anon, authenticated
using (status = 'published' or public.is_editor(auth.uid()));

drop policy if exists "Editors manage posts" on public.posts;
create policy "Editors manage posts"
on public.posts
for all
to authenticated
using (public.is_editor(auth.uid()))
with check (public.is_editor(auth.uid()));

drop policy if exists "Public can read published documents" on public.documents;
create policy "Public can read published documents"
on public.documents
for select
to anon, authenticated
using (status = 'published' or public.is_editor(auth.uid()));

drop policy if exists "Editors manage documents" on public.documents;
create policy "Editors manage documents"
on public.documents
for all
to authenticated
using (public.is_editor(auth.uid()))
with check (public.is_editor(auth.uid()));

drop policy if exists "Public can read public albums" on public.albums;
create policy "Public can read public albums"
on public.albums
for select
to anon, authenticated
using (is_public or public.is_editor(auth.uid()));

drop policy if exists "Editors manage albums" on public.albums;
create policy "Editors manage albums"
on public.albums
for all
to authenticated
using (public.is_editor(auth.uid()))
with check (public.is_editor(auth.uid()));

drop policy if exists "Public can read public photos" on public.photos;
create policy "Public can read public photos"
on public.photos
for select
to anon, authenticated
using (
  is_public
  and exists (
    select 1
    from public.albums a
    where a.id = photos.album_id
      and a.is_public
  )
  or public.is_editor(auth.uid())
);

drop policy if exists "Editors manage photos" on public.photos;
create policy "Editors manage photos"
on public.photos
for all
to authenticated
using (public.is_editor(auth.uid()))
with check (public.is_editor(auth.uid()));

drop policy if exists "Editors can read audit log" on public.audit_log;
create policy "Editors can read audit log"
on public.audit_log
for select
to authenticated
using (public.is_editor(auth.uid()));

drop policy if exists "Editors can insert audit log" on public.audit_log;
create policy "Editors can insert audit log"
on public.audit_log
for insert
to authenticated
with check (public.is_editor(auth.uid()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'documents',
  'documents',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'gallery',
  'gallery',
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

drop policy if exists "Documents read policy" on storage.objects;
create policy "Documents read policy"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'documents'
  and (
    public.is_editor(auth.uid())
    or exists (
      select 1
      from public.documents d
      where d.bucket_name = bucket_id
        and d.file_path = name
        and d.status = 'published'
    )
  )
);

drop policy if exists "Documents write policy" on storage.objects;
create policy "Documents write policy"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'documents'
  and public.is_editor(auth.uid())
)
with check (
  bucket_id = 'documents'
  and public.is_editor(auth.uid())
);

drop policy if exists "Gallery read policy" on storage.objects;
create policy "Gallery read policy"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'gallery'
  and (
    public.is_editor(auth.uid())
    or exists (
      select 1
      from public.photos p
      join public.albums a
        on a.id = p.album_id
      where p.bucket_name = bucket_id
        and p.file_path = name
        and p.is_public
        and a.is_public
    )
  )
);

drop policy if exists "Gallery write policy" on storage.objects;
create policy "Gallery write policy"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'gallery'
  and public.is_editor(auth.uid())
)
with check (
  bucket_id = 'gallery'
  and public.is_editor(auth.uid())
);

insert into public.site_settings (key, value)
values (
  'organization',
  jsonb_build_object(
    'name',
    'Colectivo de ex indeterminados CAS y CAP',
    'institution',
    'Contraloria General de la Republica',
    'country',
    'Peru',
    'tagline',
    'Informacion oficial de gestiones y reincorporacion'
  )
)
on conflict (key) do nothing;

