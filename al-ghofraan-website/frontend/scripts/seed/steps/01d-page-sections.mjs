// scripts/seed/steps/01d-page-sections.mjs
// Maakt page_sections + page_section_items collecties + velden aan.
// Volledig idempotent.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

export async function setupPageSections(client) {
  console.log("\n🧱 Stap 1d · page_sections + page_section_items collecties");

  // ─── page_sections ────────────────────────────────────────
  await ensureCollection(client, {
    collection: "page_sections",
    meta: {
      icon:             "view_carousel",
      note:             "Herbruikbare contentblokken per pagina. Gebruikt op home, dawahcommissie, doneren, etc.",
      display_template: "{{label}} ({{page_slug}} → {{key}})",
      sort_field:       "sort",
      archive_field:    "active",
      archive_value:    false,
      unarchive_value:  true,
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "page_slug",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      required:  true,
      note:      "Slug van de pagina waarop deze sectie verschijnt. Bv. 'home', 'dawahcommissie', 'doneren', 'gebedstijden', 'jongeren'. Moet exact overeenkomen met de URL.",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "page_sections", {
    field: "key",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      required:  true,
      note:      "Unieke key binnen de pagina, bv. 'mission' of 'what_we_do'. Geen spaties.",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "page_sections", {
    field: "type",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      required:  true,
      options: {
        choices: [
          { text: "Split feature (twee kolommen + Arabisch blok)", value: "split_feature" },
          { text: "Card grid (rooster van vakjes)",                 value: "card_grid" },
          { text: "Simple text (alleen tekst)",                    value: "simple_text" },
          { text: "CTA (oproep met knoppen)",                       value: "cta" },
        ],
      },
      display: "labels",
    },
    schema: { default_value: "card_grid", is_nullable: false },
  });

  await ensureField(client, "page_sections", {
    field: "label",
    type:  "string",
    meta:  {
      width: "half",
      interface: "input",
      note: "Interne label voor in deze admin (niet zichtbaar op de website).",
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "eyebrow_ar",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Klein Arabisch woord boven de titel (optioneel, bv. 'رسالتنا').",
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input" },
    schema:{},
  });

  await ensureField(client, "page_sections", {
    field: "intro",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "page_sections", {
    field: "icon",
    type:  "string",
    meta:  {
      width: "half",
      interface: "input",
      note: "Optioneel hoofdicoon (zie docs/ICONS.md).",
    },
    schema:{},
  });

  // Velden specifiek voor split_feature
  await ensureField(client, "page_sections", {
    field: "card_title_ar",
    type:  "string",
    meta:  {
      width: "half",
      interface: "input",
      note: "Voor 'split_feature': Arabisch woord op de illustratie-kaart (bv. 'الدعوة').",
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "card_subtitle",
    type:  "string",
    meta:  {
      width: "full",
      interface: "input",
      note: "Voor 'split_feature': korte ondertitel onder het Arabische woord.",
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "card_tags",
    type:  "json",
    meta: {
      width:     "full",
      interface: "tags",
      options:   { presets: [] },
      note:      "Voor 'split_feature': lijst van Arabische tag-woorden (bv. ['الإيمان','العلم','العمل']).",
    },
    schema: {},
  });

  // Velden specifiek voor cta type
  await ensureField(client, "page_sections", {
    field: "primary_cta_label",
    type:  "string",
    meta:  { width: "half", interface: "input", note: "Voor 'cta': tekst van de hoofdknop." },
    schema:{},
  });
  await ensureField(client, "page_sections", {
    field: "primary_cta_href",
    type:  "string",
    meta:  { width: "half", interface: "input", note: "Voor 'cta': URL van de hoofdknop." },
    schema:{},
  });
  await ensureField(client, "page_sections", {
    field: "secondary_cta_label",
    type:  "string",
    meta:  { width: "half", interface: "input", note: "Voor 'cta': tekst van de tweede knop." },
    schema:{},
  });
  await ensureField(client, "page_sections", {
    field: "secondary_cta_href",
    type:  "string",
    meta:  { width: "half", interface: "input", note: "Voor 'cta': URL van de tweede knop." },
    schema:{},
  });

  await ensureField(client, "page_sections", {
    field: "active",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean" },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "page_sections", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  // ─── page_section_items ───────────────────────────────────
  await ensureCollection(client, {
    collection: "page_section_items",
    meta: {
      icon:             "view_module",
      note:             "Items binnen een page_sections sectie (de vakjes/punten).",
      display_template: "{{title}} ({{page_slug}} → {{section_key}})",
      sort_field:       "sort",
      archive_field:    "active",
      archive_value:    false,
      unarchive_value:  true,
    },
    schema: {},
  });

  await ensureField(client, "page_section_items", {
    field: "page_slug",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      required:  true,
      note:      "Slug van de pagina. Moet exact gelijk zijn aan de page_slug van de sectie waarbij dit item hoort.",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "page_section_items", {
    field: "section_key",
    type:  "string",
    meta: {
      width: "half",
      interface: "input",
      required: true,
      note: "Moet gelijk zijn aan de 'key' van de sectie waar dit item bij hoort.",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "page_section_items", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input" },
    schema:{},
  });

  await ensureField(client, "page_section_items", {
    field: "description",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "page_section_items", {
    field: "icon",
    type:  "string",
    meta:  {
      width: "half",
      interface: "input",
      note: "Icoon-naam uit de toegestane lijst (zie docs/ICONS.md).",
    },
    schema: {},
  });

  await ensureField(client, "page_section_items", {
    field: "href",
    type:  "string",
    meta:  {
      width: "half",
      interface: "input",
      note: "Optionele link — als ingevuld wordt het hele vakje klikbaar.",
    },
    schema: {},
  });

  await ensureField(client, "page_section_items", {
    field: "active",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean" },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "page_section_items", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  console.log("✓ Stap 1d voltooid");
}
