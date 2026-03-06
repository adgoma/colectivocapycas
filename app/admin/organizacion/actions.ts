"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageContent } from "@/lib/auth/roles";
import {
  type ContactSettings,
  type HomeSliderSettings,
  type HomeSliderSlideSettings,
  type OrganizationSettings,
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_HOME_SLIDER_SETTINGS,
  DEFAULT_ORGANIZATION_SETTINGS,
  normalizeHomeSliderSettings
} from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

type SliderSlidePayload = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  isPublished: boolean;
  sortOrder: number;
};

type UploadedSliderImageMeta = {
  bucketName: string;
  filePath: string;
  publicUrl: string;
};

const HOME_SLIDER_BUCKET = "home-slider";
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_SLIDES = 8;

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
    tiktok: asText(formData, "tiktok"),
    youtube: asText(formData, "youtube"),
    telegram: asText(formData, "telegram")
  };
}

function asBoolean(formData: FormData, key: string): boolean {
  const value = String(formData.get(key) ?? "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "on";
}

function asInteger(formData: FormData, key: string, fallback = 0): number {
  const raw = String(formData.get(key) ?? "").trim();

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

function isValidHref(value: string): boolean {
  if (!value) {
    return false;
  }

  return value.startsWith("/") || /^https?:\/\//i.test(value);
}

function parseSliderPayload(formData: FormData): SliderSlidePayload {
  const title = asText(formData, "title");
  const primaryLabel = asText(formData, "primary_label");
  const primaryHref = asText(formData, "primary_href");
  const secondaryLabel = asText(formData, "secondary_label");
  const secondaryHref = asText(formData, "secondary_href");

  if (!title) {
    throw new Error("El titulo del slide es obligatorio.");
  }

  if (!primaryLabel || !primaryHref) {
    throw new Error("El boton principal requiere texto y enlace.");
  }

  if (!isValidHref(primaryHref)) {
    throw new Error("El enlace principal debe iniciar con / o http(s)://.");
  }

  if ((secondaryLabel && !secondaryHref) || (!secondaryLabel && secondaryHref)) {
    throw new Error("El boton secundario requiere texto y enlace.");
  }

  if (secondaryHref && !isValidHref(secondaryHref)) {
    throw new Error("El enlace secundario debe iniciar con / o http(s)://.");
  }

  return {
    eyebrow: asText(formData, "eyebrow"),
    title,
    description: asText(formData, "description"),
    primaryLabel,
    primaryHref,
    secondaryLabel,
    secondaryHref,
    isPublished: asBoolean(formData, "is_published"),
    sortOrder: asInteger(formData, "sort_order", 0)
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

function parseSliderImageFile(formData: FormData, required: boolean): File | null {
  const file = formData.get("image_file");

  if (!(file instanceof File) || file.size === 0) {
    if (required) {
      throw new Error("Debes subir una imagen para el slide.");
    }

    return null;
  }

  return file;
}

function makeSliderImagePath(ext: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const unique = crypto.randomUUID().replaceAll("-", "");

  return `slides/${year}/${month}/${unique}.${ext}`;
}

async function uploadSliderImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File
): Promise<UploadedSliderImageMeta> {
  const { ext, mimeType } = validateImageFile(file);
  const filePath = makeSliderImagePath(ext);

  const { error } = await supabase.storage.from(HOME_SLIDER_BUCKET).upload(filePath, file, {
    upsert: false,
    contentType: mimeType
  });

  if (error) {
    throw new Error(`No se pudo subir imagen del slider: ${error.message}`);
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(HOME_SLIDER_BUCKET).getPublicUrl(filePath);

  return {
    bucketName: HOME_SLIDER_BUCKET,
    filePath,
    publicUrl
  };
}

async function removeSliderImageFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucketName: string,
  filePath: string
) {
  if (!bucketName || !filePath) {
    return;
  }

  const { error } = await supabase.storage.from(bucketName).remove([filePath]);

  if (error && !error.message.toLowerCase().includes("not found")) {
    throw new Error(`No se pudo eliminar imagen del slider: ${error.message}`);
  }
}

async function getHomeSliderSettings(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<HomeSliderSettings> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "home_slider")
    .maybeSingle();

  return data ? normalizeHomeSliderSettings(data.value) : DEFAULT_HOME_SLIDER_SETTINGS;
}

function sortSlides(slides: HomeSliderSlideSettings[]): HomeSliderSlideSettings[] {
  return [...slides].sort((a, b) => a.sortOrder - b.sortOrder);
}

async function saveHomeSliderSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  slides: HomeSliderSlideSettings[]
) {
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: "home_slider",
      value: { slides: sortSlides(slides) },
      updated_by: userId
    },
    {
      onConflict: "key"
    }
  );

  if (error) {
    throw new Error(parseDbError(error.message));
  }
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

