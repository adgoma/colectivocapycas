import Link from "next/link";
import { HomeHeroSlider, type HomeHeroSlide } from "@/components/home-hero-slider";
import {
  DEFAULT_HOME_SLIDER_SETTINGS,
  DEFAULT_ORGANIZATION_SETTINGS,
  normalizeHomeSliderSettings,
  normalizeOrganizationSettings
} from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function daysSinceMarch2025(): number {
  const referenceUtc = Date.UTC(2025, 2, 31);
  const now = new Date();
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffMs = nowUtc - referenceUtc;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default async function HomePage() {
  const supabase = await createClient();
  const [
    settingsRowsResult,
    publishedPostsResult,
    publishedDocumentsResult,
    postsCountResult,
    documentsCountResult,
    albumsCountResult
  ] = await Promise.all([
    supabase.from("site_settings").select("key, value").in("key", ["organization", "home_slider"]),
    supabase
      .from("posts")
      .select("id, title, slug, summary, published_at, cover_image_url")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6),
    supabase
      .from("documents")
      .select("id, title, slug, description, category, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("albums").select("id", { count: "exact", head: true }).eq("is_public", true)
  ]);

  const settingsRows = settingsRowsResult.data ?? [];
  const organizationRow = settingsRows.find((row) => row.key === "organization");
  const sliderRow = settingsRows.find((row) => row.key === "home_slider");

  const organization = organizationRow
    ? normalizeOrganizationSettings(organizationRow.value)
    : DEFAULT_ORGANIZATION_SETTINGS;
  const sliderSettings = sliderRow
    ? normalizeHomeSliderSettings(sliderRow.value)
    : DEFAULT_HOME_SLIDER_SETTINGS;

  const posts = publishedPostsResult.data ?? [];
  const documents = publishedDocumentsResult.data ?? [];
  const latestPost = posts[0];
  const latestDocument = documents[0];
  const daysSinceCutoff = daysSinceMarch2025();

  const fallbackSlides: HomeHeroSlide[] = [
    {
      id: "identity",
      eyebrow: "Portal Institucional",
      title: organization.name,
      description: organization.tagline,
      imageUrl: "/logo-oficial.png",
      imageAlt: "Logo oficial del colectivo",
      primaryAction: {
        href: "/quienes-somos",
        label: "Conocer al colectivo"
      },
      secondaryAction: {
        href: "/contacto",
        label: "Canales oficiales",
        variant: "ghost"
      }
    },
    latestPost
      ? {
          id: "latest-gestion",
          eyebrow: "Ultima gestion publicada",
          title: latestPost.title,
          description: latestPost.summary || `Actualizacion publicada el ${formatDate(latestPost.published_at)}.`,
          imageUrl: latestPost.cover_image_url,
          imageAlt: latestPost.title,
          primaryAction: {
            href: `/gestiones/${latestPost.slug}`,
            label: "Leer gestion"
          },
          secondaryAction: {
            href: "/gestiones",
            label: "Ver cronologia",
            variant: "ghost"
          }
        }
      : {
          id: "latest-gestion-empty",
          eyebrow: "Gestiones",
          title: "Seguimiento oficial del proceso",
          description: "Publicamos de forma cronologica todas las acciones y avances del colectivo.",
          imageUrl: "/logo-oficial.png",
          imageAlt: "Logo oficial del colectivo",
          primaryAction: {
            href: "/gestiones",
            label: "Explorar gestiones"
          },
          secondaryAction: {
            href: "/admin/gestiones",
            label: "Panel admin",
            variant: "ghost"
          }
        },
    latestDocument
      ? {
          id: "latest-document",
          eyebrow: "Documento destacado",
          title: latestDocument.title,
          description:
            latestDocument.description || `Documento publicado el ${formatDate(latestDocument.published_at)}.`,
          imageUrl: "/logo-oficial.png",
          imageAlt: "Logo oficial del colectivo",
          primaryAction: {
            href: `/documentos/${latestDocument.slug}/descargar`,
            label: "Descargar documento"
          },
          secondaryAction: {
            href: "/documentos",
            label: "Ver biblioteca",
            variant: "ghost"
          }
        }
      : {
          id: "latest-document-empty",
          eyebrow: "Transparencia documental",
          title: "Repositorio oficial de documentos",
          description: "Aqui se publican oficios, memoriales y documentos de respaldo del proceso.",
          imageUrl: "/logo-oficial.png",
          imageAlt: "Logo oficial del colectivo",
          primaryAction: {
            href: "/documentos",
            label: "Ir a documentos"
          },
          secondaryAction: {
            href: "/contacto",
            label: "Solicitar informacion",
            variant: "ghost"
          }
        }
  ];

  const managedSlides: HomeHeroSlide[] = sliderSettings.slides
    .filter((slide) => slide.isPublished)
    .map((slide) => ({
      id: slide.id,
      eyebrow: slide.eyebrow || "Comunicado",
      title: slide.title,
      description: slide.description,
      imageUrl: slide.imageUrl || "/logo-oficial.png",
      imageAlt: slide.title,
      primaryAction: {
        href: slide.primaryHref,
        label: slide.primaryLabel
      },
      secondaryAction:
        slide.secondaryLabel && slide.secondaryHref
          ? {
              href: slide.secondaryHref,
              label: slide.secondaryLabel,
              variant: "ghost"
            }
          : undefined
    }));

  const heroSlides = managedSlides.length > 0 ? managedSlides : fallbackSlides;

  return (
    <section className="home-stack">
      <HomeHeroSlider slides={heroSlides} />

      <section className="home-kpis">
        <article className="card kpi-card">
          <p className="kpi-card__label">Gestiones publicadas</p>
          <p className="kpi-card__value">{postsCountResult.count ?? 0}</p>
        </article>
        <article className="card kpi-card">
          <p className="kpi-card__label">Documentos disponibles</p>
          <p className="kpi-card__value">{documentsCountResult.count ?? 0}</p>
        </article>
        <article className="card kpi-card">
          <p className="kpi-card__label">Albumes publicos</p>
          <p className="kpi-card__value">{albumsCountResult.count ?? 0}</p>
        </article>
        <article className="card kpi-card">
          <p className="kpi-card__label">Dias desde el 31 de marzo de 2025</p>
          <p className="kpi-card__value">{daysSinceCutoff}</p>
        </article>
      </section>

      <section className="card">
        <h2 className="title">Linea de tiempo de gestiones</h2>
        {posts.length === 0 ? <p>Aun no hay hitos publicados.</p> : null}

        {posts.length > 0 ? (
          <div className="timeline-list">
            {posts.slice(0, 5).map((post) => (
              <article key={post.id} className="timeline-item">
                <p className="timeline-item__date">{formatDate(post.published_at)}</p>
                <h3>{post.title}</h3>
                <p>{post.summary || "Ver detalle de la gestion para el contenido completo."}</p>
                <Link href={`/gestiones/${post.slug}`} className="button button--ghost">
                  Ver detalle
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="split-grid">
        <article className="card">
          <h2 className="title">Ultimas gestiones</h2>
          {posts.length === 0 ? <p>No hay gestiones publicadas por el momento.</p> : null}
          {posts.length > 0 ? (
            <ul className="mini-list">
              {posts.slice(0, 3).map((post) => (
                <li key={post.id}>
                  <Link href={`/gestiones/${post.slug}`}>{post.title}</Link>
                  <small>{formatDate(post.published_at)}</small>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/gestiones" className="button button--ghost">
            Ver todas las gestiones
          </Link>
        </article>

        <article className="card">
          <h2 className="title">Ultimos documentos</h2>
          {documents.length === 0 ? <p>No hay documentos publicados por el momento.</p> : null}
          {documents.length > 0 ? (
            <ul className="mini-list">
              {documents.slice(0, 3).map((document) => (
                <li key={document.id}>
                  <Link href={`/documentos/${document.slug}`}>{document.title}</Link>
                  <small>{formatDate(document.published_at)}</small>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/documentos" className="button button--ghost">
            Ver todos los documentos
          </Link>
        </article>
      </section>
    </section>
  );
}
