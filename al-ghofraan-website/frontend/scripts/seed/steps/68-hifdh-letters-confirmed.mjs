// scripts/seed/steps/68-hifdh-letters-confirmed.mjs
//
// Voegt het veld `letters_confirmed` toe aan quran_registrations: de ouder
// bevestigt in het formulier (vraag vóór het formulier) dat het kind minimaal de
// Arabische letters kan herkennen en van elkaar kan onderscheiden (voorwaarde voor deelname).
//
// Bewust nullable zonder default: bestaande inschrijvingen (van vóór deze
// voorwaarde) blijven leeg = "niet gevraagd" in plaats van onterecht "nee".
// Idempotent: bestaat het veld al, dan gebeurt er niets. Geen data- of
// rechtenwijzigingen (de rol "Onderwijs beheerder" heeft al veld-rechten "*").

import { ensureField } from "../lib/helpers.mjs";

export async function setupLettersConfirmedField(client) {
  console.log("\n🔤 Stap 68 · quran_registrations.letters_confirmed");

  try {
    await client.get("/collections/quran_registrations");
  } catch {
    throw new Error('Collectie "quran_registrations" bestaat niet — draai eerst stap 60.');
  }

  await ensureField(client, "quran_registrations", {
    field: "letters_confirmed",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      readonly:  true,
      note:      "Ouder bevestigde dat het kind minimaal de Arabische letters kan herkennen en van elkaar kan onderscheiden. Leeg = inschrijving van vóór deze voorwaarde.",
    },
    schema: { is_nullable: true, default_value: null },
  });

  console.log("✓ Stap 68 voltooid");
}
