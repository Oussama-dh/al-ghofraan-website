// scripts/seed/steps/44-contact-maps-fields.mjs
//
// Voegt 4 idempotente velden toe aan `site_settings` voor de
// Maps-integratie op /contact:
//
//   - contact_maps_enabled     (boolean, default false)
//   - contact_maps_embed_url   (text)  — iframe-URL van Google Maps
//   - contact_maps_place_url   (text)  — link "Open in Google Maps"
//   - contact_address_label    (string) — adres-onderschrift bij kaart
//
// Veiligheid: de frontend valideert URLs voordat ze worden gerenderd
// (whitelist op google.com/maps). Hier in de seed slaan we alleen de
// velden op; geen runtime-validatie.
//
// Backward compatibility:
//   - Default `contact_maps_enabled=false` → bestaande contactpagina
//     verandert niet na deploy.
//   - Bestaand veld `address` op site_settings blijft werken en wordt
//     onafhankelijk getoond.

import { ensureField } from "../lib/helpers.mjs";

export async function setupContactMapsFields(client) {
  console.log("\n🗺️  Stap 44 · Maps-velden op site_settings");

  await ensureField(client, "site_settings", {
    field: "contact_maps_enabled",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Zet de kaart op de contactpagina aan/uit. Bij uit (default) " +
        "wordt geen iframe of knop getoond.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, "site_settings", {
    field: "contact_maps_embed_url",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:
        "Embed-URL van Google Maps (begint met https://www.google.com/maps/embed). " +
        "Open Google Maps → kies de locatie → 'Delen' → 'Een kaart insluiten' → " +
        "kopieer ALLEEN de src='...'-waarde, niet het volledige iframe-tag. " +
        "Alleen https-URLs van google.com/maps worden gerenderd.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "contact_maps_place_url",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Klikbare URL naar Google Maps voor de 'Open in Google Maps' knop " +
        "(bv. https://maps.google.com/?cid=... of een maps.app.goo.gl-link). " +
        "Mag leeg blijven — dan wordt geen knop getoond.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "contact_address_label",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Optioneel label onder de kaart, bv. 'Moskee El Mouahidin — Adres'. " +
        "Mag leeg blijven.",
    },
    schema: {},
  });

  console.log("✓ Stap 44 voltooid");
}
