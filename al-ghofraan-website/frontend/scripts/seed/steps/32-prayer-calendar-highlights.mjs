// scripts/seed/steps/32-prayer-calendar-highlights.mjs
//
// Delivery 21 — Kalender-highlights voor de gebedstijden-pagina's.
//
// Admin kan datums markeren (Eid, Ramadan, Laylatul Qadr, eigen events)
// die als gekleurde badge verschijnen op /gebedstijden en
// /gebedstijden/overzicht in zowel de Nederlandse als de Islamitische
// kalender. Match gaat op `gregorian_date` (ISO YYYY-MM-DD).
//
// Wat deze stap doet (alles idempotent):
//   1. `prayer_calendar_highlights` collectie aanmaken volgens hetzelfde
//      patroon als articles/vacancies (status, sort, archive_field).
//   2. 11 velden toevoegen: status, gregorian_date, title, description,
//      type, color, icon, show_on_calendar, show_on_tv, sort, created_at.
//   3. Twee voorbeeld-highlights als `status=draft` (soft-create op een
//      stabiele dummy-slug-achtige sleutel — via `gregorian_date` waarop
//      we filteren). Bestaande records worden NIET overschreven.
//
// Hard rules respecteert:
//   - `show_on_tv` is alvast gereserveerd voor latere TV-uitbreiding maar
//     wordt door de frontend NIET gelezen in deze delivery.
//   - Hijri-overrides blijven ongemoeid (geen Hijri-velden hier).
//   - Voorbeeld-records zijn `draft` → niet publiek zichtbaar.
//   - Tweede `npm run seed` = no-op voor alle records.

import { ensureCollection, ensureField, softCreateItem } from "../lib/helpers.mjs";

// ─── Voorbeeld-highlights (draft, soft-create) ─────────────────────
//
// We kiezen voor twee duidelijke draft-voorbeelden zodat admin meteen
// ziet hoe het werkt. Status=draft = niet publiek zichtbaar. Admin moet
// ze handmatig aanpassen + op published zetten voor productie.
//
// Soft-create-sleutel: `gregorian_date` (geen aparte slug). Wanneer admin
// een eigen highlight maakt voor dezelfde datum wordt die niet ontdubbeld
// — meerdere highlights per dag is een feature.

const EXAMPLE_HIGHLIGHTS = [
  {
    status:           "draft",
    gregorian_date:   "2026-03-20",
    title:            "Start Ramadan (voorbeeld)",
    description:
      "Voorbeeld-highlight. Pas de datum/titel aan en zet op 'published' om te tonen.",
    type:             "ramadan",
    show_on_calendar: true,
    show_on_tv:       false,
    sort:             0,
  },
  {
    status:           "draft",
    gregorian_date:   "2026-04-20",
    title:            "Eid al-Fitr (voorbeeld)",
    description:
      "Voorbeeld-highlight. Pas de datum/titel aan en zet op 'published' om te tonen.",
    type:             "eid",
    show_on_calendar: true,
    show_on_tv:       false,
    sort:             0,
  },
];

