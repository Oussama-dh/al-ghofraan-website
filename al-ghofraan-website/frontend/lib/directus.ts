// lib/directus.ts
// Centrale Directus SDK client

import {
  createDirectus,
  rest,
  readItems,
  readItem,
  readSingleton,
  staticToken,
  withToken,
  readFiles,
} from "@directus/sdk";
import type { DirectusSchema } from "@/types/directus";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || "";

// Public client — voor publieke data zonder auth
export const directus = createDirectus<DirectusSchema>(DIRECTUS_URL).with(
  rest()
);

// Server-side client met static token — voor SSR data fetching
export const directusServer = createDirectus<DirectusSchema>(
  DIRECTUS_URL
).with(staticToken(DIRECTUS_TOKEN)).with(rest());

// Helper: geef de volledige URL van een Directus asset terug
export function getAssetUrl(fileId: string): string {
  return `${DIRECTUS_URL}/assets/${fileId}`;
}

// Helper: haal gepubliceerde activiteiten op
export async function getActivities(options?: {
  featured?: boolean;
  limit?: number;
}) {
  const filter: Record<string, unknown> = { status: { _eq: "published" } };
  if (options?.featured) {
    filter.featured = { _eq: true };
  }

  return directusServer.request(
    readItems("activities", {
      filter,
      sort: ["start_date"],
      limit: options?.limit || -1,
      fields: [
        "id",
        "title",
        "slug",
        "description",
        "start_date",
        "end_date",
        "location",
        "image",
        "featured",
        "registration_enabled",
      ],
    })
  );
}

// Helper: haal toekomstige activiteiten op
export async function getUpcomingActivities(limit = 6) {
  const today = new Date().toISOString().split("T")[0];

  return directusServer.request(
    readItems("activities", {
     filter: {
  status: { _eq: "published" },
  start_date: { _gte: today },
} as any,
      sort:   ["start_date"],
      limit,
      fields: [
        "id",
        "title",
        "slug",
        "description",
        "start_date",
        "end_date",
        "location",
        "image",
        "featured",
      ],
    })
  );
}

// Helper: haal één activiteit op via slug
export async function getActivityBySlug(slug: string) {
  const items = await directusServer.request(
    readItems("activities", {
      filter: {
        slug:   { _eq: slug },
        status: { _eq: "published" },
      },
      limit: 1,
    })
  );
  return items[0] || null;
}

// Helper: haal pagina-content op via slug
export async function getPageBySlug(slug: string) {
  const items = await directusServer.request(
    readItems("pages", {
      filter: {
        slug:   { _eq: slug },
        status: { _eq: "published" },
      },
      limit: 1,
    })
  );
  return items[0] || null;
}

// Helper: haal het actieve gebedstijden-bestand op
export async function getActivePrayerTimeFile() {
  const items = await directusServer.request(
    readItems("prayer_time_files", {
      filter: { active: { _eq: true } },
      sort:   ["-uploaded_at"],
      limit:  1,
      fields: ["id", "title", "file", "year", "active", "uploaded_at"],
    })
  );
  return items[0] || null;
}

// Helper: haal site-instellingen op
export async function getSiteSettings() {
  try {
    const items = await directusServer.request(
      readItems("site_settings", { limit: 1 })
    );
    return items[0] || null;
  } catch {
    return null;
  }
}

export { readItems, readItem };
