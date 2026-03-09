"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageContent } from "@/lib/auth/roles";
import { slugify } from "@/lib/text/slug";
import { createClient } from "@/lib/supabase/server";

type PostStatus = "draft" | "published";

type PostPayload = {
  title: string;
  slug: string;
  summary: string | null;
  content_md: string;
  status: PostStatus;
};

type UploadedCoverMeta = {
  bucketName: string;
  filePath: string;
  publicUrl: string;
};

const POST_IMAGES_BUCKET = "post-images";
const POST_TYPE = "comunicado";
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function asText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toStatus(value: string): PostStatus {
  return value === "published" ? "published" : "draft";
}

function asBoolean(value: string): boolean {
  return value === "true" || value === "1" || value === "on";
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
    redirect("/login?next=/admin/comunicados");
  }

  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row) => row.role);

  if (!canManageContent(roles)) {
    redirect("/acceso-denegado");
  }

  return { supabase, user };
}

function parsePayload(formData: FormData): PostPayload {
  const title = asText(formData, "title");
  const rawSlug = asText(formData, "slug");
  const content = asText(formData, "content_md");
  const summary = asText(formData, "summary");
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

function publishedAtFor(status: PostStatus, existingPublishedAt: string | null): string | null {
  if (status !== "published") {
    return null;
  }

  return existingPublishedAt ?? new Date().toISOString();
}

function extensionFromFileName(fileName: string): string | null {
  const parts = fileName.split(".");

  if (parts.length < 2) {
    return null;
  }

  return parts[parts.length - 1]?.toLowerCase() ?? null;
}

function mimeFromExtension(ext: string): string {
  if (ext === "png") {
    return "image/png";
  }

  if (ext === "webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

function validateImageFile(file: File): { ext: string; mimeType: string } {
  const ext = extensionFromFileName(file.name);

  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])) {
    throw new Error("Formato de imagen no permitido. Usa JPG, PNG o WEBP.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera 10 MB.");
  }

  const mimeType = file.type || mimeFromExtension(ext);

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new Error("Tipo MIME de imagen no permitido.");
  }

  return { ext, mimeType };
}

function parseCoverFile(formData: FormData): File | null {
  const file = formData.get("cover_image");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return file;
}

function makeCoverPath(slug: string, ext: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const unique = crypto.randomUUID().replaceAll("-", "");

  return `${year}/${month}/${slug}-${unique}.${ext}`;
}

async function uploadCoverImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  slug: string
): Promise<UploadedCoverMeta> {
  const { ext, mimeType } = validateImageFile(file);
  const filePath = makeCoverPath(slug, ext);

  const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(filePath, file, {
    upsert: false,
    contentType: mimeType
  });

  if (error) {
    throw new Error(`No se pudo subir imagen: ${error.message}`);
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(filePath);

  return {
    bucketName: POST_IMAGES_BUCKET,
    filePath,
    publicUrl
  };
}

async function removeCoverFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucketName: string | null,
  filePath: string | null
) {
  if (!bucketName || !filePath) {
    return;
  }

  const { error } = await supabase.storage.from(bucketName).remove([filePath]);

  if (error && !error.message.toLowerCase().includes("not found")) {
    throw new Error(`No se pudo eliminar imagen anterior: ${error.message}`);
  }
}

