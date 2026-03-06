import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/login/actions";
import { getAuthUserContext } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeNextPath(rawNext: string): string {
  if (rawNext.startsWith("/admin")) {
    return rawNext;
  }

  return "/admin";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(asText(params.next) || "/admin");
  const errorMessage = asText(params.error);
  const okMessage = asText(params.ok);

  const authContext = await getAuthUserContext();

  if (authContext?.isAdmin) {
    redirect(nextPath);
  }

  return (
    <section className="grid" style={{ gap: "1rem", maxWidth: "580px", margin: "0 auto" }}>
      <article className="card">
        <h1 className="title">Ingreso al panel admin</h1>
        <p className="subtitle">Accede con tu cuenta registrada en Supabase Auth.</p>

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

        <form action={loginAction} className="form-grid">
          <input type="hidden" name="next" value={nextPath} />

          <label className="field">
            <span>Correo</span>
            <input type="email" name="email" required autoComplete="email" placeholder="tu-correo@dominio.com" />
          </label>

          <label className="field">
            <span>Contrasena</span>
            <input type="password" name="password" required autoComplete="current-password" />
          </label>

          <button className="button button--primary" type="submit">
            Ingresar
          </button>
        </form>
      </article>

      <article className="card">
        <strong>Importante</strong>
        <p>
          Solo usuarios con rol <code>superadmin</code> o <code>editor</code> pueden acceder al panel.
        </p>
        <Link href="/" className="button button--ghost">
          Volver al sitio
        </Link>
      </article>
    </section>
  );
}

