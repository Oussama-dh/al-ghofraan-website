// lib/directus.ts
// Centrale Directus SDK client + getypeerde data-helpers.

import {
  createDirectus,
  rest,
  readItems,
  readSingleton,
  staticToken,
} from "@directus/sdk";
import type {
  DirectusSchema,
  Activity,
  PageContent,
  NavigationItem,
  FaqItem,
  SiteSettings,
  PrayerTimeFile,
  IconSetting,
  PageSection,
  PageSectionItem,
  EducationProgram,
  DonationCampaign,
  Article,
  Video,
  TvAnnouncement,
} from "@/types/directus";

const DIRECTUS_INTERNAL_URL =
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "http://localhost:8055";

const DIRECTUS_PUBLIC_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "http://localhost:8055";

const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || "";
const IS_DEV = process.env.NODE_ENV !== "production";

const restOptions = IS_DEV ? { credentials: "same-origin" as const } : {};

export const directus = createDirectus<DirectusSchema>(DIRECTUS_INTERNAL_URL).with(
  rest(restOptions)
);

export const directusServer = DIRECTUS_TOKEN
  ? createDirectus<DirectusSchema>(DIRECTUS_INTERNAL_URL)
      .with(staticToken(DIRECTUS_TOKEN))
      .with(rest(restOptions))
  : createDirectus<DirectusSchema>(DIRECTUS_INTERNAL_URL).with(rest(restOptions));

function getFileId(file?: string | { id?: string } | null): string {
  if (!file) return "";

  if (typeof file === "string") {
    return file;
  }

  return file.id || "";
}

export function getAssetUrl(file?: string | { id?: string } | null): string {
  const fileId = getFileId(file);
  if (!fileId) return "";

  return `${DIRECTUS_PUBLIC_URL}/assets/${fileId}`;
}

export function getInternalAssetUrl(file?: string | { id?: string } | null): string {
  const fileId = getFileId(file);
  if (!fileId) return "";

  return `${DIRECTUS_INTERNAL_URL}/assets/${fileId}`;
}

async function safe<T>(fn: () => Promise<T>, label: string, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (IS_DEV) {
      console.warn(`[directus] ${label} mislukt:`, (err as Error)?.message || err);
    }
    return fallback;
  }
}

// ─── Activities ──────────────────────────────────────────────
export async function getActivities(options?: {
  featured?: boolean;
  limit?: number;
}): Promise<Activity[]> {
  return safe(
    async () => {
      const filter: Record<string, unknown> = { status: { _eq: "published" } };
      if (options?.featured) filter.featured = { _eq: true };

      const result = await directusServer.request(
        readItems("activities", {
          filter:  filter as never,
          sort:    ["start_date"],
          limit:   options?.limit ?? -1,
          fields:  [
            "id", "status", "title", "slug", "description",
            "start_date", "end_date", "location", "image",
            "featured", "registration_enabled", "target_gender",
          ],
        })
      );
      return result as Activity[];
    },
    "getActivities",
    []
  );
}

export async function getUpcomingActivities(limit = 6): Promise<Activity[]> {
  return safe(
    async () => {
      const today = new Date().toISOString().split("T")[0];
      const result = await directusServer.request(
        readItems("activities", {
          filter: {
            status:     { _eq: "published" },
            start_date: { _gte: today },
          } as never,
          sort:   ["start_date"],
          limit,
          fields: [
            "id", "status", "title", "slug", "description",
            "start_date", "end_date", "location", "image",
            "featured", "registration_enabled", "target_gender",
          ],
        })
      );
      return result as Activity[];
    },
    "getUpcomingActivities",
    []
  );
}

export async function getActivityBySlug(slug: string): Promise<Activity | null> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("activities", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          limit: 1,
        })
      );
      return ((result as Activity[])[0]) ?? null;
    },
    `getActivityBySlug(${slug})`,
    null
  );
}

// ─── Education programs ──────────────────────────────────────
const EDUCATION_FIELDS = [
  "id", "status", "title", "slug", "description",
  "teacher", "target_group", "schedule", "location",
  "start_date", "end_date", "image",
  "registration_enabled", "max_participants", "sort", "target_gender",
];

export async function getEducationPrograms(): Promise<EducationProgram[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("education_programs", {
          filter: { status: { _eq: "published" } } as never,
          sort:   ["sort", "title"],
          limit:  -1,
          fields: EDUCATION_FIELDS,
        })
      );
      return result as unknown as EducationProgram[];
    },
    "getEducationPrograms",
    []
  );
}

