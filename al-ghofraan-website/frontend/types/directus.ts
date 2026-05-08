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
  /** WhatsApp nummer in internationaal formaat (bv. "31612345678" of "+31 6 12345678" — wordt ge-normaliseerd) */
  whatsapp_number?: string | null;
  /** Voorgevulde tekst voor de WhatsApp-knop op /contact */
  whatsapp_default_message?: string | null;
  /** Duur van de gebedstijden-slide op /gebedstijden/tv (in seconden). Default 25. */
  tv_prayer_slide_seconds?: number | null;
  /** Duur van een mededeling/hadith op /gebedstijden/tv (in seconden). Default 15. */
  tv_item_slide_seconds?: number | null;
  /** Refresh-interval voor server-data op /gebedstijden/tv (in minuten). Default 5. */
  tv_refresh_minutes?: number | null;
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
  /** Optionele Arabische titel die boven de hoofdtitel verschijnt in de hero. */
  arabic_title?: string | null;
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
  source_id: string;           // id van het bron-item (string ipv int — werkt voor beide id-types)
  source_slug: string;
  source_title: string;
  name: string;
  email: string;
  phone?: string | null;
  age?: number | null;
  /** Nieuwe inschrijvingen: "male" of "female". Oude records kunnen nog "m"/"f"/"other" bevatten. */
  gender?: string | null;
  notes?: string | null;
  status: RegistrationStatus;
  /** Interne notitie voor opvolging — niet zichtbaar voor de inschrijver. */
  internal_notes?: string | null;
  /** Wanneer er voor het laatst contact is geweest. Handmatig ingevuld door admin. */
  last_contacted_at?: string | null;
  /** Naam of initialen van wie deze opvolgt. */
  handled_by?: string | null;
  /** Conceptonderwerp voor het antwoord (kopieerbaar naar eigen mailclient). */
  reply_subject?: string | null;
  /** Conceptantwoord — wordt nooit automatisch verstuurd. */
  reply_draft?: string | null;
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

// ─── donation_campaigns ──────────────────────────────────────
export interface DonationCampaign {
  id: number;
  status: "draft" | "published" | "archived";
  title: string;
  slug: string;
  description?: string | null;
  image?: string | DirectusFile | null;
  /** Doelbedrag in eurocenten */
  goal_amount?: number | null;
  /** Leesbare weergave, bv. "€5.000" */
  goal_amount_display?: string | null;
  allow_one_time: boolean;
  allow_monthly: boolean;
  /** JSON array met euro-bedragen, bv. [5, 10, 25, 50, 100] */
  suggested_amounts?: number[] | null;
  /** Voorgeselecteerd bedrag in EURO'S */
  default_amount?: number | null;
  featured: boolean;
  sort?: number | null;
  created_at?: string | null;
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
  /** Bedrag in eurocenten — altijd integer. Bewaard voor exact overeenkomen met Stripe. */
  amount: number;
  /** Leesbare weergave, bv. "€25,00". Wordt automatisch ingevuld bij aanmaken/updaten. */
  amount_display?: string | null;
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
  /** M2O naar donation_campaigns.id — null bij algemene donatie */
  campaign?: number | null;
  /** Slug van de campagne ten tijde van donatie (historisch correct) */
  campaign_slug?: string | null;
  /** Titel van de campagne ten tijde van donatie. "Algemene donatie" bij geen campagne. */
  campaign_title?: string | null;
}

// ─── articles ────────────────────────────────────────────────
export interface Article {
  id: number;
  status: "draft" | "published" | "archived";
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  image?: string | DirectusFile | null;
  author_name?: string | null;
  category?: string | null;
  /** CSV string ("ramadan,gemeenschap"). Eenvoudig en toegankelijk. */
  tags?: string | null;
  published_at?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  featured: boolean;
  sort?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ─── videos ──────────────────────────────────────────────────
export interface Video {
  id: number;
  status: "draft" | "published" | "archived";
  title: string;
  description?: string | null;
  youtube_url: string;
  sort?: number | null;
  featured: boolean;
  published_at?: string | null;
  created_at?: string | null;
}

// ─── contact_messages ────────────────────────────────────────
export type ContactMessageStatus = "new" | "read" | "replied" | "archived";

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  /** Interne notitie voor opvolging — niet zichtbaar voor de afzender. */
  internal_notes?: string | null;
  /** Wanneer er voor het laatst contact is geweest. Handmatig ingevuld door admin. */
  last_contacted_at?: string | null;
  /** Naam of initialen van wie deze opvolgt. */
  handled_by?: string | null;
  /** Conceptonderwerp voor het antwoord (kopieerbaar naar eigen mailclient). */
  reply_subject?: string | null;
  /** Conceptantwoord — wordt nooit automatisch verstuurd. */
  reply_draft?: string | null;
  created_at?: string | null;
}

// ─── tv_announcements ────────────────────────────────────────
/**
 * Items die roteren op /gebedstijden/tv onder de gebedstijden.
 * Volledig handmatig beheerd door de admin in Directus — er is geen
 * automatische import en geen externe hadith-API.
 */
export type TvAnnouncementType =
  | "announcement"
  | "hadith"
  | "reminder"
  | "event"
  | "donation";

export interface TvAnnouncement {
  id: number;
  status: "draft" | "published" | "archived";
  type: TvAnnouncementType;
  title: string;
  body?: string | null;
  arabic_text?: string | null;
  translation?: string | null;
  source?: string | null;
  reference?: string | null;
  grade?: string | null;
  display_from?: string | null;
  display_until?: string | null;
  active: boolean;
  show_on_tv: boolean;
  sort?: number | null;
  created_at?: string | null;
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
  donation_campaigns: DonationCampaign[];
  articles: Article[];
  videos: Video[];
  contact_messages: ContactMessage[];
  tv_announcements: TvAnnouncement[];
}
