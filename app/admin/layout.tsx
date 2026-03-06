import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminMenu } from "@/components/admin-menu";
import { getAuthUserContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Panel Admin | Colectivo CAS y CAP"
};

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authContext = await getAuthUserContext();

  if (!authContext) {
    redirect("/login?next=/admin");
  }

  if (!authContext.isAdmin) {
    redirect("/acceso-denegado");
  }

  return (
    <section className="admin-shell">
      <AdminMenu userEmail={authContext.user.email ?? "sin-correo"} roles={authContext.roles} />
      <div className="grid" style={{ gap: "1rem" }}>
        {children}
      </div>
    </section>
  );
}
