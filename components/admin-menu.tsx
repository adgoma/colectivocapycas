import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

const links = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/gestiones", label: "Gestionar gestiones" },
  { href: "/admin/documentos", label: "Gestionar documentos" },
  { href: "/admin/galeria", label: "Gestionar galeria" },
  { href: "/admin/organizacion", label: "Organizacion y slider" }
];

type AdminMenuProps = {
  userEmail: string;
  roles: string[];
};

export function AdminMenu({ userEmail, roles }: AdminMenuProps) {
  const rolesLabel = roles.length > 0 ? roles.join(", ") : "sin rol";

  return (
    <aside className="admin-menu">
      <h2>Panel Admin</h2>
      <p className="admin-meta">
        <strong>Usuario:</strong> {userEmail}
        <br />
        <strong>Roles:</strong> {rolesLabel}
      </p>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
      <form action={logoutAction} style={{ marginTop: "1rem" }}>
        <button className="button button--ghost" type="submit">
          Cerrar sesion
        </button>
      </form>
    </aside>
  );
}
