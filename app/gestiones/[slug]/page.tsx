import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type GestionDetailPageProps = {
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

export default async function GestionDetailPage({ params }: GestionDetailPageProps) {
  const routeParams = await params;
  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select("title, summary, content_md, cover_image_url, published_at, status")
    .eq("slug", routeParams.slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  return (
    <article className="card">
      <h1 className="title">{post.title}</h1>
      <p style={{ marginTop: "-0.2rem", color: "#5f5a4d" }}>{formatDate(post.published_at)}</p>
      {post.summary ? <p className="subtitle">{post.summary}</p> : null}
      {post.cover_image_url ? <img src={post.cover_image_url} alt={post.title} className="post-cover" /> : null}
      <div className="post-content">{post.content_md}</div>
    </article>
  );
}

