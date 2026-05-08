// scripts/seed/steps/21-tv-announcements.mjs
//
// Maakt de `tv_announcements` collectie aan. Wordt getoond op /gebedstijden/tv,
// roterend onder de gebedstijden. Beheer is volledig handmatig — admin maakt
// zelf items aan via Directus.
//
// Public read voor status=published wordt door 02-permissions geregeld
// (zie COLLECTIONS-array daar). Verdere zichtbaarheidsfilter (active,
// show_on_tv, display_from/until) gebeurt server-side in lib/directus.ts.
//
// BEWUST géén automatische religieuze content / hadith API. De ene
// soft-create draft hieronder dient puur als template-voorbeeld voor de
// admin — wordt nooit overschreven en is niet gepubliceerd.

import { ensureCollection, ensureField, softCreateItem } from "../lib/helpers.mjs";

export async function setupTvAnnouncements(client) {
  console.log("\n📺 Stap 21 · tv_announcements collectie");

  await ensureCollection(client, {
    collection: "tv_announcements",
    meta: {
      icon:             "campaign",
      note:
        "Mededelingen, ahadith en reminders die roteren op /gebedstijden/tv. " +
        "Beheer handmatig — er is geen automatische import. Bron + grade altijd zelf invullen.",
      display_template: "{{title}} ({{type}})",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
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
    schema: { default_value: "draft", is_nullable: false },
  });

  await ensureField(client, "tv_announcements", {
    field: "type",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      required:  true,
      options: {
        choices: [
          { text: "Mededeling",   value: "announcement" },
          { text: "Hadith",        value: "hadith"       },
          { text: "Reminder",      value: "reminder"     },
          { text: "Evenement",     value: "event"        },
          { text: "Donatie-oproep", value: "donation"    },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "Mededeling",    value: "announcement", foreground: "#FFFFFF", background: "#3A6F8F" },
          { text: "Hadith",         value: "hadith",       foreground: "#FFFFFF", background: "#7E5A3A" },
          { text: "Reminder",       value: "reminder",     foreground: "#18222F", background: "#E0C77A" },
          { text: "Evenement",      value: "event",        foreground: "#FFFFFF", background: "#2ECDA7" },
          { text: "Donatie-oproep", value: "donation",     foreground: "#FFFFFF", background: "#A2B5CD" },
        ],
      },
      note:
        "Type bepaalt subtiele visuele variatie op het tv-scherm. " +
        "Voor 'hadith' wordt extra ruimte gemaakt voor bron/referentie/grade.",
    },
    schema: { default_value: "announcement", is_nullable: false },
  });

  await ensureField(client, "tv_announcements", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "tv_announcements", {
    field: "body",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-multiline",
      note:      "Korte tekst die op het tv-scherm verschijnt. Houd het beknopt — leesbaarheid op afstand.",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
    field: "arabic_text",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-multiline",
      note:      "Optionele Arabische tekst (bv. de oorspronkelijke hadith-tekst).",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
    field: "translation",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-multiline",
      note:      "Optionele Nederlandse vertaling — wordt onder de Arabische tekst getoond.",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
    field: "source",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Bv. 'Sahieh al-Boekhari' of 'Riyad as-Salihien'. Verplicht bij hadith.",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
    field: "reference",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Hadith-nummer of referentie, bv. '6018' of 'boek 2, nr. 13'.",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
    field: "grade",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Hadith-status, bv. 'Sahieh', 'Hasan' of 'Mutawatir'.",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
    field: "display_from",
    type:  "timestamp",
    meta:  {
      width:     "half",
      interface: "datetime",
      note:      "Optioneel — toon vanaf dit moment. Leeg = direct.",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
    field: "display_until",
    type:  "timestamp",
    meta:  {
      width:     "half",
      interface: "datetime",
      note:      "Optioneel — verberg na dit moment. Leeg = onbeperkt.",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
    field: "active",
    type:  "boolean",
    meta:  {
      width:     "half",
      interface: "boolean",
      note:      "Snelle aan/uit-schakelaar zonder de status te hoeven wijzigen.",
    },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "tv_announcements", {
    field: "show_on_tv",
    type:  "boolean",
    meta:  {
      width:     "half",
      interface: "boolean",
      note:      "Aparte vlag — handig als deze collectie later ook elders ingezet wordt.",
    },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "tv_announcements", {
    field: "sort",
    type:  "integer",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Lager getal verschijnt eerst in de rotatie.",
    },
    schema: {},
  });

  await ensureField(client, "tv_announcements", {
    field: "created_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-created"] },
    schema:{},
  });

  // ─── Eén draft template-voorbeeld ─────────────────────────────
  // BEWUST status=draft en niet published — admin kiest zelf wat live gaat.
  // softCreateItem zorgt dat het voorbeeld nooit handmatige edits overschrijft.
  await softCreateItem(client, "tv_announcements", "title", "Voorbeeld — pas aan en publiceer", {
    status:     "draft",
    type:       "announcement",
    body:
      "Dit is een voorbeelditem. Pas de tekst aan, kies een type en zet de status op 'Gepubliceerd' " +
      "om de mededeling op het tv-scherm te tonen.",
    active:     true,
    show_on_tv: true,
    sort:       0,
  });

  console.log("✓ Stap 21 voltooid");
}
