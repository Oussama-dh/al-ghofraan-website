// scripts/seed/steps/69-education-age-limits.mjs
//
// Beheerbare minimum- en maximumleeftijd per onderwijsprogramma.
//
//   education_programs.min_age  — minimumleeftijd in hele jaren (inclusief)
//   education_programs.max_age  — maximumleeftijd in hele jaren (inclusief)
//
// Leeg = geen grens. Het Hifdh-inschrijfformulier toont de leeftijd bij de
// geboortedatum en weigert kinderen buiten deze grenzen (client én server).
//
// Idempotent en niet-destructief: bestaande velden blijven ongemoeid. Voor het
// Hifdh programma ("hifdhprogramma") worden 6 en 12 (zie FAQ: 6 t/m 12 jaar)
// ALLEEN ingevuld als het veld nog leeg is; een beheerder-waarde wordt nooit
// overschreven.

import { ensureField } from "../lib/helpers.mjs";

const PROGRAMS = "education_programs";
const HIFDH_SLUG = "hifdhprogramma";
const HIFDH_DEFAULTS = { min_age: 6, max_age: 12 };

const isEmpty = (v) => v === null || v === undefined || v === "";

export async function setupEducationAgeLimits(client) {
  console.log("\n🎂 Stap 69 · education_programs.min_age / max_age");

  await ensureField(client, PROGRAMS, {
    field: "min_age",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      options:   { min: 0, max: 120 },
      note:      "Minimumleeftijd in hele jaren (inclusief) voor inschrijving. Leeg = geen grens.",
    },
    schema: { is_nullable: true },
  });

  await ensureField(client, PROGRAMS, {
    field: "max_age",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      options:   { min: 0, max: 120 },
      note:      "Maximumleeftijd in hele jaren (inclusief) voor inschrijving. Leeg = geen grens. Bv. 12 = tot de 13e verjaardag.",
    },
    schema: { is_nullable: true },
  });

  const program = (
    await client.get(`/items/${PROGRAMS}?filter[slug][_eq]=${HIFDH_SLUG}&fields=id,min_age,max_age&limit=1`)
  )?.data?.[0];

  if (!program) {
    console.log(`  · programma "${HIFDH_SLUG}" niet gevonden — geen standaardleeftijden gezet`);
  } else {
    const patch = {};
    for (const [field, value] of Object.entries(HIFDH_DEFAULTS)) {
      if (isEmpty(program[field])) patch[field] = value;
    }
    if (Object.keys(patch).length > 0) {
      await client.patch(`/items/${PROGRAMS}/${program.id}`, patch);
      console.log(`  ↻ ${HIFDH_SLUG}: ${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(", ")} ingevuld (waren leeg)`);
    } else {
      console.log(`  · ${HIFDH_SLUG}: leeftijden zijn al ingevuld — niet gewijzigd`);
    }
  }

  console.log("✓ Stap 69 voltooid");
}
