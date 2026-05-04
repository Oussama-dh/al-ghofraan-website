const DIRECTUS_URL =
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "http://localhost:8055";

type DirectusResponse<T> = {
  data: T;
};

export type Activity = {
  id: string;
  status: "published" | "draft" | "archived";
  title: string;
  slug: string;
  description: string;
  start_date: string;
  end_date?: string;
  location?: string;
  image?: string | { id?: string };
  featured?: boolean;
  registration_enabled?: boolean;
};

export type PrayerTimeFile = {
  id: string;
  title: string;
  file: string | { id?: string };
  year: number;
  active: boolean;
  uploaded_at: string;
};

export type PrayerTimeRow = {
  date?: string;
  datum?: string;
  dag?: string;

  fajr: string;
  shuruq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

export type SiteSettings = {
  id?: string | number;
  site_name?: string;
  logo?: string | { id?: string };
  contact_email?: string;
  phone?: string;
  address?: string;
  social_links?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    whatsapp?: string;
    x?: string;
    linkedin?: string;
};};

export type NavigationItem = {
  id?: string | number;
  label: string;
  href: string;
  sort?: number;
  highlight?: boolean;
  external?: boolean;
  active?: boolean;
};

export type PageContent = {
  id?: string | number;
  slug: string;
  title?: string;
  subtitle?: string;
  intro?: string;
  body?: string;
  seo_title?: string;
  seo_description?: string;
  status?: string;
};

export type FaqItem = {
  id?: string | number;
  question: string;
  answer: string;
  category?: string;
  sort?: number;
  published?: boolean;
};

async function directusFetch<T>(path: string): Promise<T | null> {
  try {
    const url = `${DIRECTUS_URL}${path}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (process.env.DIRECTUS_TOKEN) {
      headers.Authorization = `Bearer ${process.env.DIRECTUS_TOKEN}`;
    }

    const response = await fetch(url, {
    headers,
    cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Directus request failed: ${response.status} ${url}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn("Directus niet bereikbaar:", error);
    return null;
  }
}

function getFileId(file: unknown): string | null {
  if (!file) return null;

  if (typeof file === "string") {
    return file;
  }

  if (typeof file === "object" && file !== null && "id" in file) {
    const id = (file as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }

  return null;
}

export function getAssetUrl(file: unknown): string {
  const id = getFileId(file);

  if (!id) {
    return "";
  }

  return `${DIRECTUS_URL}/assets/${id}`;
}

export async function getActivities(): Promise<Activity[]> {
  const result = await directusFetch<DirectusResponse<Activity[]>>(
    "/items/activities?filter[status][_eq]=published&sort=start_date"
  );

  return result?.data ?? [];
}

export async function getUpcomingActivities(limit = 3): Promise<Activity[]> {
  const today = new Date().toISOString();

  const result = await directusFetch<DirectusResponse<Activity[]>>(
    `/items/activities?filter[status][_eq]=published&filter[start_date][_gte]=${encodeURIComponent(
      today
    )}&sort=start_date&limit=${limit}`
  );

  return result?.data ?? [];
}

export async function getActivityBySlug(
  slug: string
): Promise<Activity | null> {
  const result = await directusFetch<DirectusResponse<Activity[]>>(
    `/items/activities?filter[slug][_eq]=${encodeURIComponent(
      slug
    )}&filter[status][_eq]=published&limit=1`
  );

  return result?.data?.[0] ?? null;
}

export async function getActivePrayerTimeFile(): Promise<PrayerTimeFile | null> {
  const result = await directusFetch<DirectusResponse<PrayerTimeFile[]>>(
    "/items/prayer_time_files?filter[active][_eq]=true&sort=-uploaded_at&limit=1"
  );

  return result?.data?.[0] ?? null;
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const result = await directusFetch<DirectusResponse<SiteSettings>>(
    "/items/site_settings"
  );

  return result?.data ?? null;
}

export async function getNavigationItems(): Promise<NavigationItem[]> {
  const result = await directusFetch<DirectusResponse<NavigationItem[]>>(
    "/items/navigation_items?filter[active][_eq]=true&sort=sort"
  );

  return result?.data ?? [];
}

export async function getPageContent(
  slug: string
): Promise<PageContent | null> {
  const result = await directusFetch<DirectusResponse<PageContent[]>>(
    `/items/page_content?filter[slug][_eq]=${encodeURIComponent(
      slug
    )}&filter[status][_eq]=published&limit=1`
  );

  return result?.data?.[0] ?? null;
}

export async function getFaqItems(): Promise<FaqItem[]> {
  const result = await directusFetch<DirectusResponse<FaqItem[]>>(
    "/items/faq_items?filter[published][_eq]=true&sort=sort"
  );

  return result?.data ?? [];
}