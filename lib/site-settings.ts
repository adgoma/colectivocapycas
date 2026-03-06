type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value.trim();
  }

  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    return lower === "true" || lower === "1" || lower === "on";
  }

  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export type OrganizationSettings = {
  name: string;
  institution: string;
  country: string;
  tagline: string;
  description: string;
  history: string;
  mission: string;
  vision: string;
  objectives: string[];
  representatives: string;
};

export type ContactSettings = {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  schedule: string;
  website: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  telegram: string;
};

export type HomeSliderSlideSettings = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePath: string;
  imageBucket: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  isPublished: boolean;
  sortOrder: number;
};

export type HomeSliderSettings = {
  slides: HomeSliderSlideSettings[];
};

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  name: "Colectivo de ex indeterminados CAS y CAP",
  institution: "Contraloria General de la Republica",
  country: "Peru",
  tagline: "Informacion oficial de gestiones y reincorporacion",
  description:
    "Organizacion de ex trabajadores de la Contraloria General de la Republica que impulsa acciones para la reincorporacion.",
  history: "",
  mission: "",
  vision: "",
  objectives: [],
  representatives: ""
};

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  schedule: "",
  website: "",
  facebook: "",
  tiktok: "",
  youtube: "",
  telegram: ""
};

export const DEFAULT_HOME_SLIDER_SETTINGS: HomeSliderSettings = {
  slides: []
};

export function normalizeOrganizationSettings(value: unknown): OrganizationSettings {
  if (!isRecord(value)) {
    return DEFAULT_ORGANIZATION_SETTINGS;
  }

  return {
    name: asString(value.name, DEFAULT_ORGANIZATION_SETTINGS.name),
    institution: asString(value.institution, DEFAULT_ORGANIZATION_SETTINGS.institution),
    country: asString(value.country, DEFAULT_ORGANIZATION_SETTINGS.country),
    tagline: asString(value.tagline, DEFAULT_ORGANIZATION_SETTINGS.tagline),
    description: asString(value.description, DEFAULT_ORGANIZATION_SETTINGS.description),
    history: asString(value.history),
    mission: asString(value.mission),
    vision: asString(value.vision),
    objectives: asStringArray(value.objectives),
    representatives: asString(value.representatives)
  };
}

export function normalizeContactSettings(value: unknown): ContactSettings {
  if (!isRecord(value)) {
    return DEFAULT_CONTACT_SETTINGS;
  }

  return {
    email: asString(value.email),
    phone: asString(value.phone),
    whatsapp: asString(value.whatsapp),
    address: asString(value.address),
    schedule: asString(value.schedule),
    website: asString(value.website),
    facebook: asString(value.facebook),
    // Backward compatible with old key "instagram".
    tiktok: asString(value.tiktok, asString(value.instagram)),
    youtube: asString(value.youtube),
    telegram: asString(value.telegram)
  };
}

export function normalizeHomeSliderSettings(value: unknown): HomeSliderSettings {
  if (!isRecord(value)) {
    return DEFAULT_HOME_SLIDER_SETTINGS;
  }

  const rawSlides = Array.isArray(value.slides) ? value.slides : [];
  const slides: HomeSliderSlideSettings[] = rawSlides
    .map((entry, index) => {
      if (!isRecord(entry)) {
        return null;
      }

      const id = asString(entry.id, `slide-${index + 1}`);
      const title = asString(entry.title);

      if (!title) {
        return null;
      }

      return {
        id,
        eyebrow: asString(entry.eyebrow),
        title,
        description: asString(entry.description),
        imageUrl: asString(entry.imageUrl),
        imagePath: asString(entry.imagePath),
        imageBucket: asString(entry.imageBucket),
        primaryLabel: asString(entry.primaryLabel, "Ver mas"),
        primaryHref: asString(entry.primaryHref, "/"),
        secondaryLabel: asString(entry.secondaryLabel),
        secondaryHref: asString(entry.secondaryHref),
        isPublished: asBoolean(entry.isPublished, true),
        sortOrder: asNumber(entry.sortOrder, index + 1)
      };
    })
    .filter((slide): slide is HomeSliderSlideSettings => Boolean(slide))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { slides };
}
