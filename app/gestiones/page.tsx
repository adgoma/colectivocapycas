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

export default async function GestionesPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, summary, published_at, cover_image_url")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Gestiones y avances</h1>
        <p className="subtitle">
          Seccion cronologica con reuniones, documentos presentados y avances del proceso de reincorporacion.
        </p>
      </article>

      {!posts || posts.length === 0 ? (
        <article className="card">
          <h2 className="title">Sin publicaciones aun</h2>
          <p>Pronto se publicaran las gestiones oficiales del colectivo.</p>
        </article>
      ) : null}

      {posts?.map((post) => (
        <article key={post.id} className="card">
          <h2 className="title">{post.title}</h2>
          <p style={{ marginTop: "-0.2rem", color: "#5f5a4d" }}>{formatDate(post.published_at)}</p>
          {post.summary ? <p>{post.summary}</p> : null}
          {post.cover_image_url ? (
            <img src={post.cover_image_url} alt={post.title} className="post-cover" width={1600} height={900} />
          ) : null}
          <Link href={`/gestiones/${post.slug}`} className="button button--ghost">
            Leer detalle
          </Link>
        </article>
      ))}
    </section>
  );
}
