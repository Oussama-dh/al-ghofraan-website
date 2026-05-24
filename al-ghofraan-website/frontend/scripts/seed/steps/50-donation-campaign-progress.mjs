// scripts/seed/steps/50-donation-campaign-progress.mjs
//
// Voegt 4 velden toe aan `donation_campaigns` voor het tonen van
// een eenvoudige voortgangsbalk op /doneren:
//
//   - raised_amount         (integer, eurocenten)
//                           Handmatig bijgehouden door admin.
//                           Bewust GEEN auto-sync vanuit donations-tabel:
//                           houdt het simpel en voorkomt edge-cases met
//                           refunds, mislukte betalingen of off-platform
//                           bijdragen.
//
//   - raised_amount_display (string)
//                           Leesbare weergave, bv. "€2.350".
//                           Optioneel; als leeg vult frontend zelf in
//                           op basis van raised_amount.
//
//   - short_text            (string, max 200 chars)
//                           Korte campagne-teaser onder de titel.
//                           Niet de volledige beschrijving (description
//                           blijft daarvoor).
//
//   - show_progress         (boolean, default false)
//                           Expliciete opt-in voor voortgangsbalk.
//                           Default false zodat bestaande campagnes
//                           NIETS visueel veranderen na deze seed.
//                           Alleen bij true + goal_amount > 0 toont
//                           de frontend de campagne als voortgangskaart.
//
// Idempotent: ensureField skipt bij existence. Tweede run = no-op.
//
// HARDE GARANTIES:
//   - Géén bestaande velden gemuteerd.
//   - Géén Stripe-flow geraakt.
//   - Géén analytics events veranderd.
//   - Géén delete-permissions toegevoegd.
//   - Bestaande campagnes blijven 100% backward-compatible:
//     show_progress=false (default) → frontend toont niets nieuws.

import { ensureField } from "../lib/helpers.mjs";

const COLLECTION = "donation_campaigns";

export async function setupDonationCampaignProgress(client) {
  console.log("\n💰 Stap 50 · donation_campaigns voortgang-velden");

  // Delivery 57 — legacy cent-velden raised_amount en raised_amount_display
  // worden NIET meer aangemaakt op fresh installs. Stripe-aggregatie +
  // manual_raised_amount_eur (in euro's, sinds stap 51) is de enige
  // bron van waarheid. Op productie installs waar deze velden al
  // bestaan, ruimt scripts/seed/steps/
  // 57-donation-campaigns-legacy-cleanup.mjs ze idempotent op.
  //
  // ensureField(donation_campaigns, raised_amount)         — verwijderd in delivery 57
  // ensureField(donation_campaigns, raised_amount_display) — verwijderd in delivery 57

  await ensureField(client, COLLECTION, {
    field: "short_text",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Korte campagne-teaser onder de titel (1-2 zinnen, max " +
        "200 tekens). Voor langere uitleg gebruik je het bestaande " +
        "'description'-veld. Verschijnt alleen als " +
        "'show_progress' aan staat.",
    },
    schema: {
      max_length: 200,
    },
  });

  await ensureField(client, COLLECTION, {
    field: "show_progress",
    type:  "boolean",
    meta: {
      width:     "full",
      interface: "boolean",
      special:   ["cast-boolean"],
      note:
        "Aanzetten om deze campagne als voortgangskaart op /doneren " +
        "te tonen. Vereist ook 'goal_amount_eur' > 0. " +
        "Default: uit (= bestaande gedrag, geen kaart zichtbaar).",
    },
    schema: {
      default_value: false,
    },
  });

  console.log("✓ Stap 50 voltooid");
}