export async function getEducationProgramBySlug(
  slug: string
): Promise<EducationProgram | null> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("education_programs", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          limit:  1,
          fields: EDUCATION_FIELDS,
        })
      );
      return ((result as unknown as EducationProgram[])[0]) ?? null;
    },
    `getEducationProgramBySlug(${slug})`,
    null
  );
}

export async function getAllEducationProgramSlugs(): Promise<string[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("education_programs", {
          filter: { status: { _eq: "published" } } as never,
          limit:  -1,
          fields: ["slug"],
        })
      );
      return (result as Array<{ slug: string }>).map((r) => r.slug).filter(Boolean);
    },
    "getAllEducationProgramSlugs",
    []
  );
}

// ─── Donation campaigns ──────────────────────────────────────
const CAMPAIGN_FIELDS = [
  "id", "status", "title", "slug", "description", "image",
  "goal_amount", "goal_amount_display",
  "allow_one_time", "allow_monthly",
  "suggested_amounts", "default_amount",
  "featured", "sort",
];

export async function getDonationCampaigns(): Promise<DonationCampaign[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("donation_campaigns", {
          filter: {
            status:         { _eq: "published" },
            // Tenminste één donatie-type moet toegestaan zijn — anders nutteloos
            _or: [
              { allow_one_time: { _eq: true } },
              { allow_monthly:  { _eq: true } },
            ],
          } as never,
          sort:   ["-featured", "sort", "title"],
          limit:  -1,
          fields: CAMPAIGN_FIELDS,
        })
      );
      return result as unknown as DonationCampaign[];
    },
    "getDonationCampaigns",
    []
  );
}

export async function getDonationCampaignBySlug(slug: string): Promise<DonationCampaign | null> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("donation_campaigns", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          limit:  1,
          fields: CAMPAIGN_FIELDS,
        })
      );
      return ((result as unknown as DonationCampaign[])[0]) ?? null;
    },
    `getDonationCampaignBySlug(${slug})`,
    null
  );
}

// ─── Articles ────────────────────────────────────────────────
const ARTICLE_LIST_FIELDS = [
  "id", "status", "title", "slug", "excerpt", "image",
  "author_name", "category", "tags", "published_at",
  "featured", "sort",
];
const ARTICLE_FULL_FIELDS = [
  ...ARTICLE_LIST_FIELDS,
  "body", "seo_title", "seo_description", "created_at", "updated_at",
];

export async function getArticles(): Promise<Article[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("articles", {
          filter: { status: { _eq: "published" } } as never,
          sort:   ["-featured", "-published_at"],
          limit:  -1,
          fields: ARTICLE_LIST_FIELDS,
        })
      );
      return result as unknown as Article[];
    },
    "getArticles",
    []
  );
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("articles", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          limit:  1,
          fields: ARTICLE_FULL_FIELDS,
        })
      );
      return ((result as unknown as Article[])[0]) ?? null;
    },
    `getArticleBySlug(${slug})`,
    null
  );
}

export async function getAllArticleSlugs(): Promise<string[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("articles", {
          filter: { status: { _eq: "published" } } as never,
          limit:  -1,
          fields: ["slug"],
        })
      );
      return (result as Array<{ slug: string }>).map((r) => r.slug).filter(Boolean);
    },
    "getAllArticleSlugs",
    []
  );
}

// ─── Videos ──────────────────────────────────────────────────
const VIDEO_FIELDS = [
  "id", "status", "title", "description", "youtube_url",
  "sort", "featured", "published_at", "created_at",
];

export async function getVideos(): Promise<Video[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("videos", {
          filter: { status: { _eq: "published" } } as never,
          // Featured eerst, dan handmatige sort oplopend, dan recent gepubliceerd eerst.
          // Directus negeert null-values bij sort op deze manier voorspelbaar.
          sort:   ["-featured", "sort", "-published_at"],
          limit:  -1,
          fields: VIDEO_FIELDS,
        })
      );
      return result as unknown as Video[];
    },
    "getVideos",
    []
  );
}

