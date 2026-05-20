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
  EducationCategory,
  DonationCampaign,
  Article,
  ArticleCategory,
  Video,
  VideoCategory,
  TvAnnouncement,
  HijriDateOverride,
  ContactSubject,
  Vacancy,
  PrayerCalendarHighlight,
  DailyHadith,
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
            "registration_intro_title", "registration_intro_text",
            "registration_button_text", "registration_success_message",
            "registration_extra_note",
            // Delivery 21 — minimum_age tonen op /agenda overzichtskaart.
            "minimum_age",
            // Delivery recurring — voor occurrence-generatie + badges.
            "is_recurring", "recurrence_type", "recurrence_interval",
            "recurrence_until", "recurrence_weekday", "show_occurrence_picker",
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
      // Delivery recurring — filter combineert twee gevallen:
      //   (a) eenmalige activiteiten met start_date >= vandaag (huidig gedrag), OF
      //   (b) terugkerende activiteiten waarvan de serie nog niet voorbij is
      //       (recurrence_until is leeg → frontend gebruikt 6-maanden-fallback;
      //        of recurrence_until >= vandaag).
      // Zonder (b) zou een wekelijkse activiteit met start_date in het
      // verleden onterecht uit de upcoming-lijst vallen.
      const result = await directusServer.request(
        readItems("activities", {
          filter: {
            status: { _eq: "published" },
            _or: [
              { start_date: { _gte: today } },
              {
                _and: [
                  { is_recurring: { _eq: true } },
                  {
                    _or: [
                      { recurrence_until: { _null: true } },
                      { recurrence_until: { _gte: today } },
                    ],
                  },
                ],
              },
            ],
          } as never,
          sort:   ["start_date"],
          limit,
          fields: [
            "id", "status", "title", "slug", "description",
            "start_date", "end_date", "location", "image",
            "featured", "registration_enabled", "target_gender",
            "registration_intro_title", "registration_intro_text",
            "registration_button_text", "registration_success_message",
            "registration_extra_note",
            // Delivery 21 — minimum_age tonen op homepage upcoming-cards.
            "minimum_age",
            // Delivery recurring — voor occurrence-generatie + badges.
            "is_recurring", "recurrence_type", "recurrence_interval",
            "recurrence_until", "recurrence_weekday", "show_occurrence_picker",
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

/**
 * Delivery 19 — Telt het aantal `registrations`-records voor een specifieke
 * activiteit. Gebruikt om de capaciteit-UI (`max_registrations` /
 * `show_registration_limit`) op `/agenda/[slug]` te tonen.
 *
 * Wat we tellen: records met `type=activity`, `source_collection=activities`
 * en `source_id` gelijk aan de activity-id. Geen filter op status — een
 * "cancelled" inschrijving telt nog steeds als bezette plek tot admin
 * 'm verwijdert; dat is een bewuste keuze (zie CHANGES.md delivery 19).
 *
 * Vereist de admin-token (`DIRECTUS_TOKEN`) omdat `registrations` géén
 * public read-permission heeft (en mag krijgen). Bij ontbrekende token
 * of fout retourneren we `null` zodat de UI fail-open kan reageren —
 * de server-side enforcement in `app/api/inschrijven/route.ts` doet
 * z'n eigen onafhankelijke check.
 */
export async function getActivityRegistrationCount(
  activityId: string | number,
): Promise<number | null> {
  if (!DIRECTUS_TOKEN) return null;
  try {
    const result = await directusServer.request(
      readItems("registrations", {
        filter: {
          type:              { _eq: "activity" },
          source_collection: { _eq: "activities" },
          source_id:         { _eq: String(activityId) },
        } as never,
        fields: ["id"],
        limit:  -1,
      }),
    );
    return (result as Array<{ id: unknown }>).length;
  } catch (err) {
    if (IS_DEV) {
      console.warn(
        `[directus] getActivityRegistrationCount(${activityId}) mislukt:`,
        (err as Error)?.message || err,
      );
    }
    return null;
  }
}

// ─── Education programs ──────────────────────────────────────
const EDUCATION_FIELDS = [
  "id", "status", "title", "slug", "description",
  "teacher", "target_group", "schedule", "location",
  "start_date", "end_date", "image",
  "registration_enabled", "max_participants", "sort", "target_gender",
  // Beheerbare inschrijfteksten (delivery 3)
  "registration_intro_title", "registration_intro_text",
  "registration_button_text", "registration_success_message",
  "registration_extra_note",
  // Onderwijs-flow toggles (delivery 4)
  "show_registration_form_immediately",
  "require_terms_acceptance",
  "allow_multiple_students",
  // M2O — vraag de gerelateerde categorie-velden mee voor filter-rendering
  // op /onderwijs. Alleen velden die de frontend daadwerkelijk gebruikt.
  "category_ref.id", "category_ref.name", "category_ref.slug",
  "category_ref.status", "category_ref.active",
];

export async function getEducationPrograms(): Promise<EducationProgram[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("education_programs", {
          filter: { status: { _eq: "published" } } as never,
          sort:   ["sort", "title"],
          limit:  -1,
          fields: EDUCATION_FIELDS as never,
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
          fields: EDUCATION_FIELDS as never,
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

// ─── Education categories (M2O target voor education_programs) ─
const EDUCATION_CATEGORY_FIELDS = [
  "id", "status", "name", "slug", "description",
  "sort", "active", "created_at",
];

export async function getEducationCategories(): Promise<EducationCategory[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("education_categories", {
          filter: { status: { _eq: "published" }, active: { _eq: true } } as never,
          sort:   ["sort", "name"],
          limit:  -1,
          fields: EDUCATION_CATEGORY_FIELDS,
        })
      );
      return (result as unknown as EducationCategory[]) ?? [];
    },
    "getEducationCategories",
    []
  );
}

/**
 * Effectieve categorie-slug voor een onderwijsprogramma. Pakt
 * category_ref.slug als de M2O is gepopuleerd; anders null.
 * Programma's zonder categorie zijn alleen zichtbaar bij "Alle".
 */
export function getEffectiveEducationCategorySlug(
  program: EducationProgram,
): string | null {
  const ref = program.category_ref;
  if (ref && typeof ref === "object" && ref !== null && "slug" in ref) {
    const slug = (ref as EducationCategory).slug;
    if (typeof slug === "string" && slug.trim()) return slug.trim();
  }
  return null;
}

// ─── Donation campaigns ──────────────────────────────────────
const CAMPAIGN_FIELDS = [
  "id", "status", "title", "slug", "description", "image",
  "goal_amount", "goal_amount_display",
  "allow_one_time", "allow_monthly",
  "suggested_amounts", "default_amount",
  "featured", "sort",
  // Stripe Payment Link integratie (delivery 2b — Fase 1)
  "use_stripe_payment_link", "stripe_payment_link_url", "stripe_payment_link_id",
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
  // M2O — vraag de gerelateerde categorie-velden mee.
  // `category_ref.id` blijft beschikbaar voor link-bouw.
  "category_ref.id", "category_ref.name", "category_ref.slug",
  "category_ref.status", "category_ref.active",
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
          fields: ARTICLE_LIST_FIELDS as never,
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
          fields: ARTICLE_FULL_FIELDS as never,
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

// ─── vacancies (delivery 18) ─────────────────────────────────
// Volgt het articles-patroon: filter op status=published voor publiek,
// sortering via `sort` met `-published_at` als tiebreaker.

const VACANCY_LIST_FIELDS = [
  "id", "status", "title", "slug", "summary",
  "location", "hours", "deadline",
  "sort", "published_at",
];

const VACANCY_FULL_FIELDS = [
  ...VACANCY_LIST_FIELDS,
  // Delivery 19 — salary + contract_duration tonen op detail-pagina onder
  // "Arbeidsvoorwaarden" naast locatie/uren/deadline.
  "body", "salary", "contract_duration",
  "apply_url", "contact_email", "hero_image", "created_at",
];

export async function getVacancies(): Promise<Vacancy[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("vacancies", {
          filter: { status: { _eq: "published" } } as never,
          sort:   ["sort", "-published_at"],
          limit:  -1,
          fields: VACANCY_LIST_FIELDS as never,
        })
      );
      return result as unknown as Vacancy[];
    },
    "getVacancies",
    []
  );
}

export async function getVacancyBySlug(slug: string): Promise<Vacancy | null> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("vacancies", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          limit:  1,
          fields: VACANCY_FULL_FIELDS as never,
        })
      );
      return ((result as unknown as Vacancy[])[0]) ?? null;
    },
    `getVacancyBySlug(${slug})`,
    null
  );
}