export async function createHomeSliderSlideAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  let payload: SliderSlidePayload;
  let file: File | null = null;

  try {
    payload = parseSliderPayload(formData);
    file = parseSliderImageFile(formData, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el slide.";
    redirect(withMessage("/admin/organizacion", "error", message));
  }

  if (!file) {
    redirect(withMessage("/admin/organizacion", "error", "Debes subir una imagen para el slide."));
  }

  const current = await getHomeSliderSettings(supabase);

  if (current.slides.length >= MAX_SLIDES) {
    redirect(
      withMessage("/admin/organizacion", "error", `Solo se permiten ${MAX_SLIDES} slides en portada.`)
    );
  }

  let uploadedImage: UploadedSliderImageMeta | null = null;

  try {
    uploadedImage = await uploadSliderImage(supabase, file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir la imagen del slide.";
    redirect(withMessage("/admin/organizacion", "error", message));
  }

  if (!uploadedImage) {
    redirect(withMessage("/admin/organizacion", "error", "No se obtuvo la URL de la imagen del slide."));
  }

  const nextSortOrder = payload.sortOrder > 0 ? payload.sortOrder : current.slides.length + 1;

  const newSlide: HomeSliderSlideSettings = {
    id: crypto.randomUUID(),
    eyebrow: payload.eyebrow,
    title: payload.title,
    description: payload.description,
    imageUrl: uploadedImage.publicUrl,
    imagePath: uploadedImage.filePath,
    imageBucket: uploadedImage.bucketName,
    primaryLabel: payload.primaryLabel,
    primaryHref: payload.primaryHref,
    secondaryLabel: payload.secondaryLabel,
    secondaryHref: payload.secondaryHref,
    isPublished: payload.isPublished,
    sortOrder: nextSortOrder
  };

  try {
    await saveHomeSliderSettings(supabase, user.id, [...current.slides, newSlide]);
  } catch (error) {
    await removeSliderImageFile(supabase, uploadedImage.bucketName, uploadedImage.filePath);
    const message = error instanceof Error ? error.message : "No se pudo guardar el slide.";
    redirect(withMessage("/admin/organizacion", "error", message));
  }

  revalidatePath("/");
  revalidatePath("/admin/organizacion");
  redirect(withMessage("/admin/organizacion", "ok", "Slide agregado."));
}

export async function updateHomeSliderSlideAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const slideId = asText(formData, "slide_id");

  if (!slideId) {
    redirect(withMessage("/admin/organizacion", "error", "Slide no valido."));
  }

  let payload: SliderSlidePayload;
  let file: File | null = null;

  try {
    payload = parseSliderPayload(formData);
    file = parseSliderImageFile(formData, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el slide.";
    redirect(withMessage("/admin/organizacion", "error", message));
  }

  const current = await getHomeSliderSettings(supabase);
  const existing = current.slides.find((slide) => slide.id === slideId);

  if (!existing) {
    redirect(withMessage("/admin/organizacion", "error", "No se encontro el slide seleccionado."));
  }

  let uploadedImage: UploadedSliderImageMeta | null = null;

  if (file) {
    try {
      uploadedImage = await uploadSliderImage(supabase, file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir la nueva imagen.";
      redirect(withMessage("/admin/organizacion", "error", message));
    }
  }

  const updatedSlides = current.slides.map((slide) => {
    if (slide.id !== slideId) {
      return slide;
    }

    return {
      ...slide,
      eyebrow: payload.eyebrow,
      title: payload.title,
      description: payload.description,
      imageUrl: uploadedImage?.publicUrl ?? slide.imageUrl,
      imagePath: uploadedImage?.filePath ?? slide.imagePath,
      imageBucket: uploadedImage?.bucketName ?? slide.imageBucket,
      primaryLabel: payload.primaryLabel,
      primaryHref: payload.primaryHref,
      secondaryLabel: payload.secondaryLabel,
      secondaryHref: payload.secondaryHref,
      isPublished: payload.isPublished,
      sortOrder: payload.sortOrder
    };
  });

  try {
    await saveHomeSliderSettings(supabase, user.id, updatedSlides);
  } catch (error) {
    if (uploadedImage) {
      await removeSliderImageFile(supabase, uploadedImage.bucketName, uploadedImage.filePath);
    }

    const message = error instanceof Error ? error.message : "No se pudo guardar el slide.";
    redirect(withMessage("/admin/organizacion", "error", message));
  }

  if (uploadedImage && existing.imagePath && existing.imageBucket) {
    try {
      await removeSliderImageFile(supabase, existing.imageBucket, existing.imagePath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Slide actualizado con advertencia al eliminar imagen previa.";
      redirect(withMessage("/admin/organizacion", "error", message));
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/organizacion");
  redirect(withMessage("/admin/organizacion", "ok", "Slide actualizado."));
}

export async function deleteHomeSliderSlideAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const slideId = asText(formData, "slide_id");

  if (!slideId) {
    redirect(withMessage("/admin/organizacion", "error", "Slide no valido."));
  }

  const current = await getHomeSliderSettings(supabase);
  const targetSlide = current.slides.find((slide) => slide.id === slideId);

  if (!targetSlide) {
    redirect(withMessage("/admin/organizacion", "error", "No se encontro el slide seleccionado."));
  }

  const nextSlides = current.slides.filter((slide) => slide.id !== slideId);

  try {
    await saveHomeSliderSettings(supabase, user.id, nextSlides);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el slide.";
    redirect(withMessage("/admin/organizacion", "error", message));
  }

  if (targetSlide.imagePath && targetSlide.imageBucket) {
    try {
      await removeSliderImageFile(supabase, targetSlide.imageBucket, targetSlide.imagePath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Slide eliminado con advertencia al borrar imagen.";
      redirect(withMessage("/admin/organizacion", "error", message));
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/organizacion");
  redirect(withMessage("/admin/organizacion", "ok", "Slide eliminado."));
}
