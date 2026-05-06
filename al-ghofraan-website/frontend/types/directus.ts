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
/**
 * Doelgroep op geslacht — bepaalt welke geslachts-opties het inschrijfformulier
 * toont op de detailpagina. Niet ingesteld of "mixed" = beide.
 */
export type TargetGender = "male" | "female" | "mixed";

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
  target_gender?: TargetGender | null;
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

// ─── site_settings ───────────────────────────────────────────
export interface SiteSettings {
  id: string | number;
  site_name: string;
  /** Subtitel onder de site-naam in header (bv. "DawahCommissie") */
  site_subtitle?: string | null;
  logo?: string | DirectusFile | null;
  /** Apart logo voor de footer. Als leeg, valt terug op `logo`. */
  footer_logo?: string | DirectusFile | null;
  favicon?: string | DirectusFile | null;
  og_image?: string | DirectusFile | null;
  contact_email?: string | null;
  phone?: string | null;
  address?: string | null;
  /** Latijnse titel in footer-branding (bv. "Al-Ghofraan") */
  footer_title?: string | null;
  /** Arabische titel in footer-branding (bv. "المسجد الغفران") */
  footer_arabic_title?: string | null;
  /** Beschrijvende tekst onder footer-branding */
  footer_description?: string | null;
  /** Verouderd alias voor footer_description — blijft werken als fallback */
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

// ─── page_sections ───────────────────────────────────────────
export type PageSectionType = "split_feature" | "card_grid" | "simple_text" | "cta";

export type SectionBackgroundVariant =
  | "default"        // sand-50 (warm beige)
  | "white"          // pure wit
  | "sand"           // donkerder beige
  | "slate-mosque";  // donkerblauw — zelfde als CTA

export interface PageSection {
  id: string;
  page_slug: string;
  /** Unieke key binnen een pagina, bv. "mission" of "what_we_do" */
  key: string;
  type: PageSectionType;
  /** Korte interne label voor in Directus, niet zichtbaar op de site */
  label?: string | null;
  /** Arabische heading boven de titel (optioneel) */
  eyebrow_ar?: string | null;
  /** Hoofdtitel van de sectie */
  title?: string | null;
  /** Subtitel / intro-tekst */
  intro?: string | null;
  /** Voor split_feature: Arabisch woord op de illustratie-kaart */
  card_title_ar?: string | null;
  /** Voor split_feature: kleine ondertitel onder card_title_ar */
  card_subtitle?: string | null;
  /** Voor split_feature: array van Arabische tag-woordjes */
  card_tags?: string[] | null;
  /** Optioneel hoofdicoon voor de sectie */
  icon?: string | null;
  /** Optionele afbeelding voor de sectie (split_feature, card_grid, simple_text) */
  image?: string | DirectusFile | null;
  /** Algemene knop (alle types behalve cta — daar zijn aparte primary_/secondary_ velden) */
  button_text?: string | null;
  button_url?:  string | null;
  secondary_button_text?: string | null;
  secondary_button_url?:  string | null;
  /** Maximaal aantal items dat getoond wordt (0 of leeg = alle) */
  max_items?: number | null;
  /** Achtergrondvariant — beïnvloedt kleur van de sectie */
  background_variant?: SectionBackgroundVariant | null;
  /** Voor cta type: knoppen (apart i.v.m. eigen styling) */
  primary_cta_label?: string | null;
  primary_cta_href?:  string | null;
  secondary_cta_label?: string | null;
  secondary_cta_href?:  string | null;
  active: boolean;
  sort?: number | null;
}

// ─── education_programs ──────────────────────────────────────
export interface EducationProgram {
  id: string;
  status: "published" | "draft" | "archived";
  title: string;
  slug: string;
  description?: string | null;
  teacher?: string | null;
  target_group?: string | null;
  schedule?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  image?: string | DirectusFile | null;
  registration_enabled: boolean;
  max_participants?: number | null;
  sort?: number | null;
  target_gender?: TargetGender | null;
}

// ─── registrations ───────────────────────────────────────────
export type RegistrationType = "activity" | "education";

export type RegistrationStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "waiting_list"
  | "cancelled";

/**
 * Geslachtswaarden — frontend & API werken met "male" / "female".
 * De DB-kolom is bewust nullable string zodat oude records met "m"/"f"
 * of "other" intact blijven (zie docs/CMS_BEHEER.md).
 */
export type Gender = "male" | "female";

export interface Registration {
  id: string;
  type: RegistrationType;
  source_collection: string;   // "activities" | "education_programs"
  source_id: string;           // id van het bron-item
  source_slug: string;
  source_title: string;
  /** M2O naar education_programs.id (alleen bij type=education) */
  education_program?: string | null;
  /** M2O naar activities.id (alleen bij type=activity) */
  activity?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  age?: number | null;
  /** Nieuwe inschrijvingen: "male" of "female". Oude records kunnen nog "m"/"f"/"other" bevatten. */
  gender?: string | null;
  notes?: string | null;
  status: RegistrationStatus;
  created_at?: string | null;
}

// ─── page_section_items ──────────────────────────────────────
export interface PageSectionItem {
  id: string;
  page_slug: string;
  section_key: string;
  title?: string | null;
  description?: string | null;
  icon?: string | null;
  /** Optionele href als de tile klikbaar moet zijn */
  href?: string | null;
  /** Algemene knop op item-niveau (optioneel) */
  button_text?: string | null;
  button_url?:  string | null;
  /** Optionele afbeelding op item-niveau */
  image?: string | DirectusFile | null;
  sort?: number | null;
  active: boolean;
}

// ─── CSV-rij ─────────────────────────────────────────────────
//
// Veldnamen volgen de gebruikte spelling op de site:
//   Fajr · Shoeroeq · Dhoehr · Asr · Maghrib · Ishaa
//
// Het CSV-bestand uit Directus heeft kolomheaders met hoofdletter,
// maar in TypeScript hanteren we kleine letters voor consistentie.
export interface PrayerTimeRow {
  datum: string;
  dag?: string;
  fajr: string;
  shoeroeq: string;
  dhoehr: string;
  asr: string;
  maghrib: string;
  ishaa: string;
}

// ─── donations ───────────────────────────────────────────────
export type DonationType   = "one_time" | "monthly";
export type DonationStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "active"
  | "ended";

export interface Donation {
  id: string;
  type: DonationType;
  status: DonationStatus;
  /** Bedrag in eurocenten — altijd integer */
  amount: number;
  currency: string;
  donor_name?: string | null;
  donor_email: string;
  message?: string | null;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  raw_event?: Record<string, unknown> | null;
  created_at?: string | null;
  paid_at?: string | null;
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
  page_sections: PageSection[];
  page_section_items: PageSectionItem[];
  education_programs: EducationProgram[];
  registrations: Registration[];
  donations: Donation[];
}
