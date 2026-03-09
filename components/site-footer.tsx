import Link from "next/link";
import { SocialIcon, type SocialPlatform } from "@/components/social-icons";
import {
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_ORGANIZATION_SETTINGS,
  normalizeContactSettings,
  normalizeOrganizationSettings
} from "@/lib/site-settings";
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

export async function SiteFooter() {
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

  const socialChannels: Array<{ platform: SocialPlatform; label: string; url: string | null }> = [
    { platform: "facebook", label: "Facebook", url: toSafeUrl(contact.facebook) },
    { platform: "tiktok", label: "TikTok", url: toSafeUrl(contact.tiktok) },
    { platform: "youtube", label: "YouTube", url: toSafeUrl(contact.youtube) },
    { platform: "telegram", label: "Telegram", url: toSafeUrl(contact.telegram) },
    { platform: "website", label: "Web", url: toSafeUrl(contact.website) }
  ];

  const quickLinks = [
    { href: "/quienes-somos", label: "Quienes somos" },
    { href: "/comunicados", label: "Comunicados" },
    { href: "/gestiones", label: "Gestiones" },
    { href: "/documentos", label: "Documentos" },
    { href: "/galeria", label: "Galeria" },
    { href: "/contacto", label: "Contacto" }
  ];

  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <section className="site-footer__brand">
          <h2 className="site-footer__title">{organization.name}</h2>
          <p className="site-footer__description">{organization.tagline}</p>
          <p className="site-footer__meta">
            {organization.institution} - {organization.country}
          </p>
          {contact.email ? (
            <p className="site-footer__meta">
              Correo: <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </p>
          ) : null}
          {contact.whatsapp ? <p className="site-footer__meta">WhatsApp: {contact.whatsapp}</p> : null}
        </section>

        <section className="site-footer__links">
          <h3>Navegacion</h3>
          <ul className="site-footer__links-list">
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="site-footer__social">
          <h3>Redes oficiales</h3>
          <div className="site-footer__social-list">
            {socialChannels.map((item) =>
              item.url ? (
                <Link
                  key={item.platform}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="site-footer__social-link"
                  aria-label={item.label}
                  title={item.label}
                >
                  <SocialIcon platform={item.platform} className="social-icon" />
                </Link>
              ) : (
                <span
                  key={item.platform}
                  className="site-footer__social-link is-disabled"
                  aria-disabled="true"
                  title={`${item.label} sin enlace`}
                >
                  <SocialIcon platform={item.platform} className="social-icon" />
                </span>
              )
            )}
          </div>
        </section>
      </div>
      <div className="container site-footer__bottom">
        <small>
          {new Date().getFullYear()} Colectivo Ex Indeterminados CAS y CAP. Informacion oficial del proceso de
          reincorporacion.
        </small>
      </div>
    </footer>
  );
}
