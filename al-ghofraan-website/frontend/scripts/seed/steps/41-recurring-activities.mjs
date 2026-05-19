// scripts/seed/steps/41-recurring-activities.mjs
//
// Delivery — terugkerende activiteiten + agenda-overzichtspagina.
//
// Voegt twee groepen velden toe (allemaal idempotent):
//
//   A) Op `activities` (5 velden, beheerder vult ze per activiteit):
//      - is_recurring         (boolean, default false)
//      - recurrence_type      (string, dropdown: none|weekly|monthly)
//      - recurrence_interval  (integer, 1 = elke periode, 2 = elke 2)
//      - recurrence_until     (date, eindstreep voor occurrence-generatie)
//      - recurrence_weekday   (string, dropdown: monday..sunday)
//
//   B) Op `registrations` (3 velden, automatisch gevuld door /api/inschrijven):
//      - occurrence_start (timestamp, null = niet-recurring inschrijving)
//      - occurrence_end   (timestamp, null = niet-recurring)
//      - occurrence_label (string, mensleesbaar, null = niet-recurring)
//
// Backward compatibility:
//   - Bestaande activiteiten krijgen is_recurring=false → frontend behandelt
//     ze ongewijzigd. Geen migratie van bestaande data.
//   - Bestaande registrations blijven NULL voor occurrence_*. De
//     admin-mail en visitor-mail tonen occurrence-info alleen als gevuld.
//   - QR-check-in werkt op check_in_token, raakt deze velden niet.
//
// MVP-regels (uit scope):
//   - Eén activity-record blijft het hoofdrecord; geen losse records per
//     occurrence. Frontend genereert toekomstige occurrences via
//     lib/recurrence.ts.
//   - max_registrations geldt PER OCCURRENCE (server-side telling filtert
//     op source_id + occurrence_start).

import { ensureField } from "../lib/helpers.mjs";

const WEEKDAY_CHOICES = [
  { text: "Maandag",   value: "monday"    },
  { text: "Dinsdag",   value: "tuesday"   },
  { text: "Woensdag",  value: "wednesday" },
  { text: "Donderdag", value: "thursday"  },
  { text: "Vrijdag",   value: "friday"    },
  { text: "Zaterdag",  value: "saturday"  },
  { text: "Zondag",    value: "sunday"    },
];

const RECURRENCE_TYPE_CHOICES = [
  { text: "Geen (eenmalig)",  value: "none"    },
  { text: "Wekelijks",        value: "weekly"  },
  { text: "Maandelijks",      value: "monthly" },
];

export async function setupRecurringActivities(client) {
  console.log("\n🔁 Stap 41 · terugkerende activiteiten + occurrence-velden op registrations");

  // ─── A) Recurring-velden op activities ─────────────────────

  await ensureField(client, "activities", {
    field: "is_recurring",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:      "Markeer als terugkerend (wekelijks/maandelijks). Bij true zijn de overige recurrence_* velden van toepassing.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, "activities", {
    field: "recurrence_type",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      options:   { choices: RECURRENCE_TYPE_CHOICES },
      note:      "Alleen relevant als is_recurring=true. 'weekly' of 'monthly'.",
    },
    schema: { default_value: "none" },
  });

  await ensureField(client, "activities", {
    field: "recurrence_interval",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Alleen relevant als is_recurring=true. 1 = elke periode, 2 = elke 2 periodes (bv. om de week). Default 1.",
    },
    schema: { default_value: 1 },
  });

  await ensureField(client, "activities", {
    field: "recurrence_until",
    type:  "date",
    meta: {
      width:     "half",
      interface: "datetime",
      note:      "Tot wanneer de serie loopt. Verplicht voor terugkerende activiteiten — anders gebruikt de frontend een fallback van 6 maanden vooruit. Maximaal 50 occurrences worden gegenereerd.",
    },
    schema: {},
  });

  await ensureField(client, "activities", {
    field: "recurrence_weekday",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      options:   { choices: WEEKDAY_CHOICES },
      note:      "Alleen relevant bij wekelijks. Standaard wordt de weekdag van start_date gebruikt; vul alleen in als die afwijkt.",
    },
    schema: {},
  });

  // ─── B) Occurrence-velden op registrations ─────────────────

  await ensureField(client, "registrations", {
    field: "occurrence_start",
    type:  "timestamp",
    meta: {
      width:     "half",
      interface: "datetime",
      readonly:  true,
      note:      "Automatisch gevuld bij inschrijving voor een terugkerende activiteit. NULL voor eenmalige activiteiten.",
    },
    schema: {},
  });

  await ensureField(client, "registrations", {
    field: "occurrence_end",
    type:  "timestamp",
    meta: {
      width:     "half",
      interface: "datetime",
      readonly:  true,
      note:      "Automatisch gevuld bij inschrijving voor een terugkerende activiteit. NULL voor eenmalige activiteiten.",
    },
    schema: {},
  });

  await ensureField(client, "registrations", {
    field: "occurrence_label",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      readonly:  true,
      note:      "Mensleesbaar label van de gekozen occurrence (bv. 'Vrijdag 22 mei 2026 — 19:00'). NULL voor eenmalige activiteiten.",
    },
    schema: {},
  });

  console.log("✓ Stap 41 voltooid");
}
