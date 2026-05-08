// scripts/seed/steps/04b-registration-terms-fields.mjs
//
// Voegt voorwaarden-velden toe aan `site_settings`:
//   - registration_terms_url   : optionele URL naar voorwaardenpagina
//   - registration_terms_label : optionele label-tekst voor de checkbox
//
// Gebruikt door RegistrationForm voor de extra "Ik heb de voorwaarden gelezen"-
// checkbox. Beheerder kan later de URL aanpassen of de tekst veranderen.
//
// Idempotent. Bestaande site_settings record wordt NIET overschreven —
// `ensureField` voegt alleen de kolom toe als die nog niet bestaat.

import { ensureField } from "../lib/helpers.mjs";

export async function setupRegistrationTermsFields(client) {
  console.log("\n📜 Stap 4b · Voorwaarden-velden op site_settings");

  await ensureField(client, "site_settings", {
    field: "registration_terms_url",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Optioneel — URL naar voorwaardenpagina (mag intern als /voorwaarden " +
        "of extern). Wanneer leeg toont de checkbox alleen tekst zonder link.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "registration_terms_label",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Optioneel — eigen tekst voor de voorwaarden-checkbox. Standaard wordt " +
        "'Ik heb de voorwaarden van de organisatie gelezen en ga hiermee akkoord.' gebruikt.",
    },
    schema: {},
  });

  console.log("✓ Stap 4b voltooid");
}
