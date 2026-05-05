// types/directus.ts

export interface DirectusFile {
  id: string;
  filename_download: string;
  type: string;
  filesize: number;
  width?: number;
  height?: number;
  title?: string;
  storage: string;
}

// ─── activities ──────────────────────────────────────────────
export interface Activity {
  id: string;
  status: "published" | "draft" | "archived";
  title: string;
  slug: string;
  description: string;
  start_date: string;
  end_date?: string | null;
  location?: string | null;
  image?: string | DirectusFile | null;
  featured: boolean;
  registration_enabled: boolean;
}

// ─── prayer_time_files ───────────────────────────────────────
export interface PrayerTimeFile {
  id: string;
  title: string;
  file: string | DirectusFile;
  year: number;
  active: boolean;
  uploaded_at: string;
}

// ─── site_settings (singleton) ───────────────────────────────
export interface SiteSettings {
  id: string | number;
  site_name: string;
  logo?: string | DirectusFile | null;
  favicon?: string | DirectusFile | null;
  og_image?: string | DirectusFile | null;
  contact_email?: string | null;
  phone?: string | null;
  address?: string | null;
  footer_text?: string | null;
  copyright_text?: string | null;
  footer_enabled?: boolean | null;
  default_seo_title?: string | null;
  default_seo_description?: string | null;
  social_links?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    whatsapp?: string;
  } | null;
}

// ─── navigation_items ────────────────────────────────────────
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  sort?: number | null;
  highlight: boolean;
  external: boolean;
  active: boolean;
  /** "header" | "footer" | "both" — default "header" voor backwards compat */
  location?: "header" | "footer" | "both" | null;
}

// ─── page_content ────────────────────────────────────────────
export interface PageContent {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  intro?: string | null;
  body?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  status: "published" | "draft";
  icon?: string | null;
}

// ─── faq_items ───────────────────────────────────────────────
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  sort?: number | null;
  published: boolean;
  icon?: string | null;
}

// ─── icon_settings ───────────────────────────────────────────
export interface IconSetting {
  id: string;
  key: string;
  icon: string;
  label?: string | null;
  description?: string | null;
}

// ─── CSV-rij ─────────────────────────────────────────────────
export interface PrayerTimeRow {
  datum: string;
  dag?: string;
  fajr: string;
  shuruq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

// ─── SDK Schema ──────────────────────────────────────────────
export interface DirectusSchema {
  activities: Activity[];
  prayer_time_files: PrayerTimeFile[];
  site_settings: SiteSettings;
  navigation_items: NavigationItem[];
  page_content: PageContent[];
  faq_items: FaqItem[];
  icon_settings: IconSetting[];
}
