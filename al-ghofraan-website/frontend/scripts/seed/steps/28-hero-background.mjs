// scripts/seed/steps/28-hero-background.mjs
//
// Delivery 16 — Voegt optioneel `hero_background_image` veld toe aan
// page_content. Bestaande page_content records worden NIET aangeraakt
// (geen automatische image-toewijzing). Admin kan per pagina handmatig
// een afbeelding kiezen via Directus.
//
// Patroon gekopieerd van `activities.image` in 01-collections.mjs:
//   type:      "uuid"
//   interface: "file-image"
//   special:   ["file"]
//   schema:    { foreign_key_table: "directus_files" }
//
// Geen aparte ensureRelation nodig — Directus genereert de relation
// automatisch op basis van de schema FK.
//
// Idempotent via ensureField (skipt als veld al bestaat).

import { ensureField } from "../lib/helpers.mjs";

export async function setupHeroBackground(client) {
  console.log("");
  console.log("28. Hero-background veld — optionele page-hero afbeelding");

  await ensureField(client, "page_content", {
    field: "hero_background_image",
    type:  "uuid",
    meta: {
      width:     "full",
      interface: "file-image",
      special:   ["file"],
      note:
        "Optionele achtergrondafbeelding voor de page-hero. Als ingesteld " +
        "komt deze op de plaats van de slate-mosque kleur, met een donkere " +
        "overlay voor leesbaarheid. Laat leeg voor de standaard kleur-hero.",
    },
    schema: {
      foreign_key_table: "directus_files",
    },
  });
}
