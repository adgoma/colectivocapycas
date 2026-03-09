alter table public.posts
add column if not exists post_type text;

update public.posts
set post_type = 'gestion'
where post_type is null
   or post_type = '';

alter table public.posts
alter column post_type set default 'gestion';

alter table public.posts
alter column post_type set not null;

alter table public.posts
drop constraint if exists posts_post_type_check;

alter table public.posts
add constraint posts_post_type_check
check (post_type in ('gestion', 'comunicado'));

create index if not exists idx_posts_post_type_status_published_at
on public.posts(post_type, status, published_at desc);

