// scripts/seed/steps/15b-payment-link-fields.mjs
//
// Voegt Stripe Payment Link-velden toe aan `donation_campaigns`:
//   - use_stripe_payment_link  (boolean, default false)
//   - stripe_payment_link_url  (string, optioneel)
//   - stripe_payment_link_id   (string, optioneel — alleen voor admin-overzicht)
//
// Idempotent. Bestaande campagnes blijven werken via de bestaande
// website-checkout zolang `use_stripe_payment_link = false` is.
//
// Toelichting: een Stripe Payment Link is een vaste URL die de admin
// in het Stripe Dashboard maakt. Hij stuurt naar Stripe Checkout met
// een vaste configuratie. Per campagne hier de URL koppelen geeft de
// admin een betrouwbare manier om in Stripe (Reports / Filter by Payment Link)
// te zien hoeveel via die specifieke campagne is binnengekomen.

import { ensureField } from "../lib/helpers.mjs";

export async function setupPaymentLinkFields(client) {
  console.log("\n🔗 Stap 15b · Stripe Payment Link-velden op donation_campaigns");

  await ensureField(client, "donation_campaigns", {
    field: "use_stripe_payment_link",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Aanvinken om voor deze campagne de Stripe Payment Link te gebruiken " +
        "in plaats van de eigen website-checkout. URL hieronder moet ook gevuld zijn.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, "donation_campaigns", {
    field: "stripe_payment_link_url",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Volledige Stripe Payment Link URL, bv. https://buy.stripe.com/xxx. " +
        "Maak deze in het Stripe Dashboard aan en kopieer de URL hierheen.",
    },
    schema: {},
  });

  await ensureField(client, "donation_campaigns", {
    field: "stripe_payment_link_id",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Optioneel — Stripe-ID van de Payment Link (begint met 'plink_'). " +
        "Alleen handig voor admin-traceability. URL hierboven volstaat voor de werking.",
    },
    schema: {},
  });

  console.log("✓ Stap 15b voltooid");
}
