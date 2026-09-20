// scripts/seed/steps/64-education-program-price.mjs
//
// Voegt het optionele veld `price` toe aan education_programs. Het wordt als
// kaart "Prijs" getoond op /onderwijs/[slug], naast Docent, Doelgroep,
// Planning en Locatie. Leeg = geen kaart. Idempotent; geen data-wijzigingen.

import { ensureField } from "../lib/helpers.mjs";

export async function setupEducationProgramPrice(client) {
  console.log("\n💶 Stap 64 · education_programs.price");

  await ensureField(client, "education_programs", {
    field: "price",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      note:      "Bv. '€ 25 per maand'. Leeg = kaart 'Prijs' niet tonen.",
    },
    schema: {},
  });

  console.log("✓ Stap 64 voltooid");
}
