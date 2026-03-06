import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteAlbumAction,
  deletePhotoAction,
  setAlbumCoverAction,
  setAlbumVisibilityAction,
  setPhotoVisibilityAction,
  updateAlbumAction,
  updatePhotoAction,
  uploadPhotosAction
} from "@/app/admin/galeria/actions";
import { createClient } from "@/lib/supabase/server";

type AdminAlbumDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function publicPhotoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null
): string | null {
  if (!filePath) {
    return null;
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from("gallery").getPublicUrl(filePath);

  return publicUrl;
}

async function adminPreviewUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null
): Promise<string | null> {
  if (!filePath) {
    return null;
  }

  const { data, error } = await supabase.storage.from("gallery").createSignedUrl(filePath, 60 * 30);

  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }

  return publicPhotoUrl(supabase, filePath);
}

export default async function AdminAlbumDetailPage({ params, searchParams }: AdminAlbumDetailPageProps) {
  const routeParams = await params;
  const queryParams = await searchParams;
  const errorMessage = asText(queryParams.error);
  const okMessage = asText(queryParams.ok);

  const supabase = await createClient();
  const { data: album, error: albumError } = await supabase
    .from("albums")
    .select("id, title, slug, description, event_date, is_public, cover_path, updated_at")
    .eq("id", routeParams.id)
    .maybeSingle();

  if (albumError || !album) {
    notFound();
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id, caption, file_name, file_path, sort_order, is_public, created_at")
    .eq("album_id", album.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const previewMap = new Map<string, string | null>();
  const distinctPaths = new Set<string>();

  if (album.cover_path) {
    distinctPaths.add(album.cover_path);
  }

  for (const photo of photos ?? []) {
    distinctPaths.add(photo.file_path);
  }

  await Promise.all(
    [...distinctPaths].map(async (path) => {
      const url = await adminPreviewUrl(supabase, path);
      previewMap.set(path, url);
    })
  );

  const coverUrl = album.cover_path ? previewMap.get(album.cover_path) ?? null : null;

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Editar album</h1>
        <p className="subtitle">
          Ultima actualizacion: <strong>{formatDate(album.updated_at)}</strong>
        </p>

        {errorMessage ? (
          <p className="notice notice--error" role="status">
            {errorMessage}
          </p>
        ) : null}

        {okMessage ? (
          <p className="notice notice--ok" role="status">
            {okMessage}
          </p>
        ) : null}

        <form action={updateAlbumAction} className="form-grid">
          <input type="hidden" name="id" value={album.id} />

          <label className="field">
            <span>Titulo del album</span>
            <input type="text" name="title" required defaultValue={album.title} />
          </label>

          <label className="field">
            <span>Slug</span>
            <input type="text" name="slug" required defaultValue={album.slug} />
          </label>

          <label className="field">
            <span>Descripcion</span>
            <textarea name="description" rows={4} defaultValue={album.description ?? ""} />
          </label>

          <label className="field">
            <span>Fecha del evento</span>
            <input type="date" name="event_date" defaultValue={album.event_date ?? ""} />
          </label>

          <label className="field">
            <span>Visibilidad</span>
            <select name="is_public" defaultValue={album.is_public ? "true" : "false"}>
              <option value="true">Publico</option>
              <option value="false">Privado</option>
            </select>
          </label>

          <button className="button button--primary" type="submit">
            Guardar album
          </button>
        </form>
      </article>

      <article className="card">
        <h2 className="title">Subir fotos</h2>
        <p className="subtitle">Puedes subir varias imagenes en una sola accion.</p>
        <form action={uploadPhotosAction} className="form-grid">
          <input type="hidden" name="album_id" value={album.id} />

          <label className="field">
            <span>Fotos (JPG/PNG/WEBP, max 10 MB cada una)</span>
            <input type="file" name="files" multiple accept=".jpg,.jpeg,.png,.webp" required />
          </label>

          <label className="field">
            <span>Visibilidad por defecto de las fotos nuevas</span>
            <select name="default_public" defaultValue="true">
              <option value="true">Publicas</option>
              <option value="false">Privadas</option>
            </select>
          </label>

          <button className="button button--primary" type="submit">
            Subir fotos
          </button>
        </form>
      </article>

      <article className="card">
        <h2 className="title">Acciones rapidas</h2>
        <div className="actions">
          <form action={setAlbumVisibilityAction}>
            <input type="hidden" name="id" value={album.id} />
            <input type="hidden" name="target_public" value={album.is_public ? "false" : "true"} />
            <button className="button button--ghost" type="submit">
              {album.is_public ? "Privatizar album" : "Publicar album"}
            </button>
          </form>

          <form action={deleteAlbumAction}>
            <input type="hidden" name="id" value={album.id} />
            <button className="button button--danger" type="submit">
              Eliminar album
            </button>
          </form>

          <Link href="/admin/galeria" className="button button--ghost">
            Volver al listado
          </Link>

          {album.is_public ? (
            <Link href={`/galeria/${album.slug}`} className="button button--ghost">
              Ver publico
            </Link>
          ) : null}
        </div>
      </article>

      <article className="card">
        <h2 className="title">Portada actual</h2>
        {coverUrl ? <img src={coverUrl} alt={`Portada ${album.title}`} className="post-cover" /> : <p>Sin portada.</p>}
      </article>

      <article className="card">
        <h2 className="title">Fotos del album</h2>
        {!photos || photos.length === 0 ? <p>No hay fotos subidas todavia.</p> : null}

        {photos && photos.length > 0 ? (
          <div className="photo-admin-grid">
            {photos.map((photo) => {
              const imageUrl = previewMap.get(photo.file_path) ?? null;
              const isCover = album.cover_path === photo.file_path;

              return (
                <div className="photo-admin-card" key={photo.id}>
                  {imageUrl ? <img src={imageUrl} alt={photo.caption ?? photo.file_name} className="photo-admin-image" /> : null}

                  <p style={{ marginBottom: "0.35rem" }}>
                    <strong>{photo.file_name}</strong>
                    <br />
                    <small>Orden: {photo.sort_order}</small>
                    <br />
                    <small>{photo.is_public ? "Publica" : "Privada"}</small>
                    <br />
                    <small>{isCover ? "Portada actual" : "Sin portada"}</small>
                  </p>

                  <form action={updatePhotoAction} className="form-grid">
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="album_id" value={album.id} />

                    <label className="field">
                      <span>Texto</span>
                      <input type="text" name="caption" defaultValue={photo.caption ?? ""} />
                    </label>

                    <label className="field">
                      <span>Orden</span>
                      <input type="number" name="sort_order" defaultValue={photo.sort_order} min={0} />
                    </label>

                    <label className="field">
                      <span>Visibilidad</span>
                      <select name="is_public" defaultValue={photo.is_public ? "true" : "false"}>
                        <option value="true">Publica</option>
                        <option value="false">Privada</option>
                      </select>
                    </label>

                    <button className="button button--ghost" type="submit">
                      Guardar foto
                    </button>
                  </form>

                  <div className="actions" style={{ marginTop: "0.65rem" }}>
                    <form action={setPhotoVisibilityAction}>
                      <input type="hidden" name="id" value={photo.id} />
                      <input type="hidden" name="album_id" value={album.id} />
                      <input type="hidden" name="target_public" value={photo.is_public ? "false" : "true"} />
                      <button className="button button--ghost" type="submit">
                        {photo.is_public ? "Privatizar" : "Publicar"}
                      </button>
                    </form>

                    {!isCover ? (
                      <form action={setAlbumCoverAction}>
                        <input type="hidden" name="id" value={photo.id} />
                        <input type="hidden" name="album_id" value={album.id} />
                        <button className="button button--ghost" type="submit">
                          Usar como portada
                        </button>
                      </form>
                    ) : null}

                    <form action={deletePhotoAction}>
                      <input type="hidden" name="id" value={photo.id} />
                      <input type="hidden" name="album_id" value={album.id} />
                      <button className="button button--danger" type="submit">
                        Eliminar foto
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </article>
    </section>
  );
}
