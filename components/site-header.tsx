import Link from "next/link";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/quienes-somos", label: "Quienes somos" },
  { href: "/gestiones", label: "Gestiones" },
  { href: "/documentos", label: "Documentos" },
  { href: "/galeria", label: "Galeria" },
  { href: "/contacto", label: "Contacto" }
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__content">
        <Link href="/" className="site-header__brand" aria-label="Inicio Colectivo CAS y CAP">
          <img
            src="/logo-oficial.png"
            alt="Logo oficial del Colectivo CAS y CAP"
            className="site-header__logo"
            width={44}
            height={44}
          />
          <span>Colectivo Ex Indeterminados CAS y CAP</span>
        </Link>
        <nav className="site-nav">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/admin" className="button button--ghost">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
