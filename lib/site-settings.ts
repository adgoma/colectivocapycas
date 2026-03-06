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
  instagram: string;
  youtube: string;
  telegram: string;
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
  instagram: "",
  youtube: "",
  telegram: ""
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
    instagram: asString(value.instagram),
    youtube: asString(value.youtube),
    telegram: asString(value.telegram)
  };
}

