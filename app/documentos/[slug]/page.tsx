import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DocumentoDetailPageProps = {
  params: Promise<{ slug: string }>;
};

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

export default async function DocumentoDetailPage({ params }: DocumentoDetailPageProps) {
  const routeParams = await params;
  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("title, slug, description, category, published_at, file_name")
    .eq("slug", routeParams.slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !doc) {
    notFound();
  }

  return (
    <article className="card">
      <h1 className="title">{doc.title}</h1>
      <p style={{ marginTop: "-0.2rem", color: "#5f5a4d" }}>
        {formatDate(doc.published_at)} | {categoryLabel(doc.category)}
      </p>
      {doc.description ? <p className="subtitle">{doc.description}</p> : null}

      <p>
        Archivo: <strong>{doc.file_name}</strong>
      </p>

      <div className="actions">
        <Link href={`/documentos/${doc.slug}/descargar`} className="button button--primary">
          Descargar documento
        </Link>
        <Link href="/documentos" className="button button--ghost">
          Volver a documentos
        </Link>
      </div>
    </article>
  );
}

