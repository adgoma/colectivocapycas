"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageContent } from "@/lib/auth/roles";
import { slugify } from "@/lib/text/slug";
import { createClient } from "@/lib/supabase/server";

type DocumentStatus = "draft" | "published";

type DocumentPayload = {
  title: string;
  slug: string;
  description: string | null;
  category: string;
  status: DocumentStatus;
};

type UploadedFileMeta = {
  bucketName: string;
  filePath: string;
  fileName: string;
  mimeType: string;
};

const DOCUMENTS_BUCKET = "documents";
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"] as const;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function asText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toStatus(value: string): DocumentStatus {
  return value === "published" ? "published" : "draft";
}

function normalizeCategory(value: string): string {
  const category = value.trim().toLowerCase();

  if (!category) {
    return "general";
  }

  return category.slice(0, 60);
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
    redirect("/login?next=/admin/documentos");
  }

  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row) => row.role);

  if (!canManageContent(roles)) {
    redirect("/acceso-denegado");
  }

  return { supabase, user };
}

function parsePayload(formData: FormData): DocumentPayload {
  const title = asText(formData, "title");
  const rawSlug = asText(formData, "slug");
  const description = asText(formData, "description");
  const category = normalizeCategory(asText(formData, "category"));
  const status = toStatus(asText(formData, "status"));

  if (!title) {
    throw new Error("El titulo es obligatorio.");
  }

  const safeSlug = slugify(rawSlug || title);

  if (!safeSlug) {
    throw new Error("No se pudo generar un slug valido.");
  }

  return {
    title,
    slug: safeSlug,
    description: description || null,
    category,
    status
  };
}

function parseDbError(errorMessage: string | null): string {
  if (!errorMessage) {
    return "Operacion no completada.";
  }

  if (errorMessage.includes("documents_slug_key")) {
    return "El slug ya existe. Usa otro slug.";
  }

  return errorMessage;
}

function extensionFromFileName(fileName: string): string | null {
  const pieces = fileName.split(".");

  if (pieces.length < 2) {
    return null;
  }

  return pieces[pieces.length - 1]?.toLowerCase() ?? null;
}

function mimeFromExtension(ext: string): string {
  if (ext === "pdf") {
    return "application/pdf";
  }

  if (ext === "doc") {
    return "application/msword";
  }

  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function getFileFromFormData(formData: FormData, required: boolean): File | null {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    if (required) {
      throw new Error("Debes adjuntar un archivo.");
    }

    return null;
  }

  return file;
}

function validateDocumentFile(file: File): { ext: string; mimeType: string } {
  const ext = extensionFromFileName(file.name);

  if (!ext || !ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new Error("Formato no permitido. Usa PDF, DOC o DOCX.");
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Archivo demasiado grande. Maximo 50 MB.");
  }

  const mimeType = file.type || mimeFromExtension(ext);

  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new Error("Tipo MIME no permitido para este archivo.");
  }

  return { ext, mimeType };
}

function makeFilePath(slug: string, ext: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const random = crypto.randomUUID().replaceAll("-", "");

  return `${year}/${month}/${slug}-${random}.${ext}`;
}

function publishedAtFor(status: DocumentStatus, existingPublishedAt: string | null): string | null {
  if (status !== "published") {
    return null;
  }

  return existingPublishedAt ?? new Date().toISOString();
}

async function uploadDocumentFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  slug: string
): Promise<UploadedFileMeta> {
  const { ext, mimeType } = validateDocumentFile(file);
  const filePath = makeFilePath(slug, ext);

  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, file, {
    upsert: false,
    contentType: mimeType
  });

  if (error) {
    throw new Error(`No se pudo subir el archivo: ${error.message}`);
  }

  return {
    bucketName: DOCUMENTS_BUCKET,
    filePath,
    fileName: file.name,
    mimeType
  };
}

export async function createDocumentAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  let payload: DocumentPayload;
  let file: File | null = null;

  try {
    payload = parsePayload(formData);
    file = getFileFromFormData(formData, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el documento.";
    redirect(withMessage("/admin/documentos", "error", message));
  }

  if (!file) {
    redirect(withMessage("/admin/documentos", "error", "Debes adjuntar un archivo."));
  }

  const uploadedFile = await uploadDocumentFile(supabase, file, payload.slug);

  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      category: payload.category,
      status: payload.status,
      published_at: publishedAtFor(payload.status, null),
      bucket_name: uploadedFile.bucketName,
      file_name: uploadedFile.fileName,
      file_path: uploadedFile.filePath,
      mime_type: uploadedFile.mimeType,
      uploaded_by: user.id,
      updated_by: user.id
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([uploadedFile.filePath]);
    redirect(withMessage("/admin/documentos", "error", parseDbError(error?.message ?? null)));
  }

  revalidatePath("/admin/documentos");
  revalidatePath(`/admin/documentos/${data.id}`);
  revalidatePath("/documentos");
  redirect(withMessage(`/admin/documentos/${data.id}`, "ok", "Documento creado."));
}

