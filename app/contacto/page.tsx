import Link from "next/link";
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

  const socialLinks = [
    { label: "Facebook", url: toSafeUrl(contact.facebook) },
    { label: "Instagram", url: toSafeUrl(contact.instagram) },
    { label: "YouTube", url: toSafeUrl(contact.youtube) },
    { label: "Telegram", url: toSafeUrl(contact.telegram) },
    { label: "Sitio web", url: toSafeUrl(contact.website) }
  ].filter((item) => Boolean(item.url));

  const hasAnyContact =
    Boolean(contact.email) ||
    Boolean(contact.phone) ||
    Boolean(contact.whatsapp) ||
    Boolean(contact.address) ||
    Boolean(contact.schedule) ||
    socialLinks.length > 0;

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

      {socialLinks.length > 0 ? (
        <article className="card">
          <h2 className="title">Canales digitales</h2>
          <div className="actions">
            {socialLinks.map((item) => (
              <Link key={item.label} href={item.url ?? "#"} target="_blank" rel="noreferrer" className="button button--ghost">
                {item.label}
              </Link>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
