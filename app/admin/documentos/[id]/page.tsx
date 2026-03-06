import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteDocumentAction,
  setDocumentStatusAction,
  updateDocumentAction
} from "@/app/admin/documentos/actions";
import { createClient } from "@/lib/supabase/server";

type AdminDocumentoDetailPageProps = {
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

export default async function AdminDocumentoDetailPage({ params, searchParams }: AdminDocumentoDetailPageProps) {
  const routeParams = await params;
  const queryParams = await searchParams;
  const errorMessage = asText(queryParams.error);
  const okMessage = asText(queryParams.ok);

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, title, slug, description, category, status, published_at, updated_at, file_name, mime_type")
    .eq("id", routeParams.id)
    .maybeSingle();

  if (error || !doc) {
    notFound();
  }

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Editar documento</h1>
        <p className="subtitle">
          Archivo actual: <strong>{doc.file_name}</strong> ({doc.mime_type ?? "sin mime"})
          <br />
          Ultima actualizacion: <strong>{formatDate(doc.updated_at)}</strong>
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

        <form action={updateDocumentAction} className="form-grid">
          <input type="hidden" name="id" value={doc.id} />

          <label className="field">
            <span>Titulo</span>
            <input type="text" name="title" required defaultValue={doc.title} />
          </label>

          <label className="field">
            <span>Slug</span>
            <input type="text" name="slug" required defaultValue={doc.slug} />
          </label>

          <label className="field">
            <span>Descripcion</span>
            <textarea name="description" rows={4} defaultValue={doc.description ?? ""} />
          </label>

          <label className="field">
            <span>Categoria</span>
            <select name="category" defaultValue={doc.category}>
              <option value="general">General</option>
              <option value="legal">Legal</option>
              <option value="oficio">Oficio</option>
              <option value="comunicado">Comunicado</option>
            </select>
          </label>

          <label className="field">
            <span>Estado</span>
            <select name="status" defaultValue={doc.status}>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </label>

          <label className="field">
            <span>Reemplazar archivo (opcional)</span>
            <input type="file" name="file" accept=".pdf,.doc,.docx" />
          </label>

          <button className="button button--primary" type="submit">
            Guardar cambios
          </button>
        </form>
      </article>

      <article className="card">
        <h2 className="title">Acciones rapidas</h2>
        <div className="actions">
          <form action={setDocumentStatusAction}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="target_status" value={doc.status === "published" ? "draft" : "published"} />
            <button className="button button--ghost" type="submit">
              {doc.status === "published" ? "Pasar a borrador" : "Publicar ahora"}
            </button>
          </form>

          <form action={deleteDocumentAction}>
            <input type="hidden" name="id" value={doc.id} />
            <button className="button button--danger" type="submit">
              Eliminar documento
            </button>
          </form>

          <Link href="/admin/documentos" className="button button--ghost">
            Volver al listado
          </Link>

          {doc.status === "published" ? (
            <Link href={`/documentos/${doc.slug}`} className="button button--ghost">
              Ver publico
            </Link>
          ) : null}
        </div>
        <p style={{ marginTop: "0.8rem" }}>
          Estado actual: <strong>{doc.status === "published" ? "Publicado" : "Borrador"}</strong>
          <br />
          Fecha de publicacion: <strong>{formatDate(doc.published_at)}</strong>
        </p>
      </article>
    </section>
  );
}

