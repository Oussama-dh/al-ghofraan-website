// scripts/seed/steps/01c-cms-fields.mjs
// Voegt nieuwe velden toe aan site_settings en navigation_items.
// Idempotent — ensureField slaat over als veld al bestaat.

import { ensureField } from "../lib/helpers.mjs";

export async function setupCmsFields(client) {
  console.log("\n🛠️  Stap 1c · Extra CMS-velden");

  // ─── site_settings: favicon, og_image, footer-tekst, SEO ──
  await ensureField(client, "site_settings", {
    field: "favicon",
    type:  "uuid",
    meta: {
      width:     "half",
      interface: "file-image",
      special:   ["file"],
      note:      "Favicon (.ico, .png of .svg). Aanbevolen: 32×32 of 64×64.",
    },
    schema: { foreign_key_table: "directus_files" },
  });

  await ensureField(client, "site_settings", {
    field: "og_image",
    type:  "uuid",
    meta: {
      width:     "half",
      interface: "file-image",
      special:   ["file"],
      note:      "Social-sharing afbeelding (1200×630 aanbevolen).",
    },
    schema: { foreign_key_table: "directus_files" },
  });

  await ensureField(client, "site_settings", {
    field: "footer_text",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:      "Korte tekst onderaan in de footer.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "copyright_text",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:      "Copyright-regel onderin. Leeg = automatisch '© 2026 Sitenaam — DawahCommissie ...'.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "footer_enabled",
    type:  "boolean",
    meta:  {
      width:     "half",
      interface: "boolean",
      note:      "Zet uit om de hele footer te verbergen.",
    },
    schema: { default_value: true, is_nullable: false },
  });

  await ensureField(client, "site_settings", {
    field: "default_seo_title",
    type:  "string",
    meta:  {
      width: "full",
      interface: "input",
      note:  "Standaard SEO-titel als een pagina geen eigen titel heeft.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "default_seo_description",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-multiline",
      note:      "Standaard meta-description als een pagina geen eigen beschrijving heeft.",
    },
    schema: {},
  });

  // ─── navigation_items: location (header/footer/both) ──────
  await ensureField(client, "navigation_items", {
    field: "location",
    type:  "string",
    meta: {
      width: "half",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Header",         value: "header" },
          { text: "Footer",          value: "footer" },
          { text: "Header en footer", value: "both" },
        ],
      },
      note: "Waar dit menu-item moet verschijnen.",
    },
    schema: { default_value: "header" },
  });

  console.log("✓ Stap 1c voltooid");
}
