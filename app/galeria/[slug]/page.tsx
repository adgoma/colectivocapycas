import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AlbumPublicDetailPageProps = {
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

function publicPhotoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string
): string {
  const {
    data: { publicUrl }
  } = supabase.storage.from("gallery").getPublicUrl(filePath);

  return publicUrl;
}

export default async function AlbumPublicDetailPage({ params }: AlbumPublicDetailPageProps) {
  const routeParams = await params;
  const supabase = await createClient();

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .select("id, title, description, event_date")
    .eq("slug", routeParams.slug)
    .eq("is_public", true)
    .maybeSingle();

  if (albumError || !album) {
    notFound();
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id, caption, file_name, file_path")
    .eq("album_id", album.id)
    .eq("is_public", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">{album.title}</h1>
        <p style={{ marginTop: "-0.2rem", color: "#5f5a4d" }}>{formatDate(album.event_date)}</p>
        {album.description ? <p className="subtitle">{album.description}</p> : null}

        <Link href="/galeria" className="button button--ghost">
          Volver a galeria
        </Link>
      </article>

      {!photos || photos.length === 0 ? (
        <article className="card">
          <h2 className="title">Sin fotos publicas</h2>
          <p>Este album aun no tiene fotos visibles para el publico.</p>
        </article>
      ) : null}

      {photos && photos.length > 0 ? (
        <div className="gallery-grid">
          {photos.map((photo) => {
            const imageUrl = publicPhotoUrl(supabase, photo.file_path);

            return (
              <figure className="gallery-item" key={photo.id}>
                <img
                  src={imageUrl}
                  alt={photo.caption ?? photo.file_name}
                  className="gallery-item__image"
                  width={1200}
                  height={900}
                />
                {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
              </figure>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
