// scripts/seed/steps/01l-hijri-overrides.mjs
//
// Maakt de `hijri_date_overrides` collectie aan. Beheerder kan handmatig
// een afwijkende Hijri-datum koppelen aan een gregoriaanse datum, bv. als
// Ramadan-start in NL afwijkt van de Saoedische Umm al-Qura berekening.
//
// Public read voor active=true wordt door 02-permissions geregeld.
// Idempotent — `ensureField` controleert of een veld al bestaat.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

export async function setupHijriOverrides(client) {
  console.log("\n🌙 Stap 1l · hijri_date_overrides collectie");

  await ensureCollection(client, {
    collection: "hijri_date_overrides",
    meta: {
      icon:             "calendar_month",
      note:
        "Handmatige correcties op de Umm al-Qura Hijri-kalender. " +
        "Gebruik dit alleen als de officiële berekening lokaal afwijkt " +
        "(bv. start Ramadan op basis van maanwaarneming).",
      display_template: "{{gregorian_date}} → {{hijri_day}}/{{hijri_month}}/{{hijri_year}}",
      sort_field:       "gregorian_date",
    },
    schema: {},
  });

  await ensureField(client, "hijri_date_overrides", {
    field: "gregorian_date",
    type:  "date",
    meta: {
      width:     "half",
      interface: "datetime",
      required:  true,
      note:
        "De gregoriaanse datum waarvoor je een override wilt instellen. " +
        "Eén override per dag (uniek).",
    },
    schema: { is_nullable: false, is_unique: true },
  });

  await ensureField(client, "hijri_date_overrides", {
    field: "hijri_day",
    type:  "integer",
    meta: {
      width:     "third",
      interface: "input",
      required:  true,
      note:      "Hijri-dag (1–30).",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "hijri_date_overrides", {
    field: "hijri_month",
    type:  "integer",
    meta: {
      width:     "third",
      interface: "select-dropdown",
      required:  true,
      options: {
        choices: [
          { text: "01 — Moeharram",         value: 1  },
          { text: "02 — Safar",             value: 2  },
          { text: "03 — Rabi' al-Awwal",    value: 3  },
          { text: "04 — Rabi' ath-Thaani",  value: 4  },
          { text: "05 — Joemaada al-Oela",  value: 5  },
          { text: "06 — Joemaada ath-Thaaniya", value: 6 },
          { text: "07 — Radjab",            value: 7  },
          { text: "08 — Sha'baan",          value: 8  },
          { text: "09 — Ramadan",           value: 9  },
          { text: "10 — Shawwaal",          value: 10 },
          { text: "11 — Dhul-Qi'dah",       value: 11 },
          { text: "12 — Dhul-Hijjah",       value: 12 },
        ],
      },
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "hijri_date_overrides", {
    field: "hijri_year",
    type:  "integer",
    meta: {
      width:     "third",
      interface: "input",
      required:  true,
      note:      "Hijri-jaar (bv. 1447).",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, "hijri_date_overrides", {
    field: "note",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:      "Optionele uitleg, bv. 'Start Ramadan na maanwaarneming Steenbergen'.",
    },
    schema: {},
  });

  await ensureField(client, "hijri_date_overrides", {
    field: "active",
    type:  "boolean",
    meta:  {
      width:     "half",
      interface: "boolean",
      note:      "Snel uit te zetten zonder de override te verwijderen.",
    },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "hijri_date_overrides", {
    field: "created_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-created"] },
    schema:{},
  });

  console.log("✓ Stap 1l voltooid");
}
