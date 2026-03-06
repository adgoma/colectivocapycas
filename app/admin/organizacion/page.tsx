import {
  updateContactSettingsAction,
  updateOrganizationSettingsAction
} from "@/app/admin/organizacion/actions";
import {
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_ORGANIZATION_SETTINGS,
  normalizeContactSettings,
  normalizeOrganizationSettings
} from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

type AdminOrganizacionPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function AdminOrganizacionPage({ searchParams }: AdminOrganizacionPageProps) {
  const params = await searchParams;
  const errorMessage = asText(params.error);
  const okMessage = asText(params.ok);

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["organization", "contact"]);

  const organizationRow = rows?.find((row) => row.key === "organization");
  const contactRow = rows?.find((row) => row.key === "contact");

  const organization = organizationRow
    ? normalizeOrganizationSettings(organizationRow.value)
    : DEFAULT_ORGANIZATION_SETTINGS;
  const contact = contactRow ? normalizeContactSettings(contactRow.value) : DEFAULT_CONTACT_SETTINGS;

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Datos de organizacion</h1>
        <p className="subtitle">
          Edita la informacion institucional que se muestra en <code>/quienes-somos</code>.
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

        <form action={updateOrganizationSettingsAction} className="form-grid">
          <label className="field">
            <span>Nombre</span>
            <input type="text" name="name" required defaultValue={organization.name} />
          </label>

          <label className="field">
            <span>Institucion</span>
            <input type="text" name="institution" required defaultValue={organization.institution} />
          </label>

          <label className="field">
            <span>Pais</span>
            <input type="text" name="country" defaultValue={organization.country} />
          </label>

          <label className="field">
            <span>Lema</span>
            <input type="text" name="tagline" defaultValue={organization.tagline} />
          </label>

          <label className="field">
            <span>Descripcion corta</span>
            <textarea name="description" rows={3} defaultValue={organization.description} />
          </label>

          <label className="field">
            <span>Historia</span>
            <textarea name="history" rows={5} defaultValue={organization.history} />
          </label>

          <label className="field">
            <span>Mision</span>
            <textarea name="mission" rows={4} defaultValue={organization.mission} />
          </label>

          <label className="field">
            <span>Vision</span>
            <textarea name="vision" rows={4} defaultValue={organization.vision} />
          </label>

          <label className="field">
            <span>Objetivos (uno por linea)</span>
            <textarea name="objectives" rows={6} defaultValue={organization.objectives.join("\n")} />
          </label>

          <label className="field">
            <span>Representantes</span>
            <textarea name="representatives" rows={3} defaultValue={organization.representatives} />
          </label>

          <button className="button button--primary" type="submit">
            Guardar organizacion
          </button>
        </form>
      </article>

      <article className="card">
        <h2 className="title">Datos de contacto</h2>
        <p className="subtitle">Edita la informacion mostrada en <code>/contacto</code>.</p>

        <form action={updateContactSettingsAction} className="form-grid">
          <label className="field">
            <span>Correo</span>
            <input type="email" name="email" defaultValue={contact.email} placeholder="contacto@dominio.com" />
          </label>

          <label className="field">
            <span>Telefono</span>
            <input type="text" name="phone" defaultValue={contact.phone} />
          </label>

          <label className="field">
            <span>WhatsApp</span>
            <input type="text" name="whatsapp" defaultValue={contact.whatsapp} />
          </label>

          <label className="field">
            <span>Direccion</span>
            <textarea name="address" rows={3} defaultValue={contact.address} />
          </label>

          <label className="field">
            <span>Horario</span>
            <input type="text" name="schedule" defaultValue={contact.schedule} />
          </label>

          <label className="field">
            <span>Sitio web</span>
            <input type="url" name="website" defaultValue={contact.website} placeholder="https://..." />
          </label>

          <label className="field">
            <span>Facebook</span>
            <input type="url" name="facebook" defaultValue={contact.facebook} placeholder="https://facebook.com/..." />
          </label>

          <label className="field">
            <span>Instagram</span>
            <input type="url" name="instagram" defaultValue={contact.instagram} placeholder="https://instagram.com/..." />
          </label>

          <label className="field">
            <span>YouTube</span>
            <input type="url" name="youtube" defaultValue={contact.youtube} placeholder="https://youtube.com/..." />
          </label>

          <label className="field">
            <span>Telegram</span>
            <input type="url" name="telegram" defaultValue={contact.telegram} placeholder="https://t.me/..." />
          </label>

          <button className="button button--primary" type="submit">
            Guardar contacto
          </button>
        </form>
      </article>
    </section>
  );
}
