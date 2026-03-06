import {
  createHomeSliderSlideAction,
  deleteHomeSliderSlideAction,
  updateContactSettingsAction,
  updateHomeSliderSlideAction,
  updateOrganizationSettingsAction
} from "@/app/admin/organizacion/actions";
import {
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_HOME_SLIDER_SETTINGS,
  DEFAULT_ORGANIZATION_SETTINGS,
  normalizeContactSettings,
  normalizeHomeSliderSettings,
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
    .in("key", ["organization", "contact", "home_slider"]);

  const organizationRow = rows?.find((row) => row.key === "organization");
  const contactRow = rows?.find((row) => row.key === "contact");
  const sliderRow = rows?.find((row) => row.key === "home_slider");

  const organization = organizationRow
    ? normalizeOrganizationSettings(organizationRow.value)
    : DEFAULT_ORGANIZATION_SETTINGS;
  const contact = contactRow ? normalizeContactSettings(contactRow.value) : DEFAULT_CONTACT_SETTINGS;
  const homeSlider = sliderRow ? normalizeHomeSliderSettings(sliderRow.value) : DEFAULT_HOME_SLIDER_SETTINGS;

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
            <span>TikTok</span>
            <input type="url" name="tiktok" defaultValue={contact.tiktok} placeholder="https://www.tiktok.com/@usuario" />
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

      <article className="card">
        <h2 className="title">Slider de inicio</h2>
        <p className="subtitle">
          Administra los slides que aparecen en la portada. Recomendado: imagen horizontal 1600x900.
        </p>

        <form action={createHomeSliderSlideAction} className="form-grid">
          <label className="field">
            <span>Titulo</span>
            <input type="text" name="title" required />
          </label>

          <label className="field">
            <span>Etiqueta superior (opcional)</span>
            <input type="text" name="eyebrow" placeholder="Comunicado oficial" />
          </label>

          <label className="field">
            <span>Descripcion</span>
            <textarea name="description" rows={4} />
          </label>

          <div className="split-grid">
            <label className="field">
              <span>Texto boton principal</span>
              <input type="text" name="primary_label" required defaultValue="Ver detalle" />
            </label>

            <label className="field">
              <span>Enlace boton principal</span>
              <input type="text" name="primary_href" required defaultValue="/gestiones" />
            </label>
          </div>

          <div className="split-grid">
            <label className="field">
              <span>Texto boton secundario (opcional)</span>
              <input type="text" name="secondary_label" />
            </label>

            <label className="field">
              <span>Enlace boton secundario (opcional)</span>
              <input type="text" name="secondary_href" />
            </label>
          </div>

          <div className="split-grid">
            <label className="field">
              <span>Orden</span>
              <input type="number" name="sort_order" min={0} defaultValue={homeSlider.slides.length + 1} />
            </label>

            <label className="field">
              <span>Imagen del slide</span>
              <input type="file" name="image_file" accept=".jpg,.jpeg,.png,.webp" required />
            </label>
          </div>

          <label className="field-inline">
            <input type="checkbox" name="is_published" defaultChecked />
            <span>Publicar inmediatamente en la portada</span>
          </label>

          <button className="button button--primary" type="submit">
            Agregar slide
          </button>
        </form>

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "1rem 0" }} />

        {homeSlider.slides.length === 0 ? <p>No hay slides registrados todavia.</p> : null}

        {homeSlider.slides.length > 0 ? (
          <div className="slider-admin-grid">
            {homeSlider.slides.map((slide) => (
              <article key={slide.id} className="slider-admin-card">
                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="slider-admin-image"
                    width={1200}
                    height={675}
                  />
                ) : null}

                <form action={updateHomeSliderSlideAction} className="form-grid">
                  <input type="hidden" name="slide_id" value={slide.id} />

                  <label className="field">
                    <span>Titulo</span>
                    <input type="text" name="title" required defaultValue={slide.title} />
                  </label>

                  <label className="field">
                    <span>Etiqueta superior</span>
                    <input type="text" name="eyebrow" defaultValue={slide.eyebrow} />
                  </label>

                  <label className="field">
                    <span>Descripcion</span>
                    <textarea name="description" rows={4} defaultValue={slide.description} />
                  </label>

                  <div className="split-grid">
                    <label className="field">
                      <span>Texto boton principal</span>
                      <input type="text" name="primary_label" required defaultValue={slide.primaryLabel} />
                    </label>

                    <label className="field">
                      <span>Enlace boton principal</span>
                      <input type="text" name="primary_href" required defaultValue={slide.primaryHref} />
                    </label>
                  </div>

                  <div className="split-grid">
                    <label className="field">
                      <span>Texto boton secundario</span>
                      <input type="text" name="secondary_label" defaultValue={slide.secondaryLabel} />
                    </label>

                    <label className="field">
                      <span>Enlace boton secundario</span>
                      <input type="text" name="secondary_href" defaultValue={slide.secondaryHref} />
                    </label>
                  </div>

                  <div className="split-grid">
                    <label className="field">
                      <span>Orden</span>
                      <input type="number" name="sort_order" min={0} defaultValue={slide.sortOrder} />
                    </label>

                    <label className="field">
                      <span>Reemplazar imagen (opcional)</span>
                      <input type="file" name="image_file" accept=".jpg,.jpeg,.png,.webp" />
                    </label>
                  </div>

                  <label className="field-inline">
                    <input type="checkbox" name="is_published" defaultChecked={slide.isPublished} />
                    <span>Publicado en portada</span>
                  </label>

                  <button className="button button--primary" type="submit">
                    Guardar slide
                  </button>
                </form>

                <form action={deleteHomeSliderSlideAction} style={{ marginTop: "0.7rem" }}>
                  <input type="hidden" name="slide_id" value={slide.id} />
                  <button className="button button--danger" type="submit">
                    Eliminar slide
                  </button>
                </form>
              </article>
            ))}
          </div>
        ) : null}
      </article>
    </section>
  );
}