// ─── TV announcements ────────────────────────────────────────
//
// Items voor /gebedstijden/tv. Filter-aanpak:
//   1. Op DB-niveau alleen `status=published` (matcht public-read policy).
//   2. Daarna in code op `active`, `show_on_tv` en het display-tijdvenster.
//      Tijdvenster-filtering doen we in JS i.p.v. Directus-filter zodat we
//      niet verstrikt raken in tijdzone-edge cases — `display_from/until`
//      worden simpelweg vergeleken met `Date.now()`.
const TV_ANNOUNCEMENT_FIELDS = [
  "id", "status", "type", "title", "body",
  "arabic_text", "translation",
  "source", "reference", "grade",
  "display_from", "display_until",
  "active", "show_on_tv",
  "sort", "created_at",
];

export async function getTvAnnouncements(): Promise<TvAnnouncement[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("tv_announcements", {
          filter: { status: { _eq: "published" } } as never,
          // Lager `sort` eerst, dan recentere items eerst.
          sort:   ["sort", "-created_at"],
          limit:  -1,
          fields: TV_ANNOUNCEMENT_FIELDS,
        })
      );

      const items = (result as unknown as TvAnnouncement[]) || [];
      const now = Date.now();

      return items.filter((item) => {
        if (!item.active || !item.show_on_tv) return false;

        // display_from leeg of in het verleden? OK.
        if (item.display_from) {
          const from = Date.parse(item.display_from);
          if (Number.isFinite(from) && from > now) return false;
        }

        // display_until leeg of in de toekomst? OK.
        if (item.display_until) {
          const until = Date.parse(item.display_until);
          if (Number.isFinite(until) && until < now) return false;
        }

        return true;
      });
    },
    "getTvAnnouncements",
    []
  );
}

// ─── Page content ────────────────────────────────────────────
export async function getPageContent(slug: string): Promise<PageContent | null> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("page_content", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          limit:  1,
          fields: [
            "id", "slug", "title", "arabic_title", "subtitle", "intro", "body",
            "seo_title", "seo_description", "status", "icon",
          ],
        })
      );
      return ((result as PageContent[])[0]) ?? null;
    },
    `getPageContent(${slug})`,
    null
  );
}

/**
 * Geef alle gepubliceerde page_content slugs terug.
 * Wordt door /[slug]/page.tsx gebruikt voor generateStaticParams.
 */
export async function getAllPageContentSlugs(): Promise<string[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("page_content", {
          filter: { status: { _eq: "published" } } as never,
          limit:  -1,
          fields: ["slug"],
        })
      );
      return (result as Array<{ slug: string }>).map((r) => r.slug).filter(Boolean);
    },
    "getAllPageContentSlugs",
    []
  );
}

// ─── Navigation ──────────────────────────────────────────────
export async function getNavigationItems(
  scope: "header" | "footer" | "all" = "all"
): Promise<NavigationItem[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("navigation_items", {
          filter: { active: { _eq: true } } as never,
          sort:   ["sort"],
          limit:  -1,
          fields: ["id", "label", "href", "sort", "highlight", "external", "active", "location"],
        })
      );
      const items = result as NavigationItem[];

      if (scope === "all") return items;

      return items.filter((item) => {
        const loc = item.location || "header";
        if (scope === "header") return loc === "header" || loc === "both";
        if (scope === "footer") return loc === "footer" || loc === "both";
        return true;
      });
    },
    `getNavigationItems(${scope})`,
    []
  );
}

// ─── FAQ ─────────────────────────────────────────────────────
export async function getFaqItems(): Promise<FaqItem[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("faq_items", {
          filter: { published: { _eq: true } } as never,
          sort:   ["sort"],
          limit:  -1,
          fields: ["id", "question", "answer", "category", "sort", "published", "icon"],
        })
      );
      return result as FaqItem[];
    },
    "getFaqItems",
    []
  );
}

// ─── Site settings ───────────────────────────────────────────
export async function getSiteSettings(): Promise<SiteSettings | null> {
  return safe(
    async () => {
      const result = await directusServer.request(readSingleton("site_settings"));
      return (result as SiteSettings) ?? null;
    },
    "getSiteSettings",
    null
  );
}

// ─── Prayer time files ───────────────────────────────────────
export async function getActivePrayerTimeFile(): Promise<PrayerTimeFile | null> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("prayer_time_files", {
          filter: { active: { _eq: true } } as never,
          sort:   ["-uploaded_at"],
          limit:  1,
          fields: ["id", "title", "file", "year", "active", "uploaded_at"],
        })
      );
      return ((result as PrayerTimeFile[])[0]) ?? null;
    },
    "getActivePrayerTimeFile",
    null
  );
}