export async function createComunicadoAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  let payload: PostPayload;
  let coverFile: File | null = null;

  try {
    payload = parsePayload(formData);
    coverFile = parseCoverFile(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el comunicado.";
    redirect(withMessage("/admin/comunicados", "error", message));
  }

  let uploadedCover: UploadedCoverMeta | null = null;

  if (coverFile) {
    try {
      uploadedCover = await uploadCoverImage(supabase, coverFile, payload.slug);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir la portada.";
      redirect(withMessage("/admin/comunicados", "error", message));
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...payload,
      post_type: POST_TYPE,
      cover_image_url: uploadedCover?.publicUrl ?? null,
      cover_image_path: uploadedCover?.filePath ?? null,
      cover_image_bucket: uploadedCover?.bucketName ?? null,
      published_at: publishedAtFor(payload.status, null),
      created_by: user.id,
      updated_by: user.id
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    if (uploadedCover) {
      await supabase.storage.from(uploadedCover.bucketName).remove([uploadedCover.filePath]);
    }

    const message = parseDbError(error?.message ?? null);
    redirect(withMessage("/admin/comunicados", "error", message));
  }

  revalidatePath("/admin/comunicados");
  revalidatePath("/comunicados");
  revalidatePath("/");
  redirect(withMessage(`/admin/comunicados/${data.id}`, "ok", "Comunicado creado."));
}

export async function updateComunicadoAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const id = asText(formData, "id");

  if (!id) {
    redirect(withMessage("/admin/comunicados", "error", "ID no valido."));
  }

  let payload: PostPayload;
  let coverFile: File | null = null;

  try {
    payload = parsePayload(formData);
    coverFile = parseCoverFile(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el comunicado.";
    redirect(withMessage(`/admin/comunicados/${id}`, "error", message));
  }

  const removeCoverImage = asBoolean(asText(formData, "remove_cover_image"));

  const { data: currentPost } = await supabase
    .from("posts")
    .select("published_at, cover_image_path, cover_image_bucket")
    .eq("id", id)
    .eq("post_type", POST_TYPE)
    .maybeSingle();

  if (!currentPost) {
    redirect(withMessage("/admin/comunicados", "error", "No se encontro el comunicado."));
  }

  let uploadedCover: UploadedCoverMeta | null = null;

  if (coverFile) {
    try {
      uploadedCover = await uploadCoverImage(supabase, coverFile, payload.slug);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir la portada.";
      redirect(withMessage(`/admin/comunicados/${id}`, "error", message));
    }
  }

  const updateData: Record<string, unknown> = {
    ...payload,
    published_at: publishedAtFor(payload.status, currentPost?.published_at ?? null),
    updated_by: user.id
  };

  if (uploadedCover) {
    updateData.cover_image_url = uploadedCover.publicUrl;
    updateData.cover_image_path = uploadedCover.filePath;
    updateData.cover_image_bucket = uploadedCover.bucketName;
  } else if (removeCoverImage) {
    updateData.cover_image_url = null;
    updateData.cover_image_path = null;
    updateData.cover_image_bucket = null;
  }

  const { error } = await supabase
    .from("posts")
    .update(updateData)
    .eq("id", id)
    .eq("post_type", POST_TYPE);

  if (error) {
    if (uploadedCover) {
      await supabase.storage.from(uploadedCover.bucketName).remove([uploadedCover.filePath]);
    }

    const message = parseDbError(error.message);
    redirect(withMessage(`/admin/comunicados/${id}`, "error", message));
  }

  try {
    if (uploadedCover) {
      await removeCoverFile(supabase, currentPost?.cover_image_bucket ?? null, currentPost?.cover_image_path ?? null);
    } else if (removeCoverImage) {
      await removeCoverFile(supabase, currentPost?.cover_image_bucket ?? null, currentPost?.cover_image_path ?? null);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Comunicado actualizado con advertencia en portada.";
    redirect(withMessage(`/admin/comunicados/${id}`, "error", message));
  }

  revalidatePath("/admin/comunicados");
  revalidatePath("/comunicados");
  revalidatePath("/");
  revalidatePath(`/admin/comunicados/${id}`);
  redirect(withMessage(`/admin/comunicados/${id}`, "ok", "Comunicado actualizado."));
}

export async function setComunicadoStatusAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const id = asText(formData, "id");
  const targetStatus = toStatus(asText(formData, "target_status"));

  if (!id) {
    redirect(withMessage("/admin/comunicados", "error", "ID no valido."));
  }

  const { data: currentPost, error: findError } = await supabase
    .from("posts")
    .select("published_at")
    .eq("id", id)
    .eq("post_type", POST_TYPE)
    .maybeSingle();

  if (findError || !currentPost) {
    redirect(withMessage("/admin/comunicados", "error", "No se encontro el comunicado."));
  }

  const { error } = await supabase
    .from("posts")
    .update({
      status: targetStatus,
      published_at: publishedAtFor(targetStatus, currentPost.published_at),
      updated_by: user.id
    })
    .eq("id", id)
    .eq("post_type", POST_TYPE);

  if (error) {
    redirect(withMessage("/admin/comunicados", "error", parseDbError(error.message)));
  }

  revalidatePath("/admin/comunicados");
  revalidatePath(`/admin/comunicados/${id}`);
  revalidatePath("/comunicados");
  revalidatePath("/");
  redirect(withMessage("/admin/comunicados", "ok", "Estado actualizado."));
}

export async function deleteComunicadoAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = asText(formData, "id");

  if (!id) {
    redirect(withMessage("/admin/comunicados", "error", "ID no valido."));
  }

  const { data: postRow } = await supabase
    .from("posts")
    .select("cover_image_path, cover_image_bucket")
    .eq("id", id)
    .eq("post_type", POST_TYPE)
    .maybeSingle();

  if (!postRow) {
    redirect(withMessage("/admin/comunicados", "error", "No se encontro el comunicado."));
  }

  const { error } = await supabase.from("posts").delete().eq("id", id).eq("post_type", POST_TYPE);

  if (error) {
    redirect(withMessage("/admin/comunicados", "error", parseDbError(error.message)));
  }

  try {
    await removeCoverFile(supabase, postRow?.cover_image_bucket ?? null, postRow?.cover_image_path ?? null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Comunicado eliminado con advertencia en portada.";
    redirect(withMessage("/admin/comunicados", "error", message));
  }

  revalidatePath("/admin/comunicados");
  revalidatePath("/comunicados");
  revalidatePath("/");
  redirect(withMessage("/admin/comunicados", "ok", "Comunicado eliminado."));
}