export async function updateDocumentAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const id = asText(formData, "id");

  if (!id) {
    redirect(withMessage("/admin/documentos", "error", "ID no valido."));
  }

  let payload: DocumentPayload;
  let replacementFile: File | null = null;

  try {
    payload = parsePayload(formData);
    replacementFile = getFileFromFormData(formData, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el documento.";
    redirect(withMessage(`/admin/documentos/${id}`, "error", message));
  }

  const { data: currentDoc, error: currentDocError } = await supabase
    .from("documents")
    .select("file_path, file_name, mime_type, bucket_name, published_at")
    .eq("id", id)
    .maybeSingle();

  if (currentDocError || !currentDoc) {
    redirect(withMessage("/admin/documentos", "error", "No se encontro el documento."));
  }

  let fileMeta: UploadedFileMeta = {
    bucketName: currentDoc.bucket_name,
    filePath: currentDoc.file_path,
    fileName: currentDoc.file_name,
    mimeType: currentDoc.mime_type ?? "application/pdf"
  };
  let newUploadedPath: string | null = null;

  if (replacementFile) {
    const uploaded = await uploadDocumentFile(supabase, replacementFile, payload.slug);
    fileMeta = uploaded;
    newUploadedPath = uploaded.filePath;
  }

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      category: payload.category,
      status: payload.status,
      published_at: publishedAtFor(payload.status, currentDoc.published_at),
      bucket_name: fileMeta.bucketName,
      file_name: fileMeta.fileName,
      file_path: fileMeta.filePath,
      mime_type: fileMeta.mimeType,
      updated_by: user.id
    })
    .eq("id", id);

  if (updateError) {
    if (newUploadedPath) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([newUploadedPath]);
    }

    redirect(withMessage(`/admin/documentos/${id}`, "error", parseDbError(updateError.message)));
  }

  if (newUploadedPath && currentDoc.file_path !== newUploadedPath) {
    await supabase.storage.from(currentDoc.bucket_name).remove([currentDoc.file_path]);
  }

  revalidatePath("/admin/documentos");
  revalidatePath(`/admin/documentos/${id}`);
  revalidatePath("/documentos");
  redirect(withMessage(`/admin/documentos/${id}`, "ok", "Documento actualizado."));
}

export async function setDocumentStatusAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const id = asText(formData, "id");
  const targetStatus = toStatus(asText(formData, "target_status"));

  if (!id) {
    redirect(withMessage("/admin/documentos", "error", "ID no valido."));
  }

  const { data: currentDoc, error: findError } = await supabase
    .from("documents")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();

  if (findError || !currentDoc) {
    redirect(withMessage("/admin/documentos", "error", "No se encontro el documento."));
  }

  const { error } = await supabase
    .from("documents")
    .update({
      status: targetStatus,
      published_at: publishedAtFor(targetStatus, currentDoc.published_at),
      updated_by: user.id
    })
    .eq("id", id);

  if (error) {
    redirect(withMessage("/admin/documentos", "error", parseDbError(error.message)));
  }

  revalidatePath("/admin/documentos");
  revalidatePath(`/admin/documentos/${id}`);
  revalidatePath("/documentos");
  redirect(withMessage("/admin/documentos", "ok", "Estado actualizado."));
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = asText(formData, "id");

  if (!id) {
    redirect(withMessage("/admin/documentos", "error", "ID no valido."));
  }

  const { data: currentDoc, error: findError } = await supabase
    .from("documents")
    .select("bucket_name, file_path")
    .eq("id", id)
    .maybeSingle();

  if (findError || !currentDoc) {
    redirect(withMessage("/admin/documentos", "error", "No se encontro el documento."));
  }

  const { error: removeFileError } = await supabase.storage.from(currentDoc.bucket_name).remove([currentDoc.file_path]);

  if (removeFileError && !removeFileError.message.toLowerCase().includes("not found")) {
    redirect(withMessage("/admin/documentos", "error", `No se pudo eliminar archivo: ${removeFileError.message}`));
  }

  const { error: deleteRowError } = await supabase.from("documents").delete().eq("id", id);

  if (deleteRowError) {
    redirect(withMessage("/admin/documentos", "error", parseDbError(deleteRowError.message)));
  }

  revalidatePath("/admin/documentos");
  revalidatePath("/documentos");
  redirect(withMessage("/admin/documentos", "ok", "Documento eliminado."));
}