// ─── Icon settings ───────────────────────────────────────────
export async function getIconSettings(): Promise<Map<string, string>> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("icon_settings", {
          limit:  -1,
          fields: ["key", "icon"],
        })
      );
      const map = new Map<string, string>();
      for (const item of result as IconSetting[]) {
        if (item.key && item.icon) map.set(item.key, item.icon);
      }
      return map;
    },
    "getIconSettings",
    new Map<string, string>()
  );
}

// ─── Page sections ───────────────────────────────────────────
const SECTION_FIELDS = [
  "id", "page_slug", "key", "type", "label",
  "eyebrow_ar", "title", "intro",
  "card_title_ar", "card_subtitle", "card_tags",
  "icon", "image",
  "button_text",          "button_url",
  "secondary_button_text","secondary_button_url",
  "max_items",
  "background_variant",
  "primary_cta_label",    "primary_cta_href",
  "secondary_cta_label",  "secondary_cta_href",
  "active", "sort",
];

const SECTION_ITEM_FIELDS = [
  "id", "page_slug", "section_key",
  "title", "description", "icon", "href",
  "button_text", "button_url",
  "image",
  "sort", "active",
];

export async function getPageSections(pageSlug: string): Promise<PageSection[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("page_sections", {
          filter: {
            page_slug: { _eq: pageSlug },
            active:    { _eq: true },
          } as never,
          sort:   ["sort"],
          limit:  -1,
          fields: SECTION_FIELDS,
        })
      );
      return result as unknown as PageSection[];
    },
    `getPageSections(${pageSlug})`,
    []
  );
}

export async function getPageSectionItems(
  pageSlug: string,
  sectionKey?: string
): Promise<PageSectionItem[]> {
  return safe(
    async () => {
      const filter: Record<string, unknown> = {
        page_slug: { _eq: pageSlug },
        active:    { _eq: true },
      };
      if (sectionKey) filter.section_key = { _eq: sectionKey };

      const result = await directusServer.request(
        readItems("page_section_items", {
          filter: filter as never,
          sort:   ["sort"],
          limit:  -1,
          fields: SECTION_ITEM_FIELDS,
        })
      );
      return result as unknown as PageSectionItem[];
    },
    `getPageSectionItems(${pageSlug}, ${sectionKey || "*"})`,
    []
  );
}

/** Eén call: alle sections op een pagina + hun items, items begrensd door max_items. */
export async function getPageSectionsWithItems(
  pageSlug: string
): Promise<Array<PageSection & { items: PageSectionItem[] }>> {
  const [sections, allItems] = await Promise.all([
    getPageSections(pageSlug),
    getPageSectionItems(pageSlug),
  ]);

  return sections.map((section) => {
    let items = allItems
      .filter((item) => item.section_key === section.key)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

    // Begrens op max_items als ingesteld
    if (section.max_items && section.max_items > 0) {
      items = items.slice(0, section.max_items);
    }

    return { ...section, items };
  });
}

// ─── Icon-keys ───────────────────────────────────────────────
export const ICON_KEYS = {
  activityDate:        "activity_date_icon",
  activityLocation:    "activity_location_icon",
  prayerTimes:         "prayer_times_icon",
  donation:            "donation_icon",
  contactEmail:        "contact_email_icon",
  contactPhone:        "contact_phone_icon",
  contactAddress:      "contact_address_icon",
  faq:                 "faq_icon",
  pageSectionDefault:  "page_section_default_icon",
} as const;

export const ICON_FALLBACKS: Record<string, string> = {
  [ICON_KEYS.activityDate]:        "calendar",
  [ICON_KEYS.activityLocation]:    "map-pin",
  [ICON_KEYS.prayerTimes]:         "clock",
  [ICON_KEYS.donation]:            "hand-heart",
  [ICON_KEYS.contactEmail]:        "mail",
  [ICON_KEYS.contactPhone]:        "phone",
  [ICON_KEYS.contactAddress]:      "map-pin",
  [ICON_KEYS.faq]:                 "message-circle",
  [ICON_KEYS.pageSectionDefault]:  "info",
};

export function resolveIconKey(map: Map<string, string>, key: string): string {
  return map.get(key) || ICON_FALLBACKS[key] || "info";
}

export { readItems, readSingleton };
