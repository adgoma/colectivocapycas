"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageContent } from "@/lib/auth/roles";
import {
  type ContactSettings,
  type OrganizationSettings,
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_ORGANIZATION_SETTINGS
} from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

function asText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function withMessage(pathname: string, key: "ok" | "error", message: string): string {
  const params = new URLSearchParams();
  params.set(key, message);
  return `${pathname}?${params.toString()}`;
}

function linesToArray(value: string): string[] {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseOrganizationPayload(formData: FormData): OrganizationSettings {
  const name = asText(formData, "name");
  const institution = asText(formData, "institution");

  if (!name) {
    throw new Error("El nombre de la organizacion es obligatorio.");
  }

  if (!institution) {
    throw new Error("La institucion es obligatoria.");
  }

  return {
    name,
    institution,
    country: asText(formData, "country"),
    tagline: asText(formData, "tagline"),
    description: asText(formData, "description"),
    history: asText(formData, "history"),
    mission: asText(formData, "mission"),
    vision: asText(formData, "vision"),
    objectives: linesToArray(asText(formData, "objectives")),
    representatives: asText(formData, "representatives")
  };
}

function parseContactPayload(formData: FormData): ContactSettings {
  return {
    email: asText(formData, "email"),
    phone: asText(formData, "phone"),
    whatsapp: asText(formData, "whatsapp"),
    address: asText(formData, "address"),
    schedule: asText(formData, "schedule"),
    website: asText(formData, "website"),
    facebook: asText(formData, "facebook"),
    instagram: asText(formData, "instagram"),
    youtube: asText(formData, "youtube"),
    telegram: asText(formData, "telegram")
  };
}

function parseDbError(errorMessage: string | null): string {
  if (!errorMessage) {
    return "Operacion no completada.";
  }

  return errorMessage;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/organizacion");
  }

  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row) => row.role);

  if (!canManageContent(roles)) {
    redirect("/acceso-denegado");
  }

  return { supabase, user };
}

export async function updateOrganizationSettingsAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  let payload: OrganizationSettings;

  try {
    payload = parseOrganizationPayload(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar organizacion.";
    redirect(withMessage("/admin/organizacion", "error", message));
  }

  const value = {
    ...DEFAULT_ORGANIZATION_SETTINGS,
    ...payload
  };

  const { error } = await supabase.from("site_settings").upsert(
    {
      key: "organization",
      value,
      updated_by: user.id
    },
    {
      onConflict: "key"
    }
  );

  if (error) {
    redirect(withMessage("/admin/organizacion", "error", parseDbError(error.message)));
  }

  revalidatePath("/");
  revalidatePath("/quienes-somos");
  revalidatePath("/contacto");
  revalidatePath("/admin/organizacion");
  redirect(withMessage("/admin/organizacion", "ok", "Datos de organizacion actualizados."));
}

export async function updateContactSettingsAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const payload = parseContactPayload(formData);
  const value = {
    ...DEFAULT_CONTACT_SETTINGS,
    ...payload
  };

  const { error } = await supabase.from("site_settings").upsert(
    {
      key: "contact",
      value,
      updated_by: user.id
    },
    {
      onConflict: "key"
    }
  );

  if (error) {
    redirect(withMessage("/admin/organizacion", "error", parseDbError(error.message)));
  }

  revalidatePath("/contacto");
  revalidatePath("/admin/organizacion");
  redirect(withMessage("/admin/organizacion", "ok", "Datos de contacto actualizados."));
}

