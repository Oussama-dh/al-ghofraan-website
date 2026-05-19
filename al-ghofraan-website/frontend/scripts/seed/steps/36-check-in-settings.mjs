// scripts/seed/steps/36-check-in-settings.mjs
//
// Delivery QR-Organizer — Verplaatst de organisator-autorisatie
// configuratie van env-vars naar Directus Site Settings, zodat
// hoofdbeheerder de code kan wijzigen zonder deploy/restart.
//
// Twee nieuwe velden op site_settings:
//
//   1. check_in_organizer_code (string)
//      De geheime code die organisatoren invullen op
//      /check-in/organizer (of die in de QR-URL staat).
//      Standaard LEEG — feature is dan gedeactiveerd tot
//      beheerder hem invult.
//
//   2. check_in_session_duration_hours (integer)
//      Hoe lang een organisator-apparaat geautoriseerd blijft
//      na inloggen. Standaard 4 uur (compatible met vorige
//      delivery). Bij ongeldige/lege waarde valt de code
//      automatisch terug op 4.
//
// Idempotent: tweede `npm run seed` doet niets. Beheerder-edits
// blijven intact.
//
// VEILIGHEIDSNOOT:
//   - De code is gevoelig en wordt in plain text in Directus
//     opgeslagen. Alleen rollen met read-toegang op
//     site_settings zien hem. Geen public read.
//   - Bij wijziging van de code worden bestaande organisator-
//     cookies automatisch ongeldig (het cookie-secret is via
//     HMAC van de code afgeleid). Gewenst gedrag.

import { ensureField } from "../lib/helpers.mjs";

export async function setupCheckInSettings(client) {
  console.log("");
  console.log("36. Check-in settings — organisator-code + sessieduur");

  // ─── check_in_organizer_code ─────────────────────────────
  await ensureField(client, "site_settings", {
    field: "check_in_organizer_code",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      // Toon als password-veld in de admin UI — zo wordt de code
      // niet over de schouder meegelezen, en kopiëren werkt nog.
      options:   { masked: true },
      note:
        "Geheime code waarmee organisatoren zich identificeren op " +
        "/check-in/organizer. Gebruik een lange willekeurige waarde " +
        "(>= 12 tekens). Bij wijziging vervallen alle bestaande " +
        "organisator-cookies automatisch (gewenst bij vermoeden van " +
        "compromittering). Leeg = check-in autorisatie uitgeschakeld.",
    },
    schema: {},
  });

  // ─── check_in_session_duration_hours ─────────────────────
  await ensureField(client, "site_settings", {
    field: "check_in_session_duration_hours",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      note:
        "Hoe lang een organisator-apparaat geautoriseerd blijft na " +
        "inloggen (in uren). Standaard 4. Aanbevolen tussen 1 en 24. " +
        "Bij leeg / 0 / negatief / niet-getal valt het systeem " +
        "terug op 4 uur.",
    },
    schema: { default_value: 4 },
  });
}
