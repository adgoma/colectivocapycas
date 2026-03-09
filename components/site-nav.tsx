"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/quienes-somos", label: "Quienes somos" },
  { href: "/comunicados", label: "Comunicados" },
  { href: "/gestiones", label: "Gestiones" },
  { href: "/documentos", label: "Documentos" },
  { href: "/galeria", label: "Galeria" },
  { href: "/contacto", label: "Contacto" }
];

export function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="site-header__menu-toggle"
        aria-expanded={isOpen}
        aria-controls="site-nav"
        aria-label={isOpen ? "Cerrar menu de navegacion" : "Abrir menu de navegacion"}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav id="site-nav" className={`site-nav ${isOpen ? "is-open" : ""}`}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={closeMenu}>
            {link.label}
          </Link>
        ))}
        <Link href="/admin" className="button button--ghost" onClick={closeMenu}>
          Admin
        </Link>
      </nav>
    </>
  );
}
