import Link from "next/link";
import { createComunicadoAction, deleteComunicadoAction, setComunicadoStatusAction } from "@/app/admin/comunicados/actions";
import { createClient } from "@/lib/supabase/server";

type ComunicadosAdminPageProps = {
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

  return new Date(value).toLocaleString("es-PE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function AdminComunicadosPage({ searchParams }: ComunicadosAdminPageProps) {
  const params = await searchParams;
  const errorMessage = asText(params.error);
  const okMessage = asText(params.ok);

  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, status, published_at, updated_at")
    .eq("post_type", "comunicado")
    .order("updated_at", { ascending: false });

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Gestionar comunicados</h1>
        <p className="subtitle">Crear y publicar avisos oficiales del colectivo.</p>

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

        <form action={createComunicadoAction} className="form-grid">
          <label className="field">
            <span>Titulo</span>
            <input type="text" name="title" required placeholder="Ejemplo: Convocatoria de asamblea" />
          </label>

          <label className="field">
            <span>Slug (opcional)</span>
            <input type="text" name="slug" placeholder="convocatoria-asamblea" />
          </label>

          <label className="field">
            <span>Resumen</span>
            <textarea name="summary" rows={3} placeholder="Resumen breve para listados." />
          </label>

          <label className="field">
            <span>Portada (opcional)</span>
            <input type="file" name="cover_image" accept=".jpg,.jpeg,.png,.webp" />
          </label>

          <label className="field">
            <span>Contenido</span>
            <textarea name="content_md" rows={8} required placeholder="Texto del comunicado..." />
          </label>

          <label className="field">
            <span>Estado</span>
            <select name="status" defaultValue="draft">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </label>

          <button className="button button--primary" type="submit">
            Crear comunicado
          </button>
        </form>
      </article>

      <article className="card">
        <h2 className="title">Comunicados registrados</h2>
        {!posts || posts.length === 0 ? <p>No hay comunicados todavia.</p> : null}

        {posts && posts.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Estado</th>
                  <th>Publicacion</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <strong>{post.title}</strong>
                      <br />
                      <small>{post.slug}</small>
                    </td>
                    <td>{post.status === "published" ? "Publicado" : "Borrador"}</td>
                    <td>{formatDate(post.published_at)}</td>
                    <td>{formatDate(post.updated_at)}</td>
                    <td>
                      <div className="actions">
                        <Link href={`/admin/comunicados/${post.id}`} className="button button--ghost">
                          Editar
                        </Link>

                        <form action={setComunicadoStatusAction}>
                          <input type="hidden" name="id" value={post.id} />
                          <input
                            type="hidden"
                            name="target_status"
                            value={post.status === "published" ? "draft" : "published"}
                          />
                          <button className="button button--ghost" type="submit">
                            {post.status === "published" ? "Pasar a borrador" : "Publicar"}
                          </button>
                        </form>

                        <form action={deleteComunicadoAction}>
                          <input type="hidden" name="id" value={post.id} />
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

