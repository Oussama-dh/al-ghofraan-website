// scripts/seed/steps/62-hifdh-program.mjs
//
// Hifdh programma als gewoon onderwijsprogramma in `education_programs`,
// zodat het als kaart op /onderwijs verschijnt (zelfde component en
// huisstijl als de andere programma's).
//
// De kaart linkt naar /onderwijs/hifdhprogramma. Dat is een VASTE route
// (app/onderwijs/hifdhprogramma) die de inschrijfpagina toont en wint van
// de dynamische /onderwijs/[slug]. Het actielabel op de kaart komt uit
// lib/educationRoutes.ts ("Inschrijven Hifdh programma").
//
// SOFT-CREATE: bestaat het item al (bv. door een beheerder aangepast),
// dan blijft alle handmatige content intact — er wordt niets overschreven.
// Geen schema-, permissie- of rolwijzigingen.

import { softCreateItem } from "../lib/helpers.mjs";

export async function setupHifdhProgram(client) {
  console.log("\n📖 Stap 62 · Hifdh programma in education_programs");

  try {
    await client.get("/collections/education_programs");
  } catch {
    throw new Error('Collectie "education_programs" bestaat niet — draai eerst stap 11.');
  }

  await softCreateItem(client, "education_programs", "slug", "hifdhprogramma", {
    title: "Hifdh programma",
    status: "published",
    registration_enabled: true,
  });

  console.log("✓ Stap 62 voltooid");
}