export async function setupPrayerCalendarHighlights(client) {
  console.log("\n🌙 Stap 32 · Kalender-highlights voor gebedstijden");

  // ─── 1. Collectie ────────────────────────────────────────────────
  await ensureCollection(client, {
    collection: "prayer_calendar_highlights",
    meta: {
      icon:             "event",
      note:             "Datums die visueel gemarkeerd worden in de gebedstijden-kalender (Eid, Ramadan, eigen events).",
      display_template: "{{title}} ({{gregorian_date}})",
      sort_field:       "gregorian_date",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  // ─── 2. Velden ──────────────────────────────────────────────────

  // status — color-coded labels, identiek patroon als articles/vacancies
  await ensureField(client, "prayer_calendar_highlights", {
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

  // gregorian_date — match-key (date-only, geen tijd)
  await ensureField(client, "prayer_calendar_highlights", {
    field: "gregorian_date",
    type:  "date",
    meta: {
      width:     "half",
      interface: "datetime",
      required:  true,
      note:
        "De gregoriaanse datum waarop deze highlight verschijnt. Match in beide " +
        "kalenders (Nederlandse + Islamitische tabel).",
    },
    schema: { is_nullable: false },
  });

  // type — bepaalt default kleur/icoon in frontend
  await ensureField(client, "prayer_calendar_highlights", {
    field: "type",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Eid",             value: "eid"     },
          { text: "Ramadan",         value: "ramadan" },
          { text: "Bijzondere dag",  value: "special" },
          { text: "Event",           value: "event"   },
          { text: "Notitie",         value: "note"    },
        ],
      },
      note:
        "Bepaalt het standaard icoon en kleur van de badge. Gebruik 'Notitie' " +
        "voor neutrale aankondigingen.",
    },
    schema: { default_value: "event", is_nullable: false },
  });

  // title — badge-tekst
  await ensureField(client, "prayer_calendar_highlights", {
    field: "title",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      required:  true,
      note:      "Korte tekst die in de badge verschijnt, bv. 'Eid al-Fitr' of 'Ramadan'.",
    },
    schema: { is_nullable: false },
  });

  // description — tooltip op de badge
  await ensureField(client, "prayer_calendar_highlights", {
    field: "description",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:
        "Optionele toelichting. Verschijnt als tooltip wanneer bezoeker " +
        "over de badge zweeft (niet zichtbaar in de tabel zelf).",
    },
    schema: {},
  });

  // color — optionele HEX-override (advanced)
  await ensureField(client, "prayer_calendar_highlights", {
    field: "color",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:
        "ADVANCED — optionele HEX-kleur (#RRGGBB) die de standaard type-kleur " +
        "overschrijft. Leeg laten = type-kleur gebruiken. Ongeldige waarden " +
        "vallen veilig terug op de type-kleur.",
    },
    schema: {},
  });

  // icon — optionele lucide-icoon override (advanced, whitelist)
  await ensureField(client, "prayer_calendar_highlights", {
    field: "icon",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Standaard (gebruik type-icoon)", value: "" },
          { text: "Sparkles", value: "sparkles" },
          { text: "Moon",     value: "moon"     },
          { text: "Star",     value: "star"     },
          { text: "Calendar", value: "calendar" },
          { text: "Info",     value: "info"     },
          { text: "Sun",      value: "sun"      },
          { text: "Heart",    value: "heart"    },
          { text: "Flag",     value: "flag"     },
          { text: "Party Popper", value: "party-popper" },
        ],
        allowOther: false,
      },
      note:
        "ADVANCED — overschrijft het standaard icoon van het gekozen type. " +
        "Leeg laten = type-icoon gebruiken.",
    },
    schema: {},
  });

  // show_on_calendar — zichtbaarheid in tabel
  await ensureField(client, "prayer_calendar_highlights", {
    field: "show_on_calendar",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      options:   { label: "Tonen in de gebedstijden-kalender" },
      special:   ["cast-boolean"],
      note:
        "Aan: highlight verschijnt in /gebedstijden en /gebedstijden/overzicht. " +
        "Uit: highlight blijft verborgen op de website (maar blijft in admin).",
    },
    schema: { default_value: true },
  });

  // show_on_tv — gereserveerd voor latere TV-uitbreiding
  await ensureField(client, "prayer_calendar_highlights", {
    field: "show_on_tv",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      options:   { label: "Tonen op TV-scherm (gereserveerd)" },
      special:   ["cast-boolean"],
      note:
        "Gereserveerd voor toekomstige TV-display uitbreiding. " +
        "Wordt momenteel NIET door het TV-scherm gelezen.",
    },
    schema: { default_value: false },
  });

  // sort — ordening bij meerdere highlights op één dag
  await ensureField(client, "prayer_calendar_highlights", {
    field: "sort",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Volgorde wanneer er meerdere highlights op dezelfde dag zijn (laag → eerst).",
    },
    schema: { default_value: 0 },
  });

  // created_at — automatisch gevuld door Directus
  await ensureField(client, "prayer_calendar_highlights", {
    field: "created_at",
    type:  "timestamp",
    meta: {
      width:     "half",
      interface: "datetime",
      readonly:  true,
      special:   ["date-created"],
      hidden:    false,
    },
    schema: {},
  });

  // ─── 3. Voorbeeld-highlights ─────────────────────────────────────
  for (const example of EXAMPLE_HIGHLIGHTS) {
    const { gregorian_date: filterValue, ...rest } = example;
    await softCreateItem(
      client,
      "prayer_calendar_highlights",
      "gregorian_date",
      filterValue,
      rest,
    );
  }

  console.log("✓ Stap 32 voltooid");
}
