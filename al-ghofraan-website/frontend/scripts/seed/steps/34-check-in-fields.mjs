// scripts/seed/steps/34-check-in-fields.mjs
//
// Delivery QR-1 — Voegt check-in velden toe aan de `registrations`
// collectie. Bedoeld voor de QR-code check-in flow op activiteiten:
//
//   1. Elke activity-inschrijving krijgt bij aanmaak een uniek
//      `check_in_token` (UUID v4). Dit gebeurt server-side in
//      `app/api/inschrijven/route.ts`.
//   2. De QR-code op de bevestiging linkt naar
//      `/check-in/[check_in_token]`. De pagina toont de inschrijving
//      en biedt een organisator-knop "Check-in bevestigen" aan
//      (komt in QR-2 en QR-3).
//   3. Na bevestiging worden `checked_in_at`, `checked_in_by` en
//      eventueel `checked_in_note` ingevuld.
//
// Bewust géén publieke read-permissies op deze velden. De
// check-in pagina haalt data server-side op via DIRECTUS_TOKEN
// (zelfde patroon als de bestaande `/api/inschrijven` route).
//
// Velden zijn nullable: bestaande rijen (van vóór QR-1) hebben
// geen token en kunnen niet ingecheckt worden via QR. Dat is OK —
// alleen vanaf nu nieuwe inschrijvingen krijgen automatisch een
// token. Education-inschrijvingen krijgen géén token in QR-1.
//
// Idempotent via ensureField. Een tweede `npm run seed` voegt
// niets toe en muteert bestaande records niet.

import { ensureField } from "../lib/helpers.mjs";

export async function setupCheckInFields(client) {
  console.log("");
  console.log("34. Check-in velden — QR-code check-in voor activity-registrations");

  // ─── check_in_token ─────────────────────────────────────────
  // UUID v4 (36 tekens). Wordt gebruikt als lookup-key in de URL
  // /check-in/[token]. Mag NOOIT zelf de autorisatie zijn voor de
  // check-in actie — de bevestig-API vereist los een organisator-
  // code (CHECK_IN_ORGANIZER_CODE) die in QR-3 wordt toegevoegd.
  await ensureField(client, "registrations", {
    field: "check_in_token",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      readonly:  true,
      note:
        "Unieke UUID v4 token, automatisch ingevuld bij aanmaak van " +
        "activity-inschrijvingen. Wordt gebruikt in de QR-code URL " +
        "(/check-in/[token]). Niet zelf bewerken — bevat geen " +
        "persoonsgegevens en is alleen een lookup-key. Oude rijen " +
        "van vóór QR-1 hebben geen token en kunnen niet via QR " +
        "worden ingecheckt.",
    },
    schema: {},
  });

  // ─── checked_in_at ──────────────────────────────────────────
  // Wordt gezet door de check-in API. Aanwezigheid van deze
  // timestamp = de deelnemer is ingecheckt.
  await ensureField(client, "registrations", {
    field: "checked_in_at",
    type:  "timestamp",
    meta: {
      width:     "half",
      interface: "datetime",
      readonly:  true,
      note:
        "Wanneer de organisator de aanwezigheid heeft bevestigd via " +
        "de QR-check-in. Leeg = nog niet ingecheckt.",
    },
    schema: {},
  });

  // ─── checked_in_by ──────────────────────────────────────────
  // Naam of initialen van de organisator die de check-in deed.
  // Optioneel mee te geven in de check-in API call.
  await ensureField(client, "registrations", {
    field: "checked_in_by",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      readonly:  true,
      note:
        "Naam of initialen van de organisator die heeft ingecheckt " +
        "(bv. 'AH'). Wordt gevuld door de check-in API.",
    },
    schema: {},
  });

  // ─── checked_in_note ────────────────────────────────────────
  // Korte opmerking bij de check-in. Bv. "kwam te laat",
  // "bracht extra persoon mee", etc.
  await ensureField(client, "registrations", {
    field: "checked_in_note",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      readonly:  true,
      note:
        "Optionele opmerking van de organisator bij de check-in. " +
        "Wordt gevuld door de check-in API.",
    },
    schema: {},
  });
}