export async function getAllVacancySlugs(): Promise<string[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("vacancies", {
          filter: { status: { _eq: "published" } } as never,
          limit:  -1,
          fields: ["slug"],
        })
      );
      return (result as Array<{ slug: string }>).map((r) => r.slug).filter(Boolean);
    },
    "getAllVacancySlugs",
    []
  );
}

// ─── Sitemap helpers (delivery 26) ───────────────────────────
// Aparte helpers omdat de sitemap andere filters wil dan
// generateStaticParams. We willen verlopen vacatures NIET in de
// sitemap (geen SEO-waarde), maar wel als geldige route bereikbaar
// laten voor Google's gecachte links (404's vermijden).

export interface SitemapEntry {
  slug: string;
}

/**
 * Activity-slugs voor de sitemap. Alle published activities (inclusief
 * verleden) — Google moet historische archief-pagina's kunnen blijven
 * tonen voor zoekopdrachten naar specifieke evenementen.
 */
export async function getActivitySlugsForSitemap(): Promise<SitemapEntry[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("activities", {
          filter: { status: { _eq: "published" } } as never,
          limit:  -1,
          fields: ["slug"],
        })
      );
      return (result as Array<{ slug: string }>)
        .filter((r) => r.slug)
        .map((r) => ({ slug: r.slug }));
    },
    "getActivitySlugsForSitemap",
    []
  );
}

