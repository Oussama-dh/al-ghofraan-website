// scripts/seed/steps/01-collections.mjs
// Maakt alle collecties en velden aan (idempotent).

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

export async function setupCollections(client) {
  console.log("\n📦 Stap 1 · Collecties + velden");

  // ─── 1. activities ────────────────────────────────────────
  await ensureCollection(client, {
    collection: "activities",
    meta: {
      icon:        "event",
      note:        "Agenda-items en activiteiten van de DawahCommissie",
      display_template: "{{title}}",
      sort_field:  "start_date",
      archive_field: "status",
      archive_value: "archived",
      unarchive_value: "draft",
    },
    schema: {},
  });

  await ensureField(client, "activities", {
    field: "status",
    type:  "string",
    meta: {
      width:        "full",
      options: {
        choices: [
          { text: "Gepubliceerd", value: "published" },
          { text: "Concept",       value: "draft"     },
          { text: "Gearchiveerd",  value: "archived"  },
        ],
      },
      interface: "select-dropdown",
      display:   "labels",
      display_options: {
        choices: [
          { text: "Gepubliceerd", value: "published", foreground: "#FFFFFF", background: "#2ECDA7" },
          { text: "Concept",       value: "draft",     foreground: "#18222F", background: "#D3DAE4" },
          { text: "Gearchiveerd",  value: "archived",  foreground: "#FFFFFF", background: "#A2B5CD" },
        ],
      },
    },
    schema: { default_value: "draft", is_nullable: false },
  });

  await ensureField(client, "activities", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "activities", {
    field: "slug",
    type:  "string",
    meta:  {
      width: "full",
      interface: "input",
      options: { slug: true, trim: true },
      special: ["slug"],
      note: "URL-segment, automatisch uit titel",
    },
    schema:{ is_nullable: false, is_unique: true },
  });

  await ensureField(client, "activities", {
    field: "description",
    type:  "text",
    meta:  { width: "full", interface: "input-rich-text-html" },
    schema:{},
  });

  await ensureField(client, "activities", {
    field: "start_date",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "activities", {
    field: "end_date",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime" },
    schema:{},
  });

  await ensureField(client, "activities", {
    field: "location",
    type:  "string",
    meta:  { width: "full", interface: "input" },
    schema:{},
  });

  await ensureField(client, "activities", {
    field: "image",
    type:  "uuid",
    meta: {
      width:     "full",
      interface: "file-image",
      special:   ["file"],
    },
    schema: {
      foreign_key_table: "directus_files",
    },
  });

  await ensureField(client, "activities", {
    field: "featured",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Toon op homepagina" },
    schema:{ default_value: false, is_nullable: false },
  });

  await ensureField(client, "activities", {
    field: "registration_enabled",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Inschrijven aan/uit (toekomstig)" },
    schema:{ default_value: false, is_nullable: false },
  });

  // ─── 2. prayer_time_files ─────────────────────────────────
  await ensureCollection(client, {
    collection: "prayer_time_files",
    meta: {
      icon:             "schedule",
      note:             "Geüploade CSV-bestanden met gebedstijden",
      display_template: "{{title}} ({{year}})",
      sort_field:       "year",
    },
    schema: {},
  });

  await ensureField(client, "prayer_time_files", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "prayer_time_files", {
    field: "file",
    type:  "uuid",
    meta:  {
      width:     "full",
      interface: "file",
      special:   ["file"],
      required:  true,
      note:      "CSV-bestand. Zie docs/CSV_GEBEDSTIJDEN.md",
    },
    schema:{ foreign_key_table: "directus_files" },
  });

  await ensureField(client, "prayer_time_files", {
    field: "year",
    type:  "integer",
    meta:  { width: "half", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "prayer_time_files", {
    field: "active",
    type:  "boolean",
    meta:  {
      width:    "half",
      interface:"boolean",
      note:     "Slechts 1 bestand mag tegelijk actief zijn",
    },
    schema:{ default_value: false, is_nullable: false },
  });

  await ensureField(client, "prayer_time_files", {
    field: "uploaded_at",
    type:  "timestamp",
    meta:  { width: "full", interface: "datetime", special: ["date-created"] },
    schema:{},
  });

  // ─── 3. site_settings (singleton) ─────────────────────────
  await ensureCollection(client, {
    collection: "site_settings",
    meta: {
      icon:      "settings",
      singleton: true,
      note:      "Algemene site-instellingen",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "site_name",
    type:  "string",
    meta:  { width: "half", interface: "input", required: true },
    schema:{ default_value: "Al-Ghofraan", is_nullable: false },
  });

  await ensureField(client, "site_settings", {
    field: "logo",
    type:  "uuid",
    meta:  { width: "half", interface: "file-image", special: ["file"] },
    schema:{ foreign_key_table: "directus_files" },
  });

  await ensureField(client, "site_settings", {
    field: "contact_email",
    type:  "string",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "site_settings", {
    field: "phone",
    type:  "string",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "site_settings", {
    field: "address",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "site_settings", {
    field: "social_links",
    type:  "json",
    meta:  {
      width:     "full",
      interface: "input-code",
      options:   { language: "json" },
      note:      'Voorbeeld: { "facebook": "...", "instagram": "..." }',
    },
    schema:{},
  });

  // ─── 4. navigation_items ──────────────────────────────────
  await ensureCollection(client, {
    collection: "navigation_items",
    meta: {
      icon:             "menu",
      note:             "Menu-items in de header",
      display_template: "{{label}} → {{href}}",
      sort_field:       "sort",
    },
    schema: {},
  });

  await ensureField(client, "navigation_items", {
    field: "label",
    type:  "string",
    meta:  { width: "half", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "navigation_items", {
    field: "href",
    type:  "string",
    meta:  { width: "half", interface: "input", required: true, note: "Bv. /agenda of https://..." },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "navigation_items", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input", hidden: false },
    schema:{},
  });

  await ensureField(client, "navigation_items", {
    field: "highlight",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Toon als CTA-knop (bv. Doneren)" },
    schema:{ default_value: false, is_nullable: false },
  });

  await ensureField(client, "navigation_items", {
    field: "external",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Open in nieuw tabblad" },
    schema:{ default_value: false, is_nullable: false },
  });

  await ensureField(client, "navigation_items", {
    field: "active",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean" },
    schema:{ default_value: true, is_nullable: false },
  });

  // ─── 5. page_content ──────────────────────────────────────
  await ensureCollection(client, {
    collection: "page_content",
    meta: {
      icon:             "article",
      note:             "Content-blokken voor pagina's (gevonden via slug)",
      display_template: "{{title}} ({{slug}})",
    },
    schema: {},
  });

  await ensureField(client, "page_content", {
    field: "slug",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      required:  true,
      note:      "Unieke key, bv. 'home', 'dawahcommissie', 'doneren'",
    },
    schema:{ is_nullable: false, is_unique: true },
  });

  await ensureField(client, "page_content", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "page_content", {
    field: "subtitle",
    type:  "string",
    meta:  { width: "full", interface: "input" },
    schema:{},
  });

  await ensureField(client, "page_content", {
    field: "intro",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "page_content", {
    field: "body",
    type:  "text",
    meta:  { width: "full", interface: "input-rich-text-html" },
    schema:{},
  });

  await ensureField(client, "page_content", {
    field: "seo_title",
    type:  "string",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "page_content", {
    field: "seo_description",
    type:  "text",
    meta:  { width: "half", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "page_content", {
    field: "status",
    type:  "string",
    meta: {
      width: "full",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Gepubliceerd", value: "published" },
          { text: "Concept",       value: "draft"     },
        ],
      },
      display: "labels",
    },
    schema:{ default_value: "draft", is_nullable: false },
  });

  // ─── 6. faq_items ────────────────────────────────────────
  await ensureCollection(client, {
    collection: "faq_items",
    meta: {
      icon:             "help",
      note:             "Veelgestelde vragen",
      display_template: "{{question}}",
      sort_field:       "sort",
    },
    schema: {},
  });

  await ensureField(client, "faq_items", {
    field: "question",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "faq_items", {
    field: "answer",
    type:  "text",
    meta:  { width: "full", interface: "input-rich-text-html", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "faq_items", {
    field: "category",
    type:  "string",
    meta:  { width: "half", interface: "input", note: "Optioneel, voor groepering" },
    schema:{},
  });

  await ensureField(client, "faq_items", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "faq_items", {
    field: "published",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean" },
    schema:{ default_value: true, is_nullable: false },
  });

  console.log("✓ Stap 1 voltooid");
}
