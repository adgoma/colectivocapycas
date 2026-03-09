import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

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

        <SiteNav />
      </div>
    </header>
  );
}
