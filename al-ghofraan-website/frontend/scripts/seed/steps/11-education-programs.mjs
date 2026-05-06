// scripts/seed/steps/11-education-programs.mjs
// Maakt de education_programs collectie + velden aan (idempotent).
// Voegt ook een paar voorbeeldprogramma's toe als ze nog niet bestaan
// (allemaal status: draft zodat redacteur ze bewust live zet).

import { ensureCollection, ensureField, upsertItem } from "../lib/helpers.mjs";

export async function setupEducationPrograms(client) {
  console.log("\n🎓 Stap 11 · education_programs collectie + voorbeelden");

  // ─── Collectie ────────────────────────────────────────────
  await ensureCollection(client, {
    collection: "education_programs",
    meta: {
      icon:             "school",
      note:             "Lessen, cursussen en studiekringen — verschijnen op /onderwijs",
      display_template: "{{title}}",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  // ─── Velden ───────────────────────────────────────────────
  await ensureField(client, "education_programs", {
    field: "status",
    type:  "string",
    meta: {
      width:     "full",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Gepubliceerd", value: "published" },
          { text: "Concept",       value: "draft"     },
          { text: "Gearchiveerd",  value: "archived"  },
        ],
      },
      display: "labels",
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

  await ensureField(client, "education_programs", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "education_programs", {
    field: "slug",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      options:   { slug: true, trim: true },
      special:   ["slug"],
      required:  true,
      note:      "URL-segment, automatisch uit titel. Wordt: /onderwijs/<slug>",
    },
    schema:{ is_nullable: false, is_unique: true },
  });

  await ensureField(client, "education_programs", {
    field: "description",
    type:  "text",
    meta:  { width: "full", interface: "input-rich-text-html" },
    schema:{},
  });

  await ensureField(client, "education_programs", {
    field: "teacher",
    type:  "string",
    meta:  { width: "half", interface: "input", note: "Naam van de docent" },
    schema:{},
  });

  await ensureField(client, "education_programs", {
    field: "target_group",
    type:  "string",
    meta:  { width: "half", interface: "input", note: "Bv. 'Jongeren 12-18', 'Vrouwen', 'Beginners'" },
    schema:{},
  });

  await ensureField(client, "education_programs", {
    field: "schedule",
    type:  "string",
    meta:  { width: "full", interface: "input", note: "Bv. 'Elke zaterdag 14:00-15:30'" },
    schema:{},
  });

  await ensureField(client, "education_programs", {
    field: "location",
    type:  "string",
    meta:  { width: "full", interface: "input" },
    schema:{},
  });

  await ensureField(client, "education_programs", {
    field: "start_date",
    type:  "date",
    meta:  { width: "half", interface: "datetime" },
    schema:{},
  });

  await ensureField(client, "education_programs", {
    field: "end_date",
    type:  "date",
    meta:  { width: "half", interface: "datetime" },
    schema:{},
  });

  await ensureField(client, "education_programs", {
    field: "image",
    type:  "uuid",
    meta:  { width: "full", interface: "file-image", special: ["file"] },
    schema:{ foreign_key_table: "directus_files" },
  });

  await ensureField(client, "education_programs", {
    field: "registration_enabled",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Toon inschrijfformulier op detailpagina" },
    schema:{ default_value: false, is_nullable: false },
  });

  await ensureField(client, "education_programs", {
    field: "max_participants",
    type:  "integer",
    meta:  { width: "half", interface: "input", note: "Optioneel — informatief, niet automatisch afgedwongen" },
    schema:{},
  });

  await ensureField(client, "education_programs", {
    field: "sort",
    type:  "integer",
    meta:  { width: "full", interface: "input", note: "Lager getal = bovenaan op /onderwijs" },
    schema:{},
  });

  // ─── Voorbeeld-items (allemaal draft) ─────────────────────
  const examples = [
    {
      slug:        "quraan-recitatie-beginners",
      title:       "Qur'aan-recitatie voor beginners",
      description:
        "<p>Een toegankelijke cursus waarin we de basis van Tajweed leren — " +
        "uitspraak van letters, tekens en de regels voor een correcte recitatie. " +
        "Geschikt voor wie net begint of zijn fundament wil verstevigen.</p>",
      teacher:              "Sheikh Yusuf",
      target_group:         "Beginners (vanaf 16 jaar)",
      schedule:             "Elke zaterdag 14:00–15:30",
      location:             "Moskee Al-Ghofraan, leslokaal 1",
      status:               "draft",
      registration_enabled: false,
      sort:                 10,
    },
    {
      slug:        "fiqh-vrouwen",
      title:       "Fiqh-cursus voor vrouwen",
      description:
        "<p>Praktische uitleg van de wetgeving rondom gebed, reinheid en vasten — " +
        "specifiek toegespitst op de vragen waar vrouwen mee te maken hebben.</p>",
      teacher:              "Zr. Aisha",
      target_group:         "Vrouwen",
      schedule:             "Elke woensdag 19:30–21:00",
      location:             "Moskee Al-Ghofraan, vrouwenruimte",
      status:               "draft",
      registration_enabled: false,
      sort:                 20,
    },
  ];

  for (const program of examples) {
    await upsertItem(client, "education_programs", "slug", program.slug, program);
  }

  console.log("✓ Stap 11 voltooid (voorbeelden staan op 'draft' — activeer in Directus om live te zetten)");
}
