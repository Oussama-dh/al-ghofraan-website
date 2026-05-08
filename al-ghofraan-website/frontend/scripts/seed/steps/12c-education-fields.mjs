// scripts/seed/steps/12c-education-fields.mjs
//
// Voegt onderwijs-specifieke velden toe aan `registrations`:
//   - student_number        : auto-gegenereerd voor onderwijs (JJ-MM-DD-XXXX)
//   - parent_name           : ouder/contactpersoon naam
//   - parent_email          : ouder/contactpersoon e-mail
//   - parent_phone          : ouder/contactpersoon telefoon (10 cijfers)
//   - registration_group_id : UUID per inzending — meerdere kinderen
//                              krijgen dezelfde group_id zodat admin ziet
//                              dat ze samen zijn ingediend
//
// Bij activiteiten blijven deze velden leeg/null.
// Bij onderwijs vult de API ze automatisch.
//
// Idempotent — bestaande registrations records worden NIET aangepast.
// Bestaande activiteit-inschrijvingen blijven werken: de oude `name`/`email`/
// `phone`/`age`/`gender`/`notes` velden blijven leidend.

import { ensureField } from "../lib/helpers.mjs";

export async function setupEducationFields(client) {
  console.log("\n🎓 Stap 12c · Onderwijs-velden op registrations");

  await ensureField(client, "registrations", {
    field: "student_number",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      readonly:  true,
      note:
        "Auto-gegenereerd bij onderwijsinschrijvingen, formaat JJ-MM-DD-XXXX. " +
        "Activiteit-inschrijvingen hebben dit niet.",
    },
    schema: {},
  });

  await ensureField(client, "registrations", {
    field: "parent_name",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note: "Ouder/contactpersoon — alleen ingevuld bij onderwijsinschrijvingen.",
    },
    schema: {},
  });

  await ensureField(client, "registrations", {
    field: "parent_email",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note: "Ouder/contactpersoon — alleen ingevuld bij onderwijsinschrijvingen.",
    },
    schema: {},
  });

  await ensureField(client, "registrations", {
    field: "parent_phone",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:
        "Ouder/contactpersoon — alleen ingevuld bij onderwijsinschrijvingen. " +
        "Genormaliseerd naar 10 cijfers bij invoer.",
    },
    schema: {},
  });

  await ensureField(client, "registrations", {
    field: "registration_group_id",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      readonly:  true,
      note:
        "Records die bij dezelfde inzending horen krijgen dezelfde " +
        "registration_group_id (UUID). Gebruik dit veld om in admin te " +
        "filteren op 'alle kinderen van één inschrijving'.",
    },
    schema: {},
  });

  console.log("✓ Stap 12c voltooid");
}