/**
 * Vacancy-slugs voor de sitemap. Alleen vacatures waarvan de deadline
 * nog niet verstreken is (of waar deadline leeg is). Verlopen vacatures
 * blijven bereikbaar via directe URL, maar staan niet in de sitemap
 * zodat Google ze niet meer als "nieuwe content" indexeert.
 */
export async function getOpenVacancySlugsForSitemap(): Promise<SitemapEntry[]> {
  return safe(
    async () => {
      const today = new Date().toISOString().split("T")[0];
      const result = await directusServer.request(
        readItems("vacancies", {
          filter: {
            status: { _eq: "published" },
            _or: [
              { deadline: { _null: true } },
              { deadline: { _gte: today } },
            ],
          } as never,
          limit:  -1,
          fields: ["slug"],
        })
      );
      return (result as Array<{ slug: string }>)
        .filter((r) => r.slug)
        .map((r) => ({ slug: r.slug }));
    },
    "getOpenVacancySlugsForSitemap",
    []
  );
}

// ─── Article categories ──────────────────────────────────────
const ARTICLE_CATEGORY_FIELDS = [
  "id", "status", "name", "slug", "description",
  "sort", "active", "created_at",
];

export async function getArticleCategories(): Promise<ArticleCategory[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("article_categories", {
          filter: { status: { _eq: "published" }, active: { _eq: true } } as never,
          sort:   ["sort", "name"],
          limit:  -1,
          fields: ARTICLE_CATEGORY_FIELDS,
        })
      );
      return (result as unknown as ArticleCategory[]) ?? [];
    },
    "getArticleCategories",
    []
  );
}

/**
 * Bepaal de "effectieve" categorienaam voor een artikel:
 *   - eerst category_ref.name (als M2O is gepopuleerd)
 *   - anders de oude vrije category-string
 *   - anders null
 */
export function getEffectiveCategoryName(article: Article): string | null {
  const ref = article.category_ref;
  if (ref && typeof ref === "object" && ref !== null && "name" in ref) {
    const name = (ref as ArticleCategory).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  if (typeof article.category === "string" && article.category.trim()) {
    return article.category.trim();
  }
  return null;
}

/**
 * Effectieve slug voor filter-URL:
 *   - eerst category_ref.slug (gestructureerd)
 *   - anders fallback: lowercase van de string-categorie (oude gedrag)
 */
export function getEffectiveCategorySlug(article: Article): string | null {
  const ref = article.category_ref;
  if (ref && typeof ref === "object" && ref !== null && "slug" in ref) {
    const slug = (ref as ArticleCategory).slug;
    if (typeof slug === "string" && slug.trim()) return slug.trim();
  }
  if (typeof article.category === "string" && article.category.trim()) {
    return article.category.trim().toLowerCase();
  }
  return null;
}

// ─── Videos ──────────────────────────────────────────────────
const VIDEO_FIELDS = [
  "id", "status", "title", "description", "youtube_url",
  "sort", "featured", "published_at", "created_at",
  "show_on_homepage", "homepage_sort",
  // Delivery youtube-import — gebruikt door cards voor thumbnails.
  "youtube_video_id", "thumbnail_url",
  // M2O
  "category_ref.id", "category_ref.name", "category_ref.slug",
  "category_ref.status", "category_ref.active",
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
          fields: VIDEO_FIELDS as never,
        })
      );
      return result as unknown as Video[];
    },
    "getVideos",
    []
  );
}

