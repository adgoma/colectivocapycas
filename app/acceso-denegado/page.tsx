import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <article className="card" style={{ maxWidth: "720px", margin: "0 auto" }}>
      <h1 className="title">Acceso denegado</h1>
      <p className="subtitle">
        Tu cuenta inicio sesion correctamente, pero no tiene rol de administracion para entrar al panel.
      </p>
      <p>
        Solicita que te asignen rol <code>superadmin</code> o <code>editor</code> en la tabla{" "}
        <code>public.user_roles</code>.
      </p>
      <Link href="/" className="button button--ghost">
        Volver al inicio
      </Link>
    </article>
  );
}

