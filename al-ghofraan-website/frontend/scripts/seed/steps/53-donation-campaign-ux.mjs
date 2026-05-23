// scripts/seed/steps/53-donation-campaign-ux.mjs
//
// UX-correctie op donatiecampagnes (vervolg op delivery v2):
//
//   1. Twee nieuwe site_settings velden voor beheerbare homepage-teksten:
//      - homepage_campaigns_title    (default fallback "Actuele campagnes")
//      - homepage_campaigns_subtitle (default fallback "Steun een specifiek doel van de DawahCommissie")
//
//   2. Field-note van `donation_campaigns.progress_default_open` herzien
//      naar nieuwe semantiek: campagne is standaard geselecteerd op
//      /doneren (i.p.v. expand-toggle voor losse kaart). Het bestaande
//      veld wordt hergebruikt — geen migratie nodig, geen rename.
//
// Idempotent: tweede run = no-op.
// - ensureField skipt bij existence
// - field-note PATCH skipt bij identieke note
//
// HARDE GARANTIES:
//   - Géén schemamigratie, geen rename.
//   - Géén nieuwe collecties.
//   - Géén wijziging aan public-permissions whitelist
//     (donation_campaigns.manual_raised_note blijft uitgesloten).
//   - Géén Stripe-flow of analytics geraakt.
//   - Géén delete-permissions toegevoegd.

import { ensureField } from "../lib/helpers.mjs";

export async function setupDonationCampaignUx(client) {
  console.log("\n💡 Stap 53 · Donatiecampagne UX (homepage-teksten + progress_default_open semantiek)");

  // ─── site_settings: homepage_campaigns_title / _subtitle ──────

  await ensureField(client, "site_settings", {
    field: "homepage_campaigns_title",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Titel boven het campagneblok op de homepage. " +
        "Leeg = fallback 'Actuele campagnes'.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "homepage_campaigns_subtitle",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Korte subtitel onder de titel van het campagneblok op de " +
        "homepage. Leeg = fallback 'Steun een specifiek doel van de " +
        "DawahCommissie'.",
    },
    schema: {},
  });

  // ─── progress_default_open field-note herzien ─────────────────

  await patchFieldNote(
    client,
    "donation_campaigns",
    "progress_default_open",
    "Aan = deze campagne is standaard geselecteerd op /doneren — " +
      "bezoeker ziet direct het voortgangsvak van deze campagne. " +
      "Werkt alleen samen met 'show_progress' aan. " +
      "Bij meerdere campagnes met deze toggle wint de eerste op " +
      "volgorde (featured + sort). URL-parameter ?campaign=<slug> " +
      "heeft voorrang boven deze toggle.",
  );

  console.log("✓ Stap 53 voltooid");
}

/**
 * Patch alleen meta.note van een bestaand veld. Idempotent: als de
 * note al up-to-date is, skip. Niet-destructief: andere meta-keys
 * blijven intact.
 */
async function patchFieldNote(client, collection, field, note) {
  let existing;
  try {
    const resp = await client.get(`/fields/${collection}/${field}`);
    existing = resp?.data;
  } catch {
    console.warn(`  ⚠️  Field-note: ${collection}.${field} niet gevonden — overgeslagen`);
    return;
  }

  if (existing?.meta?.note === note) {
    console.log(`  · Field-note: ${collection}.${field} ongewijzigd (al up-to-date)`);
    return;
  }

  try {
    await client.patch(`/fields/${collection}/${field}`, {
      meta: { note },
    });
    console.log(`  ✓ Field-note: ${collection}.${field} bijgewerkt`);
  } catch (err) {
    console.warn(`  ⚠️  Field-note: ${collection}.${field} PATCH faalde:`, err.message);
  }
}