// ─── Video categories ────────────────────────────────────────
const VIDEO_CATEGORY_FIELDS = [
  "id", "status", "name", "slug", "description",
  "sort", "active", "created_at",
];

export async function getVideoCategories(): Promise<VideoCategory[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("video_categories", {
          filter: { status: { _eq: "published" }, active: { _eq: true } } as never,
          sort:   ["sort", "name"],
          limit:  -1,
          fields: VIDEO_CATEGORY_FIELDS,
        })
      );
      return (result as unknown as VideoCategory[]) ?? [];
    },
    "getVideoCategories",
    []
  );
}

/**
 * Homepage-video's: alleen show_on_homepage=true, gesorteerd op
 * homepage_sort oplopend (nulls last). Standaard limiet 3.
 */
export async function getHomepageVideos(limit = 3): Promise<Video[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("videos", {
          filter: {
            status: { _eq: "published" },
            show_on_homepage: { _eq: true },
          } as never,
          sort:   ["homepage_sort", "-published_at"],
          limit,
          fields: VIDEO_FIELDS as never,
        })
      );
      return result as unknown as Video[];
    },
    "getHomepageVideos",
    []
  );
}

/**
 * Effectieve categorienaam voor video.
 * Eerst category_ref.name (M2O), anders null.
 * Note: video heeft geen oude string-fallback zoals articles —
 * vóór deze release hadden video's geen category-veld.
 */
export function getEffectiveVideoCategoryName(video: Video): string | null {
  const ref = video.category_ref;
  if (ref && typeof ref === "object" && ref !== null && "name" in ref) {
    const name = (ref as VideoCategory).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return null;
}

export function getEffectiveVideoCategorySlug(video: Video): string | null {
  const ref = video.category_ref;
  if (ref && typeof ref === "object" && ref !== null && "slug" in ref) {
    const slug = (ref as VideoCategory).slug;
    if (typeof slug === "string" && slug.trim()) return slug.trim();
  }
  return null;
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

// ─── Hijri date overrides ────────────────────────────────────
const HIJRI_OVERRIDE_FIELDS = [
  "id", "gregorian_date", "hijri_day", "hijri_month", "hijri_year",
  "note", "active", "created_at",
];

export async function getHijriDateOverrides(): Promise<HijriDateOverride[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("hijri_date_overrides", {
          filter: { active: { _eq: true } } as never,
          sort:   ["gregorian_date"],
          limit:  -1,
          fields: HIJRI_OVERRIDE_FIELDS,
        })
      );
      return (result as unknown as HijriDateOverride[]) ?? [];
    },
    "getHijriDateOverrides",
    []
  );
}

// ─── Prayer calendar highlights ──────────────────────────────
//
// Delivery 21 — Datums die in de gebedstijden-kalender visueel
// gemarkeerd worden (Eid, Ramadan, eigen events, etc.).
// Filtering op `status=published` en `show_on_calendar=true` gebeurt
// hier al, zodat consumenten een schone lijst krijgen.
const PRAYER_CALENDAR_HIGHLIGHT_FIELDS = [
  "id", "status", "gregorian_date", "title", "description",
  "type", "color", "icon",
  "show_on_calendar", "show_on_tv", "sort", "created_at",
];

export async function getPrayerCalendarHighlights(): Promise<PrayerCalendarHighlight[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("prayer_calendar_highlights", {
          filter: {
            status:           { _eq: "published" },
            show_on_calendar: { _eq: true },
          } as never,
          sort:   ["gregorian_date", "sort"],
          limit:  -1,
          fields: PRAYER_CALENDAR_HIGHLIGHT_FIELDS,
        })
      );
      return (result as unknown as PrayerCalendarHighlight[]) ?? [];
    },
    "getPrayerCalendarHighlights",
    []
  );
}

// ─── Contact subjects ────────────────────────────────────────
const CONTACT_SUBJECT_FIELDS = [
  "id", "status", "label", "value", "description",
  "sort", "active", "created_at",
];

