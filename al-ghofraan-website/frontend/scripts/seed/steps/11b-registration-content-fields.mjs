// scripts/seed/steps/11b-registration-content-fields.mjs
//
// Voegt aan zowel `education_programs` als `activities` 5 optionele velden toe
// waarmee de beheerder de teksten van het inschrijfformulier per item kan
// aanpassen:
//   - registration_intro_title    : kop boven het formulier
//   - registration_intro_text     : inleidende tekst (markdown of plain)
//   - registration_button_text    : tekst op de submit-knop
//   - registration_success_message: bedanktekst na succesvolle inschrijving
//   - registration_extra_note     : extra notitie onder of in het formulier
//
// Wanneer leeg gebruikt de frontend bestaande fallbacks. Geen breaking changes.

import { ensureField } from "../lib/helpers.mjs";

const FIELDS = [
  {
    field: "registration_intro_title",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note: "Kop boven het inschrijfformulier (bv. 'Inschrijven voor deze cursus').",
    },
    schema: {},
  },
  {
    field: "registration_intro_text",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note: "Korte uitleg vlak boven het inschrijfformulier — wordt als gewone tekst getoond.",
    },
    schema: {},
  },
  {
    field: "registration_button_text",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note: "Tekst op de submit-knop. Standaard 'Inschrijven'.",
    },
    schema: {},
  },
  {
    field: "registration_success_message",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note: "Bevestigingstekst die verschijnt na succesvolle inschrijving.",
    },
    schema: {},
  },
  {
    field: "registration_extra_note",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note: "Optionele extra notitie onder het formulier (bv. uitleg over privacy of contact).",
    },
    schema: {},
  },
];

export async function setupRegistrationContentFields(client) {
  console.log("\n✏️  Stap 11b · Beheerbare inschrijfteksten op education_programs + activities");

  for (const collection of ["education_programs", "activities"]) {
    console.log(`  · ${collection}:`);
    for (const def of FIELDS) {
      await ensureField(client, collection, def);
    }
  }

  console.log("✓ Stap 11b voltooid");
}
