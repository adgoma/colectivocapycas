insert into public.posts (
  title,
  slug,
  post_type,
  summary,
  content_md,
  status,
  published_at
)
values (
  'Comunicado inicial',
  'comunicado-inicial',
  'comunicado',
  'Publicacion de ejemplo para validar la portada de gestiones.',
  'Este es un contenido de ejemplo. Reemplazar con informacion oficial.',
  'draft',
  null
)
on conflict (slug) do nothing;