export async function getContactSubjects(): Promise<ContactSubject[]> {
  return safe(
    async () => {
      const result = await directusServer.request(
        readItems("contact_subjects", {
          filter: { status: { _eq: "published" }, active: { _eq: true } } as never,
          sort:   ["sort", "label"],
          limit:  -1,
          fields: CONTACT_SUBJECT_FIELDS,
        })
      );
      return (result as unknown as ContactSubject[]) ?? [];
    },
    "getContactSubjects",
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
            "hero_background_image",
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
          fields: ["id", "label", "href", "sort", "highlight", "external", "active", "location", "parent"],
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
  "ayah_arabic", "ayah_reference",
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

/**
 * Delivery daily-hadith + hadith-rotation —
 *
 * Geeft de hadieth terug die op DEZE DAG getoond moet worden op de
 * homepage. Twee paden:
 *
 *   1. force_show override (admin pin'd een specifieke hadieth):
 *      - Alle actieve+published ahadieth waar force_show=true EN
 *        (force_show_until leeg OF force_show_until >= vandaag UTC).
 *      - Bij meerdere matches: laagste sort ASC, dan laagste id ASC.
 *      - Geen console.warn bij meerdere — wel zichtbaar voor admin
 *        in Directus dat er meerdere force_show=true rijen staan.
 *
 *   2. Dagelijkse rotatie (default):
 *      - dayNumber = floor(Date.now() / 86400000) — UTC dagen sinds epoch.
 *      - index = dayNumber % ahadieth.length
 *      - Sortering stabiel: sort ASC, dan id ASC.
 *      - Iedereen wereldwijd ziet op dezelfde UTC-dag dezelfde hadieth.
 *      - Wisseling vindt plaats om 00:00 UTC (= 01:00 NL winter, 02:00 NL zomer).
 *        Acceptabel: voorspelbaar, cache-vriendelijk, geen tijdzone-deps.
 *
 * Edge cases:
 *   - 0 ahadieth      → null (homepage rendert niets).
 *   - 1 hadieth       → die ene, rotatie irrelevant (index 0).
 *   - draft/inactive  → uitgesloten door Directus filter ÉN runtime check.
 *
 * Public-read permissions (status=published AND active=true) zijn in
 * stap 02 ingesteld. De runtime filter hier is een extra laag voor de
 * server-side fetch (DIRECTUS_TOKEN of public-policy).
 */
export async function getDailyHadithForToday(): Promise<DailyHadith | null> {
  return safe(
    async () => {
      const all = (await directusServer.request(
        readItems("daily_hadiths", {
          filter: {
            _and: [
              { status: { _eq: "published" } },
              { active: { _eq: true } },
            ],
          } as never,
          // Stabiele server-sortering — fallback voor het geval Directus
          // de array in een andere volgorde geeft per request.
          sort:  ["sort", "id"],
          limit: -1,
          fields: [
            "id", "status", "active",
            "title", "arabic_text", "translation_nl",
            "source", "grade", "explanation_short",
            "display_date", "sort", "created_at",
            "force_show", "force_show_until",
          ],
        }),
      )) as DailyHadith[];

      if (!all.length) return null;

      // Defensieve client-side resort (sort ASC, dan id ASC) — onafhankelijk
      // van wat Directus exact teruggeeft, deterministisch.
      const sorted = [...all].sort((a, b) => {
        const sa = typeof a.sort === "number" ? a.sort : Number.MAX_SAFE_INTEGER;
        const sb = typeof b.sort === "number" ? b.sort : Number.MAX_SAFE_INTEGER;
        if (sa !== sb) return sa - sb;
        return Number(a.id) - Number(b.id);
      });

      // ─── Pad 1: force_show override ─────────────────────────
      const todayUtcMs = startOfUtcDay(Date.now());
      const forced = sorted.filter((h) => {
        if (h.force_show !== true) return false;
        // force_show_until = einddatum (inclusief die dag). Leeg = altijd geldig.
        if (!h.force_show_until) return true;
        const untilMs = startOfUtcDay(Date.parse(h.force_show_until));
        if (!Number.isFinite(untilMs)) return true; // ongeldig veld → behandel als onbeperkt
        return todayUtcMs <= untilMs;
      });
      if (forced.length > 0) {
        return forced[0]; // sorted volgens sort ASC, id ASC
      }

      // ─── Pad 2: dagelijkse rotatie ─────────────────────────
      const dayNumber = Math.floor(todayUtcMs / 86_400_000);
      const index     = ((dayNumber % sorted.length) + sorted.length) % sorted.length;
      return sorted[index] ?? null;
    },
    "getDailyHadithForToday",
    null,
  );
}

/**
 * Backward-compatible alias. Bestaande callers hoeven niet aangepast
 * te worden; nieuwe code gebruikt getDailyHadithForToday.
 */
export const getActiveDailyHadith = getDailyHadithForToday;

/**
 * Helper: epoch-ms van het begin van de UTC-dag voor een gegeven timestamp.
 * Gebruikt om datums te vergelijken zonder tijd-component.
 */
function startOfUtcDay(ms: number): number {
  if (!Number.isFinite(ms)) return NaN;
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export { readItems, readSingleton };
