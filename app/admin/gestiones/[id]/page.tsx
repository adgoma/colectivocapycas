import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePostAction, setPostStatusAction, updatePostAction } from "@/app/admin/gestiones/actions";
import { createClient } from "@/lib/supabase/server";

type AdminGestionDetailPageProps = {
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

  return new Date(value).toLocaleString("es-PE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function AdminGestionDetailPage({ params, searchParams }: AdminGestionDetailPageProps) {
  const routeParams = await params;
  const queryParams = await searchParams;
  const errorMessage = asText(queryParams.error);
  const okMessage = asText(queryParams.ok);

  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, title, slug, summary, content_md, status, published_at, updated_at, cover_image_url")
    .eq("id", routeParams.id)
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Editar gestion</h1>
        <p className="subtitle">
          Ultima actualizacion: <strong>{formatDate(post.updated_at)}</strong>
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

        <form action={updatePostAction} className="form-grid">
          <input type="hidden" name="id" value={post.id} />

          <label className="field">
            <span>Titulo</span>
            <input type="text" name="title" required defaultValue={post.title} />
          </label>

          <label className="field">
            <span>Slug</span>
            <input type="text" name="slug" required defaultValue={post.slug} />
          </label>

          <label className="field">
            <span>Resumen</span>
            <textarea name="summary" rows={3} defaultValue={post.summary ?? ""} />
          </label>

          <label className="field">
            <span>URL imagen de portada</span>
            <input type="url" name="cover_image_url" defaultValue={post.cover_image_url ?? ""} />
          </label>

          <label className="field">
            <span>Contenido</span>
            <textarea name="content_md" rows={12} required defaultValue={post.content_md} />
          </label>

          <label className="field">
            <span>Estado</span>
            <select name="status" defaultValue={post.status}>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </label>

          <button className="button button--primary" type="submit">
            Guardar cambios
          </button>
        </form>
      </article>

      <article className="card">
        <h2 className="title">Acciones rapidas</h2>
        <div className="actions">
          <form action={setPostStatusAction}>
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="target_status" value={post.status === "published" ? "draft" : "published"} />
            <button className="button button--ghost" type="submit">
              {post.status === "published" ? "Pasar a borrador" : "Publicar ahora"}
            </button>
          </form>

          <form action={deletePostAction}>
            <input type="hidden" name="id" value={post.id} />
            <button className="button button--danger" type="submit">
              Eliminar gestion
            </button>
          </form>

          <Link href="/admin/gestiones" className="button button--ghost">
            Volver al listado
          </Link>

          {post.status === "published" ? (
            <Link href={`/gestiones/${post.slug}`} className="button button--ghost">
              Ver publicacion
            </Link>
          ) : null}
        </div>
        <p style={{ marginTop: "0.8rem" }}>
          Estado actual: <strong>{post.status === "published" ? "Publicado" : "Borrador"}</strong>
          <br />
          Fecha de publicacion: <strong>{formatDate(post.published_at)}</strong>
        </p>
      </article>
    </section>
  );
}

