import Link from "next/link";
import {
  createDocumentAction,
  deleteDocumentAction,
  setDocumentStatusAction
} from "@/app/admin/documentos/actions";
import { createClient } from "@/lib/supabase/server";

type AdminDocumentosPageProps = {
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

function categoryLabel(value: string): string {
  if (value === "legal") return "Legal";
  if (value === "oficio") return "Oficio";
  if (value === "comunicado") return "Comunicado";
  return "General";
}

export default async function AdminDocumentosPage({ searchParams }: AdminDocumentosPageProps) {
  const params = await searchParams;
  const errorMessage = asText(params.error);
  const okMessage = asText(params.ok);

  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, slug, category, status, published_at, updated_at, file_name")
    .order("updated_at", { ascending: false });

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Gestionar documentos</h1>
        <p className="subtitle">Sube archivos PDF/DOC/DOCX al repositorio privado y publica cuando corresponda.</p>

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

        <form action={createDocumentAction} className="form-grid">
          <label className="field">
            <span>Titulo</span>
            <input type="text" name="title" required placeholder="Ejemplo: Oficio 012-2026" />
          </label>

          <label className="field">
            <span>Slug (opcional)</span>
            <input type="text" name="slug" placeholder="oficio-012-2026" />
          </label>

          <label className="field">
            <span>Descripcion</span>
            <textarea name="description" rows={3} placeholder="Contexto del documento..." />
          </label>

          <label className="field">
            <span>Categoria</span>
            <select name="category" defaultValue="general">
              <option value="general">General</option>
              <option value="legal">Legal</option>
              <option value="oficio">Oficio</option>
              <option value="comunicado">Comunicado</option>
            </select>
          </label>

          <label className="field">
            <span>Estado</span>
            <select name="status" defaultValue="draft">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </label>

          <label className="field">
            <span>Archivo (PDF/DOC/DOCX, max 50 MB)</span>
            <input type="file" name="file" accept=".pdf,.doc,.docx" required />
          </label>

          <button className="button button--primary" type="submit">
            Crear documento
          </button>
        </form>
      </article>

      <article className="card">
        <h2 className="title">Documentos registrados</h2>
        {!documents || documents.length === 0 ? <p>No hay documentos todavia.</p> : null}

        {documents && documents.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Categoria</th>
                  <th>Estado</th>
                  <th>Publicacion</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <strong>{doc.title}</strong>
                      <br />
                      <small>{doc.file_name}</small>
                    </td>
                    <td>{categoryLabel(doc.category)}</td>
                    <td>{doc.status === "published" ? "Publicado" : "Borrador"}</td>
                    <td>{formatDate(doc.published_at)}</td>
                    <td>{formatDate(doc.updated_at)}</td>
                    <td>
                      <div className="actions">
                        <Link href={`/admin/documentos/${doc.id}`} className="button button--ghost">
                          Editar
                        </Link>

                        <form action={setDocumentStatusAction}>
                          <input type="hidden" name="id" value={doc.id} />
                          <input
                            type="hidden"
                            name="target_status"
                            value={doc.status === "published" ? "draft" : "published"}
                          />
                          <button className="button button--ghost" type="submit">
                            {doc.status === "published" ? "Pasar a borrador" : "Publicar"}
                          </button>
                        </form>

                        <form action={deleteDocumentAction}>
                          <input type="hidden" name="id" value={doc.id} />
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
