// types/directus.ts
// Centrale type-definities voor alle Directus collecties

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

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  seo_title?: string;
  seo_description?: string;
  status: "published" | "draft" | "archived";
}

export interface Activity {
  id: string;
  title: string;
  slug: string;
  description: string;
  start_date: string;
  end_date?: string;
  location?: string;
  image?: string | DirectusFile;
  status: "published" | "draft" | "archived";
  featured: boolean;
  registration_enabled: boolean;
}

export interface PrayerTimeFile {
  id: string;
  title: string;
  file: string | DirectusFile;
  year: number;
  active: boolean;
  uploaded_at: string;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  logo?: string | DirectusFile;
  contact_email: string;
  phone?: string;
  address?: string;
  social_links?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    whatsapp?: string;
  };
}

// Gebedstijden rij uit CSV
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

// Schema voor Directus SDK
export interface DirectusSchema {
  pages: Page[];
  activities: Activity[];
  prayer_time_files: PrayerTimeFile[];
  site_settings: SiteSettings[];
}
