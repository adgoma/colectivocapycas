"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageContent } from "@/lib/auth/roles";
import { slugify } from "@/lib/text/slug";
import { createClient } from "@/lib/supabase/server";

type AlbumPayload = {
  title: string;
  slug: string;
  description: string | null;
  eventDate: string | null;
  isPublic: boolean;
};

type PhotoUploadMeta = {
  filePath: string;
  fileName: string;
  mimeType: string;
};

const GALLERY_BUCKET = "gallery";
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function asText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function asBoolean(value: string): boolean {
  return value === "true" || value === "1" || value === "on";
}

function toInt(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

function withMessage(pathname: string, key: "ok" | "error", message: string): string {
  const params = new URLSearchParams();
  params.set(key, message);
  return `${pathname}?${params.toString()}`;
}

function parseDbError(errorMessage: string | null): string {
  if (!errorMessage) {
    return "Operacion no completada.";
  }

  if (errorMessage.includes("albums_slug_key")) {
    return "El slug del album ya existe. Usa otro.";
  }

  return errorMessage;
}

async function requireAdmin(loginPath = "/admin/galeria") {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(loginPath)}`);
  }

  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row) => row.role);

  if (!canManageContent(roles)) {
    redirect("/acceso-denegado");
  }

  return { supabase, user };
}

function parseAlbumPayload(formData: FormData): AlbumPayload {
  const title = asText(formData, "title");
  const rawSlug = asText(formData, "slug");
  const description = asText(formData, "description");
  const eventDateRaw = asText(formData, "event_date");
  const isPublic = asBoolean(asText(formData, "is_public"));

  if (!title) {
    throw new Error("El titulo del album es obligatorio.");
  }

  const safeSlug = slugify(rawSlug || title);

  if (!safeSlug) {
    throw new Error("No se pudo generar un slug valido para el album.");
  }

  return {
    title,
    slug: safeSlug,
    description: description || null,
    eventDate: eventDateRaw || null,
    isPublic
  };
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
    throw new Error("Formato no permitido. Usa JPG, PNG o WEBP.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`La imagen ${file.name} supera el maximo de 10 MB.`);
  }

  const mimeType = file.type || mimeFromExtension(ext);

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new Error(`Tipo MIME no permitido para ${file.name}.`);
  }

  return { ext, mimeType };
}

function makePhotoPath(albumSlug: string, ext: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const unique = crypto.randomUUID().replaceAll("-", "");
  return `${year}/${month}/${albumSlug}/${unique}.${ext}`;
}

function parsePhotoFiles(formData: FormData): File[] {
  const values = formData.getAll("files");
  const files = values.filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    throw new Error("Debes seleccionar al menos una imagen.");
  }

  return files;
}

async function uploadPhotoFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  albumSlug: string,
  file: File
): Promise<PhotoUploadMeta> {
  const { ext, mimeType } = validateImageFile(file);
  const filePath = makePhotoPath(albumSlug, ext);

  const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(filePath, file, {
    upsert: false,
    contentType: mimeType
  });

  if (error) {
    throw new Error(`No se pudo subir ${file.name}: ${error.message}`);
  }

  return {
    filePath,
    fileName: file.name,
    mimeType
  };
}

export async function createAlbumAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin("/admin/galeria");
  let payload: AlbumPayload;

  try {
    payload = parseAlbumPayload(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el album.";
    redirect(withMessage("/admin/galeria", "error", message));
  }

  const { data, error } = await supabase
    .from("albums")
    .insert({
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      event_date: payload.eventDate,
      is_public: payload.isPublic,
      created_by: user.id,
      updated_by: user.id
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirect(withMessage("/admin/galeria", "error", parseDbError(error?.message ?? null)));
  }

  revalidatePath("/admin/galeria");
  revalidatePath(`/admin/galeria/${data.id}`);
  revalidatePath("/galeria");
  redirect(withMessage(`/admin/galeria/${data.id}`, "ok", "Album creado."));
}

export async function updateAlbumAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin("/admin/galeria");
  const id = asText(formData, "id");

  if (!id) {
    redirect(withMessage("/admin/galeria", "error", "ID de album no valido."));
  }

  let payload: AlbumPayload;

  try {
    payload = parseAlbumPayload(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el album.";
    redirect(withMessage(`/admin/galeria/${id}`, "error", message));
  }

  const { error } = await supabase
    .from("albums")
    .update({
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      event_date: payload.eventDate,
      is_public: payload.isPublic,
      updated_by: user.id
    })
    .eq("id", id);

  if (error) {
    redirect(withMessage(`/admin/galeria/${id}`, "error", parseDbError(error.message)));
  }

  revalidatePath("/admin/galeria");
  revalidatePath(`/admin/galeria/${id}`);
  revalidatePath("/galeria");
  redirect(withMessage(`/admin/galeria/${id}`, "ok", "Album actualizado."));
}

export async function deleteAlbumAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin("/admin/galeria");
  const id = asText(formData, "id");

  if (!id) {
    redirect(withMessage("/admin/galeria", "error", "ID de album no valido."));
  }

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .select("id, cover_path")
    .eq("id", id)
    .maybeSingle();

  if (albumError || !album) {
    redirect(withMessage("/admin/galeria", "error", "No se encontro el album."));
  }

  const { data: photos } = await supabase.from("photos").select("file_path").eq("album_id", album.id);
  const pathsToRemove = (photos ?? []).map((row) => row.file_path);

  if (album.cover_path && !pathsToRemove.includes(album.cover_path)) {
    pathsToRemove.push(album.cover_path);
  }

  if (pathsToRemove.length > 0) {
    const { error: storageError } = await supabase.storage.from(GALLERY_BUCKET).remove(pathsToRemove);

    if (storageError && !storageError.message.toLowerCase().includes("not found")) {
      redirect(withMessage("/admin/galeria", "error", `No se pudo limpiar storage: ${storageError.message}`));
    }
  }

  const { error: deleteError } = await supabase.from("albums").delete().eq("id", id);

  if (deleteError) {
    redirect(withMessage("/admin/galeria", "error", parseDbError(deleteError.message)));
  }

  revalidatePath("/admin/galeria");
  revalidatePath("/galeria");
  redirect(withMessage("/admin/galeria", "ok", "Album eliminado."));
}

export async function setAlbumVisibilityAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin("/admin/galeria");
  const id = asText(formData, "id");
  const targetPublic = asBoolean(asText(formData, "target_public"));

  if (!id) {
    redirect(withMessage("/admin/galeria", "error", "ID de album no valido."));
  }

  const { error } = await supabase
    .from("albums")
    .update({
      is_public: targetPublic,
      updated_by: user.id
    })
    .eq("id", id);

  if (error) {
    redirect(withMessage("/admin/galeria", "error", parseDbError(error.message)));
  }

  revalidatePath("/admin/galeria");
  revalidatePath(`/admin/galeria/${id}`);
  revalidatePath("/galeria");
  redirect(withMessage("/admin/galeria", "ok", "Visibilidad del album actualizada."));
}

export async function uploadPhotosAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin("/admin/galeria");
  const albumId = asText(formData, "album_id");
  const defaultPublic = asBoolean(asText(formData, "default_public"));

  if (!albumId) {
    redirect(withMessage("/admin/galeria", "error", "Album no valido."));
  }

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .select("id, slug, cover_path")
    .eq("id", albumId)
    .maybeSingle();

  if (albumError || !album) {
    redirect(withMessage("/admin/galeria", "error", "No se encontro el album."));
  }

  let files: File[];

  try {
    files = parsePhotoFiles(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron procesar las imagenes.";
    redirect(withMessage(`/admin/galeria/${album.id}`, "error", message));
  }

  const { data: currentLastPhoto } = await supabase
    .from("photos")
    .select("sort_order")
    .eq("album_id", album.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSortOrder = (currentLastPhoto?.sort_order ?? -1) + 1;
  const uploadedPaths: string[] = [];
  const photoRows: Array<{
    album_id: string;
    caption: string | null;
    file_name: string;
    file_path: string;
    bucket_name: string;
    sort_order: number;
    is_public: boolean;
    uploaded_by: string;
    updated_by: string;
  }> = [];

  try {
    for (const file of files) {
      const uploaded = await uploadPhotoFile(supabase, album.slug, file);
      uploadedPaths.push(uploaded.filePath);
      photoRows.push({
        album_id: album.id,
        caption: null,
        file_name: uploaded.fileName,
        file_path: uploaded.filePath,
        bucket_name: GALLERY_BUCKET,
        sort_order: nextSortOrder,
        is_public: defaultPublic,
        uploaded_by: user.id,
        updated_by: user.id
      });
      nextSortOrder += 1;
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(GALLERY_BUCKET).remove(uploadedPaths);
    }

    const message = error instanceof Error ? error.message : "No se pudieron subir las imagenes.";
    redirect(withMessage(`/admin/galeria/${album.id}`, "error", message));
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from("photos")
    .insert(photoRows)
    .select("file_path")
    .order("sort_order", { ascending: true });

  if (insertError) {
    await supabase.storage.from(GALLERY_BUCKET).remove(uploadedPaths);
    redirect(withMessage(`/admin/galeria/${album.id}`, "error", parseDbError(insertError.message)));
  }

  if (!album.cover_path && insertedRows && insertedRows.length > 0) {
    await supabase
      .from("albums")
      .update({
        cover_path: insertedRows[0].file_path,
        updated_by: user.id
      })
      .eq("id", album.id);
  }

  revalidatePath("/admin/galeria");
  revalidatePath(`/admin/galeria/${album.id}`);
  revalidatePath("/galeria");
  redirect(withMessage(`/admin/galeria/${album.id}`, "ok", `${photoRows.length} foto(s) subidas.`));
}

export async function updatePhotoAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin("/admin/galeria");
  const id = asText(formData, "id");
  const albumId = asText(formData, "album_id");
  const caption = asText(formData, "caption");
  const sortOrder = toInt(asText(formData, "sort_order"), 0);
  const isPublic = asBoolean(asText(formData, "is_public"));

  if (!id || !albumId) {
    redirect(withMessage("/admin/galeria", "error", "Foto no valida."));
  }

  const { error } = await supabase
    .from("photos")
    .update({
      caption: caption || null,
      sort_order: sortOrder,
      is_public: isPublic,
      updated_by: user.id
    })
    .eq("id", id)
    .eq("album_id", albumId);

  if (error) {
    redirect(withMessage(`/admin/galeria/${albumId}`, "error", parseDbError(error.message)));
  }

  revalidatePath(`/admin/galeria/${albumId}`);
  revalidatePath("/galeria");
  redirect(withMessage(`/admin/galeria/${albumId}`, "ok", "Foto actualizada."));
}

export async function setPhotoVisibilityAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin("/admin/galeria");
  const id = asText(formData, "id");
  const albumId = asText(formData, "album_id");
  const targetPublic = asBoolean(asText(formData, "target_public"));

  if (!id || !albumId) {
    redirect(withMessage("/admin/galeria", "error", "Foto no valida."));
  }

  const { error } = await supabase
    .from("photos")
    .update({
      is_public: targetPublic,
      updated_by: user.id
    })
    .eq("id", id)
    .eq("album_id", albumId);

  if (error) {
    redirect(withMessage(`/admin/galeria/${albumId}`, "error", parseDbError(error.message)));
  }

  revalidatePath(`/admin/galeria/${albumId}`);
  revalidatePath("/galeria");
  redirect(withMessage(`/admin/galeria/${albumId}`, "ok", "Visibilidad de foto actualizada."));
}

export async function setAlbumCoverAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin("/admin/galeria");
  const photoId = asText(formData, "id");
  const albumId = asText(formData, "album_id");

  if (!photoId || !albumId) {
    redirect(withMessage("/admin/galeria", "error", "Foto no valida."));
  }

  const { data: photo, error: photoError } = await supabase
    .from("photos")
    .select("file_path")
    .eq("id", photoId)
    .eq("album_id", albumId)
    .maybeSingle();

  if (photoError || !photo) {
    redirect(withMessage(`/admin/galeria/${albumId}`, "error", "No se encontro la foto."));
  }

  const { error } = await supabase
    .from("albums")
    .update({
      cover_path: photo.file_path,
      updated_by: user.id
    })
    .eq("id", albumId);

  if (error) {
    redirect(withMessage(`/admin/galeria/${albumId}`, "error", parseDbError(error.message)));
  }

  revalidatePath("/admin/galeria");
  revalidatePath(`/admin/galeria/${albumId}`);
  revalidatePath("/galeria");
  redirect(withMessage(`/admin/galeria/${albumId}`, "ok", "Portada actualizada."));
}

export async function deletePhotoAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin("/admin/galeria");
  const id = asText(formData, "id");
  const albumId = asText(formData, "album_id");

  if (!id || !albumId) {
    redirect(withMessage("/admin/galeria", "error", "Foto no valida."));
  }

  const { data: photo, error: photoError } = await supabase
    .from("photos")
    .select("file_path, bucket_name")
    .eq("id", id)
    .eq("album_id", albumId)
    .maybeSingle();

  if (photoError || !photo) {
    redirect(withMessage(`/admin/galeria/${albumId}`, "error", "No se encontro la foto."));
  }

  const { error: storageError } = await supabase.storage.from(photo.bucket_name).remove([photo.file_path]);

  if (storageError && !storageError.message.toLowerCase().includes("not found")) {
    redirect(withMessage(`/admin/galeria/${albumId}`, "error", `No se pudo eliminar archivo: ${storageError.message}`));
  }

  const { error: deleteError } = await supabase.from("photos").delete().eq("id", id).eq("album_id", albumId);

  if (deleteError) {
    redirect(withMessage(`/admin/galeria/${albumId}`, "error", parseDbError(deleteError.message)));
  }

  const { data: album } = await supabase.from("albums").select("cover_path").eq("id", albumId).maybeSingle();

  if (album?.cover_path === photo.file_path) {
    const { data: fallbackPhoto } = await supabase
      .from("photos")
      .select("file_path")
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    await supabase
      .from("albums")
      .update({
        cover_path: fallbackPhoto?.file_path ?? null,
        updated_by: user.id
      })
      .eq("id", albumId);
  }

  revalidatePath("/admin/galeria");
  revalidatePath(`/admin/galeria/${albumId}`);
  revalidatePath("/galeria");
  redirect(withMessage(`/admin/galeria/${albumId}`, "ok", "Foto eliminada."));
}

