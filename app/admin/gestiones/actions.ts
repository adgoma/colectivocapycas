"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageContent } from "@/lib/auth/roles";
import { slugify } from "@/lib/text/slug";
import { createClient } from "@/lib/supabase/server";

type GestionStatus = "draft" | "published";

type GestionPayload = {
  title: string;
  slug: string;
  summary: string | null;
  content_md: string;
  cover_image_url: string | null;
  status: GestionStatus;
};

function asText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toStatus(value: string): GestionStatus {
  return value === "published" ? "published" : "draft";
}

function withMessage(pathname: string, key: "ok" | "error", message: string): string {
  const params = new URLSearchParams();
  params.set(key, message);
  return `${pathname}?${params.toString()}`;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/gestiones");
  }

  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row) => row.role);

  if (!canManageContent(roles)) {
    redirect("/acceso-denegado");
  }

  return { supabase, user };
}

function parsePayload(formData: FormData): GestionPayload {
  const title = asText(formData, "title");
  const rawSlug = asText(formData, "slug");
  const content = asText(formData, "content_md");
  const summary = asText(formData, "summary");
  const coverImageUrl = asText(formData, "cover_image_url");
  const status = toStatus(asText(formData, "status"));

  if (!title) {
    throw new Error("El titulo es obligatorio.");
  }

  if (!content) {
    throw new Error("El contenido es obligatorio.");
  }

  const safeSlug = slugify(rawSlug || title);

  if (!safeSlug) {
    throw new Error("No se pudo generar un slug valido.");
  }

  return {
    title,
    slug: safeSlug,
    summary: summary || null,
    content_md: content,
    cover_image_url: coverImageUrl || null,
    status
  };
}

function parseDbError(errorMessage: string | null): string {
  if (!errorMessage) {
    return "Operacion no completada.";
  }

  if (errorMessage.includes("posts_slug_key")) {
    return "El slug ya existe. Usa otro slug.";
  }

  return errorMessage;
}

function publishedAtFor(status: GestionStatus, existingPublishedAt: string | null): string | null {
  if (status !== "published") {
    return null;
  }

  return existingPublishedAt ?? new Date().toISOString();
}

export async function createPostAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  let payload: GestionPayload;

  try {
    payload = parsePayload(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la gestion.";
    redirect(withMessage("/admin/gestiones", "error", message));
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...payload,
      published_at: publishedAtFor(payload.status, null),
      created_by: user.id,
      updated_by: user.id
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    const message = parseDbError(error?.message ?? null);
    redirect(withMessage("/admin/gestiones", "error", message));
  }

  revalidatePath("/admin/gestiones");
  revalidatePath("/gestiones");
  redirect(withMessage(`/admin/gestiones/${data.id}`, "ok", "Gestion creada."));
}

export async function updatePostAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const id = asText(formData, "id");

  if (!id) {
    redirect(withMessage("/admin/gestiones", "error", "ID no valido."));
  }

  let payload: GestionPayload;

  try {
    payload = parsePayload(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la gestion.";
    redirect(withMessage(`/admin/gestiones/${id}`, "error", message));
  }

  const { data: currentPost } = await supabase.from("posts").select("published_at").eq("id", id).maybeSingle();

  const { error } = await supabase
    .from("posts")
    .update({
      ...payload,
      published_at: publishedAtFor(payload.status, currentPost?.published_at ?? null),
      updated_by: user.id
    })
    .eq("id", id);

  if (error) {
    const message = parseDbError(error.message);
    redirect(withMessage(`/admin/gestiones/${id}`, "error", message));
  }

  revalidatePath("/admin/gestiones");
  revalidatePath("/gestiones");
  revalidatePath(`/admin/gestiones/${id}`);
  redirect(withMessage(`/admin/gestiones/${id}`, "ok", "Gestion actualizada."));
}

export async function setPostStatusAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const id = asText(formData, "id");
  const targetStatus = toStatus(asText(formData, "target_status"));

  if (!id) {
    redirect(withMessage("/admin/gestiones", "error", "ID no valido."));
  }

  const { data: currentPost, error: findError } = await supabase
    .from("posts")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();

  if (findError || !currentPost) {
    redirect(withMessage("/admin/gestiones", "error", "No se encontro la gestion."));
  }

  const { error } = await supabase
    .from("posts")
    .update({
      status: targetStatus,
      published_at: publishedAtFor(targetStatus, currentPost.published_at),
      updated_by: user.id
    })
    .eq("id", id);

  if (error) {
    redirect(withMessage("/admin/gestiones", "error", parseDbError(error.message)));
  }

  revalidatePath("/admin/gestiones");
  revalidatePath(`/admin/gestiones/${id}`);
  revalidatePath("/gestiones");
  redirect(withMessage("/admin/gestiones", "ok", "Estado actualizado."));
}

export async function deletePostAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = asText(formData, "id");

  if (!id) {
    redirect(withMessage("/admin/gestiones", "error", "ID no valido."));
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    redirect(withMessage("/admin/gestiones", "error", parseDbError(error.message)));
  }

  revalidatePath("/admin/gestiones");
  revalidatePath("/gestiones");
  redirect(withMessage("/admin/gestiones", "ok", "Gestion eliminada."));
}
