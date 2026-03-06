import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "2-digit"
  });
}

function categoryLabel(value: string): string {
  if (value === "legal") return "Legal";
  if (value === "oficio") return "Oficio";
  if (value === "comunicado") return "Comunicado";
  return "General";
}

export default async function DocumentosPage() {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, slug, description, category, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Documentos</h1>
        <p className="subtitle">
          Biblioteca documental de oficios, memoriales, escritos legales y anexos del colectivo.
        </p>
      </article>

      {!documents || documents.length === 0 ? (
        <article className="card">
          <h2 className="title">Sin documentos publicados</h2>
          <p>Cuando el equipo admin publique documentos, apareceran aqui.</p>
        </article>
      ) : null}

      {documents?.map((doc) => (
        <article key={doc.id} className="card">
          <h2 className="title">{doc.title}</h2>
          <p style={{ marginTop: "-0.2rem", color: "#5f5a4d" }}>
            {formatDate(doc.published_at)} | {categoryLabel(doc.category)}
          </p>
          {doc.description ? <p>{doc.description}</p> : null}
          <div className="actions">
            <Link href={`/documentos/${doc.slug}`} className="button button--ghost">
              Ver detalle
            </Link>
            <Link href={`/documentos/${doc.slug}/descargar`} className="button button--primary">
              Descargar
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
