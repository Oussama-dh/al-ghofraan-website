// scripts/seed/steps/22-contact-subjects.mjs
//
// Maakt de `contact_subjects` collectie aan + 6 standaard onderwerpen
// (soft-create, dus alleen aanmaken als ze niet al bestaan op slug).
//
// Public read voor status=published wordt door 02-permissions geregeld.
// Admin schrijft, Public leest. Idempotent.

import { ensureCollection, ensureField, softCreateItem } from "../lib/helpers.mjs";

export async function setupContactSubjects(client) {
  console.log("\n📨 Stap 22 · contact_subjects collectie");

  await ensureCollection(client, {
    collection: "contact_subjects",
    meta: {
      icon:             "label",
      note:
        "Onderwerpen voor het contactformulier op /contact. " +
        "Alleen 'Gepubliceerd' + 'Actief' onderwerpen verschijnen in de dropdown. " +
        "Sorteer op `sort` (lager = eerder).",
      display_template: "{{label}} ({{status}})",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, "contact_subjects", {
    field: "status",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Gepubliceerd", value: "published" },
          { text: "Concept",      value: "draft"     },
          { text: "Gearchiveerd", value: "archived"  },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "Gepubliceerd", value: "published", foreground: "#FFFFFF", background: "#2ECDA7" },
          { text: "Concept",      value: "draft",     foreground: "#18222F", background: "#D3DAE4" },
          { text: "Gearchiveerd", value: "archived",  foreground: "#FFFFFF", background: "#A2B5CD" },
        ],
      },
    },
    schema: { default_value: "published", is_nullable: false },
  });

  await ensureField(client, "contact_subjects", {
    field: "label",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      required:  true,
      note:      "Wat de bezoeker ziet in de dropdown, bv. 'Onderwijs'.",
    },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "contact_subjects", {
    field: "value",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      required:  true,
      note:
        "Wat in `contact_messages.subject` wordt opgeslagen. " +
        "Meestal hetzelfde als de label, of een korte slug. Moet uniek zijn.",
    },
    schema:{ is_nullable: false, is_unique: true },
  });

  await ensureField(client, "contact_subjects", {
    field: "description",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-multiline",
      note:      "Optionele toelichting (alleen voor admin, niet zichtbaar op /contact).",
    },
    schema:{},
  });

  await ensureField(client, "contact_subjects", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input", note: "Lager = eerder in de lijst." },
    schema:{},
  });

  await ensureField(client, "contact_subjects", {
    field: "active",
    type:  "boolean",
    meta:  {
      width:     "half",
      interface: "boolean",
      note:      "Snel uit te zetten zonder de status te wijzigen.",
    },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "contact_subjects", {
    field: "created_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-created"] },
    schema:{},
  });

  // ─── Soft-create defaults ──────────────────────────────────
  // Worden alleen aangemaakt als nog niet aanwezig (op `value`).
  // Bestaande edits door admin blijven zo intact.
  const DEFAULTS = [
    { label: "Algemeen",          value: "algemeen",          sort: 10  },
    { label: "Onderwijs",         value: "onderwijs",         sort: 20  },
    { label: "Donaties",          value: "donaties",          sort: 30  },
    { label: "Activiteiten",      value: "activiteiten",      sort: 40  },
    { label: "Gebedstijden",      value: "gebedstijden",      sort: 50  },
    { label: "Technisch probleem", value: "technisch-probleem", sort: 60 },
  ];

  for (const item of DEFAULTS) {
    await softCreateItem(client, "contact_subjects", "value", item.value, {
      ...item,
      status:  "published",
      active:  true,
    });
  }

  console.log("✓ Stap 22 voltooid");
}
