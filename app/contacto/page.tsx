import Link from "next/link";
import { SocialIcon, type SocialPlatform } from "@/components/social-icons";
import { DEFAULT_CONTACT_SETTINGS, normalizeContactSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

function toSafeUrl(raw: string): string | null {
  const value = raw.trim();

  if (!value) {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

export default async function ContactoPage() {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "contact")
    .maybeSingle();

  const contact = row ? normalizeContactSettings(row.value) : DEFAULT_CONTACT_SETTINGS;

  const socialChannels: Array<{ platform: SocialPlatform; label: string; url: string | null }> = [
    { platform: "facebook", label: "Facebook", url: toSafeUrl(contact.facebook) },
    { platform: "tiktok", label: "TikTok", url: toSafeUrl(contact.tiktok) },
    { platform: "youtube", label: "YouTube", url: toSafeUrl(contact.youtube) },
    { platform: "telegram", label: "Telegram", url: toSafeUrl(contact.telegram) },
    { platform: "website", label: "Sitio web", url: toSafeUrl(contact.website) }
  ];

  const hasAnyContact =
    Boolean(contact.email) ||
    Boolean(contact.phone) ||
    Boolean(contact.whatsapp) ||
    Boolean(contact.address) ||
    Boolean(contact.schedule) ||
    socialChannels.some((item) => Boolean(item.url));

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <article className="card">
        <h1 className="title">Contacto</h1>
        <p className="subtitle">Canales oficiales para comunicacion del colectivo.</p>

        {!hasAnyContact ? <p>Aun no se registraron datos de contacto publicos.</p> : null}

        {contact.email ? (
          <p>
            <strong>Correo:</strong> <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </p>
        ) : null}

        {contact.phone ? (
          <p>
            <strong>Telefono:</strong> {contact.phone}
          </p>
        ) : null}

        {contact.whatsapp ? (
          <p>
            <strong>WhatsApp:</strong> {contact.whatsapp}
          </p>
        ) : null}

        {contact.address ? (
          <p>
            <strong>Direccion:</strong> {contact.address}
          </p>
        ) : null}

        {contact.schedule ? (
          <p>
            <strong>Horario:</strong> {contact.schedule}
          </p>
        ) : null}
      </article>

      <article className="card">
        <h2 className="title">Canales digitales</h2>
        <p className="subtitle">Iconos oficiales visibles por defecto. Los canales sin enlace aparecen en gris.</p>
        <div className="social-network-grid">
          {socialChannels.map((item) =>
            item.url ? (
              <Link
                key={item.platform}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="social-network-card"
              >
                <span className="social-network-card__icon" aria-hidden="true">
                  <SocialIcon platform={item.platform} className="social-icon" />
                </span>
                <span className="social-network-card__label">{item.label}</span>
              </Link>
            ) : (
              <div key={item.platform} className="social-network-card is-disabled" aria-disabled="true">
                <span className="social-network-card__icon" aria-hidden="true">
                  <SocialIcon platform={item.platform} className="social-icon" />
                </span>
                <span className="social-network-card__label">{item.label}</span>
                <small className="social-network-card__hint">Sin enlace</small>
              </div>
            )
          )}
        </div>
      </article>
    </section>
  );
}
