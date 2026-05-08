// scripts/seed/steps/01k-tv-settings.mjs
//
// Voegt aan site_settings drie velden toe voor het instellen van de
// /gebedstijden/tv display:
//   - tv_prayer_slide_seconds : duur van de gebedstijden-slide (default 25)
//   - tv_item_slide_seconds   : duur van een item-slide (default 15)
//   - tv_refresh_minutes      : safety-net server-data refresh (default 5)
//
// Idempotent — `ensureField` controleert of het veld al bestaat.
// Bestaande site_settings-rij blijft intact: er worden nooit waarden
// overschreven, alleen veld-definities toegevoegd. Defaults op DB-niveau
// (`schema.default_value`) zorgen dat een leeg veld bij gebruik
// fallback krijgt — én in de frontend hebben we óók fallbacks (25/15/5)
// zodat de pagina nooit kan breken.

import { ensureField } from "../lib/helpers.mjs";

export async function setupTvSettings(client) {
  console.log("\n📺 Stap 1k · TV display-instellingen in site_settings");

  await ensureField(client, "site_settings", {
    field: "tv_prayer_slide_seconds",
    type:  "integer",
    meta: {
      width:     "third",
      interface: "input",
      note:
        "Hoe lang de gebedstijden-slide te zien is op /gebedstijden/tv. " +
        "Standaard 25 seconden. Leeg = standaardwaarde.",
    },
    schema: { default_value: 25 },
  });

  await ensureField(client, "site_settings", {
    field: "tv_item_slide_seconds",
    type:  "integer",
    meta: {
      width:     "third",
      interface: "input",
      note:
        "Hoe lang elke mededeling/hadith/reminder te zien is op /gebedstijden/tv. " +
        "Standaard 15 seconden. Leeg = standaardwaarde.",
    },
    schema: { default_value: 15 },
  });

  await ensureField(client, "site_settings", {
    field: "tv_refresh_minutes",
    type:  "integer",
    meta: {
      width:     "third",
      interface: "input",
      note:
        "Hoe vaak de TV-pagina nieuwe data ophaalt vanaf de server (announcements, gebedstijden). " +
        "Standaard 5 minuten. Lager = sneller wijzigingen zichtbaar maar meer serverbelasting.",
    },
    schema: { default_value: 5 },
  });

  console.log("✓ Stap 1k voltooid");
}
