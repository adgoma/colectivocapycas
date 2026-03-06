"use server";

import { redirect } from "next/navigation";
import { canManageContent } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

function normalizeNextPath(rawNext: string | null): string {
  if (!rawNext) {
    return "/admin";
  }

  if (rawNext.startsWith("/admin")) {
    return rawNext;
  }

  return "/admin";
}

function buildLoginRedirect(messageKey: "error" | "ok", message: string, nextPath?: string): string {
  const params = new URLSearchParams();
  params.set(messageKey, message);

  if (nextPath) {
    params.set("next", normalizeNextPath(nextPath));
  }

  return `/login?${params.toString()}`;
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = normalizeNextPath(String(formData.get("next") ?? "/admin"));

  if (!email || !password) {
    redirect(buildLoginRedirect("error", "Completa correo y contrasena.", nextPath));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    redirect(buildLoginRedirect("error", "Credenciales inválidas.", nextPath));
  }

  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  const roles = (roleRows ?? []).map((row) => row.role);

  if (!canManageContent(roles)) {
    await supabase.auth.signOut();
    redirect(buildLoginRedirect("error", "Tu usuario no tiene permisos de administracion.", nextPath));
  }

  redirect(nextPath);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?ok=Sesion cerrada.");
}
