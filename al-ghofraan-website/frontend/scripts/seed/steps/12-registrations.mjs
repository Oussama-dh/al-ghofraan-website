// scripts/seed/steps/12-registrations.mjs
// Maakt de algemene registrations collectie aan (idempotent).
// Gebruikt voor zowel /agenda/[slug] als /onderwijs/[slug] inschrijvingen.
//
// Public mag NIETS met deze collectie — read en create permissions
// worden bewust NIET in stap 02 toegevoegd. De /api/inschrijven route
// gebruikt het admin-token (DIRECTUS_TOKEN) voor server-side writes.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

export async function setupRegistrations(client) {
  console.log("\n📝 Stap 12 · registrations collectie");

  await ensureCollection(client, {
    collection: "registrations",
    meta: {
      icon:             "how_to_reg",
      note:             "Inschrijvingen voor activiteiten en onderwijs. Beheer status via dropdown.",
      display_template: "{{name}} — {{source_title}}",
      sort_field:       "-created_at",
      archive_field:    "status",
      archive_value:    "cancelled",
      unarchive_value:  "new",
    },
    schema: {},
  });

  await ensureField(client, "registrations", {
    field: "type",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      required:  true,
      options: {
        choices: [
          { text: "Activiteit", value: "activity"  },
          { text: "Onderwijs",  value: "education" },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "Activiteit", value: "activity",  foreground: "#FFFFFF", background: "#3A6F8F" },
          { text: "Onderwijs",  value: "education", foreground: "#FFFFFF", background: "#7E5A3A" },
        ],
      },
      readonly: true,
      note: "Automatisch ingevuld door inschrijfformulier",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "registrations", {
    field: "source_collection",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      readonly:  true,
      note:      "activities of education_programs",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "registrations", {
    field: "source_id",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      readonly:  true,
      note:      "ID van het bronitem",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "registrations", {
    field: "source_slug",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      readonly:  true,
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "registrations", {
    field: "source_title",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      readonly:  true,
      note:      "Titel van de activiteit/cursus op het moment van inschrijven",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "registrations", {
    field: "name",
    type:  "string",
    meta:  { width: "half", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "registrations", {
    field: "email",
    type:  "string",
    meta:  { width: "half", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "registrations", {
    field: "phone",
    type:  "string",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "registrations", {
    field: "age",
    type:  "integer",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "registrations", {
    field: "gender",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      required:  true,
      options: {
        choices: [
          { text: "Man",   value: "male"   },
          { text: "Vrouw", value: "female" },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "Man",   value: "male",   foreground: "#FFFFFF", background: "#3A6F8F" },
          { text: "Vrouw", value: "female", foreground: "#FFFFFF", background: "#7E5A3A" },
        ],
      },
      note: "Verplicht via inschrijfformulier — alleen male/female. Oude waarden in bestaande rijen blijven intact.",
    },
    // schema bewust nullable string — anders breken oude rijen of records die zonder gender aangemaakt zijn
    schema:{},
  });

  await ensureField(client, "registrations", {
    field: "notes",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "registrations", {
    field: "status",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Nieuw",          value: "new"          },
          { text: "Gecontacteerd",  value: "contacted"    },
          { text: "Bevestigd",      value: "confirmed"    },
          { text: "Wachtlijst",     value: "waiting_list" },
          { text: "Geannuleerd",    value: "cancelled"    },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "Nieuw",         value: "new",          foreground: "#FFFFFF", background: "#3A6F8F" },
          { text: "Gecontacteerd", value: "contacted",    foreground: "#18222F", background: "#E0C77A" },
          { text: "Bevestigd",     value: "confirmed",    foreground: "#FFFFFF", background: "#2ECDA7" },
          { text: "Wachtlijst",    value: "waiting_list", foreground: "#18222F", background: "#D3DAE4" },
          { text: "Geannuleerd",   value: "cancelled",    foreground: "#FFFFFF", background: "#A2B5CD" },
        ],
      },
    },
    schema: { default_value: "new", is_nullable: false },
  });

  await ensureField(client, "registrations", {
    field: "created_at",
    type:  "timestamp",
    meta:  {
      width:     "half",
      interface: "datetime",
      readonly:  true,
      special:   ["date-created"],
    },
    schema:{},
  });

  console.log("✓ Stap 12 voltooid");
}
