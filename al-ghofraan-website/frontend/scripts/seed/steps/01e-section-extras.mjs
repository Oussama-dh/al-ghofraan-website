// scripts/seed/steps/01e-section-extras.mjs
// Voegt EXTRA velden toe aan page_sections en page_section_items.
// Idempotent — bestaande velden worden overgeslagen door ensureField.

import { ensureField } from "../lib/helpers.mjs";

export async function setupSectionExtras(client) {
  console.log("\n🛠️  Stap 1e · Extra velden voor page_sections & items");

  // ─── page_sections — extra velden ─────────────────────────

  await ensureField(client, "page_sections", {
    field: "image",
    type:  "uuid",
    meta: {
      width:     "full",
      interface: "file-image",
      special:   ["file"],
      note:      "Optionele afbeelding (split_feature gebruikt 'm in plaats van het Arabische blok).",
    },
    schema: { foreign_key_table: "directus_files" },
  });

  await ensureField(client, "page_sections", {
    field: "button_text",
    type:  "string",
    meta: {
      width: "half",
      interface: "input",
      note: "Tekst van de hoofdknop (alle types behalve cta).",
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "button_url",
    type:  "string",
    meta: {
      width: "half",
      interface: "input",
      note: "URL van de hoofdknop, bv. /agenda of https://...",
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "secondary_button_text",
    type:  "string",
    meta: {
      width: "half",
      interface: "input",
      note: "Tekst van de tweede knop (optioneel).",
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "secondary_button_url",
    type:  "string",
    meta: {
      width: "half",
      interface: "input",
      note: "URL van de tweede knop.",
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "max_items",
    type:  "integer",
    meta: {
      width: "half",
      interface: "input",
      note: "Maximaal aantal items dat getoond wordt (leeg of 0 = alle).",
    },
    schema: {},
  });

  await ensureField(client, "page_sections", {
    field: "background_variant",
    type:  "string",
    meta: {
      width: "half",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Standaard (warm beige)", value: "default" },
          { text: "Wit",                     value: "white" },
          { text: "Donker beige",            value: "sand" },
          { text: "Donkerblauw",             value: "slate-mosque" },
        ],
      },
      display: "labels",
      note: "Achtergrondkleur van de sectie.",
    },
    schema: { default_value: "default" },
  });

  // ─── page_section_items — extra velden ────────────────────

  await ensureField(client, "page_section_items", {
    field: "button_text",
    type:  "string",
    meta: {
      width: "half",
      interface: "input",
      note: "Optionele knop op het item (verschijnt onderaan het vakje).",
    },
    schema: {},
  });

  await ensureField(client, "page_section_items", {
    field: "button_url",
    type:  "string",
    meta: {
      width: "half",
      interface: "input",
      note: "URL van de item-knop. Maakt het hele vakje klikbaar.",
    },
    schema: {},
  });

  await ensureField(client, "page_section_items", {
    field: "image",
    type:  "uuid",
    meta: {
      width:     "full",
      interface: "file-image",
      special:   ["file"],
      note:      "Optionele afbeelding op het item (gebruikt in plaats van icoon in card_grid).",
    },
    schema: { foreign_key_table: "directus_files" },
  });

  console.log("✓ Stap 1e voltooid");
}
