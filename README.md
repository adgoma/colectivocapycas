# Colectivo CAS y CAP - Web Administrable

Scaffold inicial para una web publica + panel admin para el colectivo de ex indeterminados CAS y CAP de la Contraloria General de la Republica.

## Stack

- Next.js (App Router)
- Vercel (deploy)
- Supabase (Postgres + Auth + Storage)

## Estructura

```text
app/
  admin/
  contacto/
  documentos/
  galeria/
  gestiones/
  quienes-somos/
components/
lib/
  auth/
  supabase/
supabase/
  migrations/
  seed.sql
```

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_REF`
- `SITE_URL`

## Flujo sugerido

1. Instalar dependencias:

```bash
npm install
```

2. Login y vincular proyecto:

```bash
npx supabase login
npx supabase link --project-ref <SUPABASE_PROJECT_REF>
```

3. Aplicar migraciones:

```bash
npx supabase db push
```

4. Correr local:

```bash
npm run dev
```

## Estado actual

- Rutas publicas creadas.
- Login real implementado en `/login` con Supabase Auth.
- Panel admin protegido por sesion + roles (`superadmin` / `editor`).
- CRUD completo de Gestiones en `/admin/gestiones`:
  - crear
  - editar
  - publicar / pasar a borrador
  - eliminar
- CRUD completo de Documentos en `/admin/documentos`:
  - crear con subida de archivo a `storage.documents`
  - editar metadata y reemplazar archivo
  - publicar / pasar a borrador
  - eliminar (registro + archivo en storage)
- CRUD completo de Galeria en `/admin/galeria`:
  - crear y editar albumes
  - subir multiples fotos a `storage.gallery`
  - actualizar texto/orden/visibilidad de fotos
  - definir portada del album
  - eliminar foto o album con limpieza de storage
- Modulo editable de Organizacion + Contacto en `/admin/organizacion`:
  - datos institucionales para `/quienes-somos`
  - canales de contacto/redes para `/contacto`
- Vistas publicas conectadas para listar y ver detalle de gestiones publicadas:
  - `/gestiones`
  - `/gestiones/[slug]`
- Vistas publicas de documentos:
  - `/documentos`
  - `/documentos/[slug]`
  - `/documentos/[slug]/descargar` (URL firmada)
- Vistas publicas de galeria:
  - `/galeria`
  - `/galeria/[slug]`
- Vistas publicas editables:
  - `/quienes-somos`
  - `/contacto`
- Migracion SQL inicial creada con:
  - tablas de contenido
  - tablas de roles y auditoria
  - RLS
  - buckets y politicas de Storage

Siguiente etapa sugerida: mejoras UX (paginacion/buscador) y panel de auditoria.
