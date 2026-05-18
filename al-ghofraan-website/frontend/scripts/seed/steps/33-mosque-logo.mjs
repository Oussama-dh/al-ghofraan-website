// scripts/seed/steps/33-mosque-logo.mjs
//
// Delivery 25 — Voegt optioneel `mosque_logo` veld toe aan
// page_content. Bedoeld voor externe organisatie-logos die op een
// specifieke pagina getoond worden.
//
// Concreet wordt dit momenteel alleen gebruikt op de pagina
// `/onze-moskee` voor het logo van Moskee El Mouahidin. Het veld is
// algemeen genoeg om in de toekomst op andere CMS-pagina's eventueel
// een ander organisatie-logo te tonen, mits de render-code daarvoor
// wordt uitgebreid in `app/[slug]/page.tsx`.
//
// Patroon identiek aan 28-hero-background.mjs (uuid + file-image
// interface + special=file + FK naar directus_files). Geen aparte
// ensureRelation nodig — Directus genereert de relation op basis
// van de schema FK.
//
// Idempotent via ensureField (skipt als veld al bestaat).
// Bestaande page_content records worden NIET aangeraakt.

import { ensureField } from "../lib/helpers.mjs";

export async function setupMosqueLogo(client) {
  console.log("");
  console.log("33. Mosque-logo veld — optioneel organisatie-logo op page_content");

  await ensureField(client, "page_content", {
    field: "mosque_logo",
    type:  "uuid",
    meta: {
      width:     "full",
      interface: "file-image",
      special:   ["file"],
      note:
        "Optioneel organisatie-logo. Wordt momenteel alleen gerenderd op " +
        "de pagina '/onze-moskee' (logo Moskee El Mouahidin). Aanbevolen " +
        "afmeting: PNG met transparante achtergrond, breedte 400–800 px. " +
        "Leeg laten = geen logo tonen.",
    },
    schema: {
      foreign_key_table: "directus_files",
    },
  });
}
