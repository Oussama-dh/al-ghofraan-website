// scripts/seed/steps/20-page-headers.mjs
//
// Voegt het `arabic_title` veld toe aan page_content (idempotent) en
// maakt page_content-records aan voor vaste route-pagina's die nog
// geen record hebben (agenda, onderwijs, artikelen, gebedstijden, videos).
//
// Bestaande records — ook contact, doneren, privacy, dawahcommissie, home
// die al in eerdere stappen zijn aangemaakt — worden NIET aangeraakt.
// Dat is wat de spec voorschrijft: handmatige edits van de admin moeten
// blijven staan, ook als het arabic_title-veld daar nog leeg in is.
// De frontend valt dan terug op een sensible default in code.

import { ensureField, softCreateItem } from "../lib/helpers.mjs";

export async function setupPageHeaders(client) {
  console.log("\n🪐 Stap 20 · arabic_title-veld + ontbrekende page-headers");

  // ─── Veld toevoegen (idempotent) ──────────────────────────
  await ensureField(client, "page_content", {
    field: "arabic_title",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Optionele Arabische titel die boven de hoofdtitel verschijnt in de page-hero. " +
        "Gewone tekst — geen HTML.",
    },
    schema: {},
  });

  // ─── Soft-creates voor vaste-route pagina's zonder record ─
  // Alleen aanmaken als de slug nog niet bestaat. Slugs die wél al een
  // record hebben (home, dawahcommissie, doneren, contact, privacy)
  // worden hier bewust niet aangepast.
  const defaults = [
    {
      slug:         "agenda",
      arabic_title: "الأنشطة",
      title:        "Agenda",
      subtitle:     "Aankomende activiteiten van de DawahCommissie",
      intro:        "Bekijk hieronder onze geplande lezingen, cursussen en evenementen.",
    },
    {
      slug:         "onderwijs",
      arabic_title: "التعليم",
      title:        "Onderwijs",
      subtitle:     "Cursussen en programma's voor jong en oud",
      intro:        "Onze educatieve programma's zijn gericht op het verdiepen van kennis over de islam.",
    },
    {
      slug:         "artikelen",
      arabic_title: "المقالات",
      title:        "Artikelen",
      subtitle:     "Nieuws, lezingen en reflecties van de DawahCommissie",
      intro:        null,
    },
    {
      slug:         "gebedstijden",
      arabic_title: "مواقيت الصلاة",
      title:        "Gebedstijden",
      subtitle:     "Bekijk de actuele gebedstijden van moskee Al-Ghofraan",
      intro:        null,
    },
    {
      slug:         "videos",
      arabic_title: "المرئيات",
      title:        "Video's",
      subtitle:     "Lezingen, opnames en momentopnames van onze activiteiten",
      intro:        null,
    },
  ];

  for (const page of defaults) {
    await softCreateItem(client, "page_content", "slug", page.slug, {
      ...page,
      status: "published",
    });
  }

  console.log("✓ Stap 20 voltooid");
}
