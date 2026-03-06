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

function publicPhotoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string | null
): string | null {
  if (!filePath) {
    return null;
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from("gallery").getPublicUrl(filePath);

  return publicUrl;
}

export default async function GaleriaPage() {
  const supabase = await createClient();
  const { data: albums } = await supabase
    .from("albums")
    .select("id, title, slug, description, event_date, cover_path")
    .eq("is_public", true)
    .order("event_date", { ascending: false });

  const albumIds = (albums ?? []).map((album) => album.id);
  let photoRows: Array<{ album_id: string; file_path: string }> = [];

  if (albumIds.length > 0) {
    const { data: rows } = await supabase
      .from("photos")
      .select("album_id, file_path")
      .eq("is_public", true)
      .in("album_id", albumIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    photoRows = rows ?? [];
  }

  const photoStats = new Map<string, { count: number; firstPath: string | null; pathSet: Set<string> }>();

  for (const row of photoRows) {
    const existing = photoStats.get(row.album_id);

    if (!existing) {
      photoStats.set(row.album_id, {
        count: 1,
        firstPath: row.file_path,
        pathSet: new Set([row.file_path])
      });
      continue;
    }

    existing.count += 1;
    existing.pathSet.add(row.file_path);
  }

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Galeria</h1>
        <p className="subtitle">
          Albumes fotograficos de reuniones, actividades, asambleas y acciones publicas del colectivo.
        </p>
      </article>

      {!albums || albums.length === 0 ? (
        <article className="card">
          <h2 className="title">Sin albumes publicados</h2>
          <p>Cuando el equipo admin publique albumes, apareceran aqui.</p>
        </article>
      ) : null}

      <div className="album-grid">
        {albums?.map((album) => {
          const stats = photoStats.get(album.id);
          const hasCover = Boolean(album.cover_path && stats?.pathSet.has(album.cover_path));
          const coverPath = hasCover ? album.cover_path : stats?.firstPath ?? null;
          const coverUrl = publicPhotoUrl(supabase, coverPath);
          const photoCount = stats?.count ?? 0;

          return (
            <article key={album.id} className="card album-card">
              {coverUrl ? <img src={coverUrl} alt={album.title} className="album-card__cover" /> : null}
              <h2 className="title">{album.title}</h2>
              <p style={{ marginTop: "-0.2rem", color: "#5f5a4d" }}>
                {formatDate(album.event_date)} | {photoCount} foto(s)
              </p>
              {album.description ? <p>{album.description}</p> : null}
              <Link href={`/galeria/${album.slug}`} className="button button--ghost">
                Ver album
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
