import Link from "next/link";
import {
  createAlbumAction,
  deleteAlbumAction,
  setAlbumVisibilityAction
} from "@/app/admin/galeria/actions";
import { createClient } from "@/lib/supabase/server";

type AdminGaleriaPageProps = {
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

export default async function AdminGaleriaPage({ searchParams }: AdminGaleriaPageProps) {
  const params = await searchParams;
  const errorMessage = asText(params.error);
  const okMessage = asText(params.ok);

  const supabase = await createClient();
  const { data: albums } = await supabase
    .from("albums")
    .select("id, title, slug, event_date, is_public, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Gestionar galeria</h1>
        <p className="subtitle">Crea albumes para reuniones, actividades y registros fotograficos del colectivo.</p>

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

        <form action={createAlbumAction} className="form-grid">
          <label className="field">
            <span>Titulo del album</span>
            <input type="text" name="title" required placeholder="Ejemplo: Reunion abril 2026" />
          </label>

          <label className="field">
            <span>Slug (opcional)</span>
            <input type="text" name="slug" placeholder="reunion-abril-2026" />
          </label>

          <label className="field">
            <span>Descripcion</span>
            <textarea name="description" rows={3} placeholder="Contexto del album..." />
          </label>

          <label className="field">
            <span>Fecha del evento (opcional)</span>
            <input type="date" name="event_date" />
          </label>

          <label className="field">
            <span>Visibilidad</span>
            <select name="is_public" defaultValue="true">
              <option value="true">Publico</option>
              <option value="false">Privado</option>
            </select>
          </label>

          <button className="button button--primary" type="submit">
            Crear album
          </button>
        </form>
      </article>

      <article className="card">
        <h2 className="title">Albumes registrados</h2>
        {!albums || albums.length === 0 ? <p>No hay albumes todavia.</p> : null}

        {albums && albums.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Album</th>
                  <th>Fecha evento</th>
                  <th>Visibilidad</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {albums.map((album) => (
                  <tr key={album.id}>
                    <td>
                      <strong>{album.title}</strong>
                      <br />
                      <small>{album.slug}</small>
                    </td>
                    <td>{formatDate(album.event_date)}</td>
                    <td>{album.is_public ? "Publico" : "Privado"}</td>
                    <td>{formatDate(album.updated_at)}</td>
                    <td>
                      <div className="actions">
                        <Link href={`/admin/galeria/${album.id}`} className="button button--ghost">
                          Gestionar fotos
                        </Link>

                        <form action={setAlbumVisibilityAction}>
                          <input type="hidden" name="id" value={album.id} />
                          <input type="hidden" name="target_public" value={album.is_public ? "false" : "true"} />
                          <button className="button button--ghost" type="submit">
                            {album.is_public ? "Privatizar" : "Publicar"}
                          </button>
                        </form>

                        <form action={deleteAlbumAction}>
                          <input type="hidden" name="id" value={album.id} />
                          <button className="button button--danger" type="submit">
                            Eliminar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
