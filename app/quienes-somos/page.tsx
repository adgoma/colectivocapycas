import {
  DEFAULT_ORGANIZATION_SETTINGS,
  normalizeOrganizationSettings
} from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

export default async function QuienesSomosPage() {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "organization")
    .maybeSingle();

  const organization = row ? normalizeOrganizationSettings(row.value) : DEFAULT_ORGANIZATION_SETTINGS;

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Quienes somos</h1>
        <p className="subtitle">
          <strong>{organization.name}</strong> - {organization.institution} ({organization.country})
        </p>
        <p>{organization.tagline}</p>
        <p>{organization.description}</p>
      </article>

      {organization.history ? (
        <article className="card">
          <h2 className="title">Historia</h2>
          <div className="post-content">{organization.history}</div>
        </article>
      ) : null}

      {organization.mission ? (
        <article className="card">
          <h2 className="title">Mision</h2>
          <div className="post-content">{organization.mission}</div>
        </article>
      ) : null}

      {organization.vision ? (
        <article className="card">
          <h2 className="title">Vision</h2>
          <div className="post-content">{organization.vision}</div>
        </article>
      ) : null}

      {organization.objectives.length > 0 ? (
        <article className="card">
          <h2 className="title">Objetivos</h2>
          <ul className="plain-list">
            {organization.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </article>
      ) : null}

      {organization.representatives ? (
        <article className="card">
          <h2 className="title">Representantes</h2>
          <div className="post-content">{organization.representatives}</div>
        </article>
      ) : null}
    </section>
  );
}
