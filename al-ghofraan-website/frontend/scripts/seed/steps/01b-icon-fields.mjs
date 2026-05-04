// scripts/seed/steps/01b-icon-fields.mjs
// Voegt het 'icon'-veld toe aan bestaande collecties + maakt de
// icon_settings collectie aan. Volledig idempotent.
//
// Wordt aangeroepen ná 01-collections.mjs en vóór 02-permissions.mjs
// in index.mjs. Bestaande velden/collecties blijven onaangeraakt.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

export async function setupIconFields(client) {
  console.log("\n🎨 Stap 1b · Icon-velden + icon_settings collectie");

  // ─── Voeg 'icon'-veld toe aan page_content ────────────────
  await ensureField(client, "page_content", {
    field: "icon",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Icoon-naam, bv. 'book-open'. Zie docs/ICONS.md voor beschikbare waarden.",
    },
    schema: {},
  });

  // ─── Voeg 'icon'-veld toe aan faq_items ───────────────────
  await ensureField(client, "faq_items", {
    field: "icon",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Icoon-naam, bv. 'help-circle'. Zie docs/ICONS.md.",
    },
    schema: {},
  });

  // ─── Maak icon_settings collectie ─────────────────────────
  await ensureCollection(client, {
    collection: "icon_settings",
    meta: {
      icon:             "category",
      note:             "Centrale instellingen voor UI-iconen. Pas hier aan welk lucide-react icoon waar gebruikt wordt.",
      display_template: "{{label}} ({{key}} → {{icon}})",
      sort_field:       "key",
    },
    schema: {},
  });

  await ensureField(client, "icon_settings", {
    field: "key",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      required:  true,
      note:      "Unieke key, bv. 'activity_date_icon'",
    },
    schema: { is_nullable: false, is_unique: true },
  });

  await ensureField(client, "icon_settings", {
    field: "icon",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      required:  true,
      note:      "Icoon-naam uit de toegestane lijst (zie docs/ICONS.md)",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "icon_settings", {
    field: "label",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:      "Vriendelijke naam voor in deze admin-UI",
    },
    schema: {},
  });

  await ensureField(client, "icon_settings", {
    field: "description",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:      "Korte uitleg waar deze setting wordt gebruikt",
    },
    schema: {},
  });

  console.log("✓ Stap 1b voltooid");
}
