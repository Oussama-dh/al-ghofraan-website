// scripts/seed/steps/51-donation-campaign-progress-v2.mjs
//
// Vervolg op delivery 50 — herziene aanpak voor donatiecampagne-voortgang.
//
// Wat deze stap doet:
//
//   1. NIEUWE velden op `donation_campaigns` (in EURO'S, niet centen):
//      - goal_amount_eur            (float, doel in euro's)
//      - manual_raised_amount_eur   (float, handmatige correctie in euro's)
//      - manual_raised_note         (string, uitleg voor admin)
//      - manual_monthly_donor_count (integer, extra count voor off-Stripe)
//      - progress_default_open      (boolean, kaart start open)
//      - show_on_homepage           (boolean, toon op homepage)
//
//   2. LEGACY velden VERBERGEN in admin (data blijft staan!):
//      - goal_amount            (cents) → hidden:true
//      - goal_amount_display    (string) → hidden:true
//      - raised_amount          (cents, delivery 50) → hidden:true
//      - raised_amount_display  (string, delivery 50) → hidden:true
//
//      De velden BLIJVEN BESTAAN in de database — geen dataverlies.
//      `goal_amount` (cents) wordt door frontend gelezen als fallback
//      zolang `goal_amount_eur` nog leeg is. Daarna wordt enkel
//      `goal_amount_eur` gebruikt.
//
//   3. show_progress + short_text (uit delivery 50): BEHOUDEN, ongewijzigd.
//
// Idempotent: tweede run = no-op.
// - ensureField skipt bij existence
// - hideField PATCH is idempotent (zelfde state = geen wijziging)
//
// HARDE GARANTIES:
//   - Géén bestaande data verwijderd.
//   - Géén collecties verwijderd.
//   - Géén Stripe-flow geraakt.
//   - Géén GA4-events veranderd.
//   - Géén delete-permissions toegevoegd.
//   - Stap 37/40 niet geraakt.

import { ensureField } from "../lib/helpers.mjs";

const COLLECTION = "donation_campaigns";

const LEGACY_FIELDS_TO_HIDE = [
  "goal_amount",
  "goal_amount_display",
  "raised_amount",
  "raised_amount_display",
];

export async function setupDonationCampaignProgressV2(client) {
  console.log("\n💰 Stap 51 · donation_campaigns voortgang v2 (euro's + auto-aggregatie)");

  // ─── Nieuwe velden in EURO'S ──────────────────────────────────

  await ensureField(client, COLLECTION, {
    field: "goal_amount_eur",
    type:  "float",
    meta: {
      width:     "half",
      interface: "input",
      options:   { min: 0, step: 0.01 },
      display:   "formatted-value",
      display_options: { prefix: "€ ", decimals: 2 },
      note:
        "Doelbedrag in EURO'S (bv. 25000.00 voor €25.000). " +
        "Als dit veld leeg blijft, valt het systeem terug op het oude " +
        "'goal_amount' (centen) — zodra je hier een waarde invult, " +
        "wordt die voortaan gebruikt.",
    },
    schema: {
      numeric_precision: 12,
      numeric_scale:     2,
    },
  });

  await ensureField(client, COLLECTION, {
    field: "manual_raised_amount_eur",
    type:  "float",
    meta: {
      width:     "half",
      interface: "input",
      options:   { min: 0, step: 0.01 },
      display:   "formatted-value",
      display_options: { prefix: "€ ", decimals: 2 },
      note:
        "Handmatige correctie BOVENOP automatisch berekend totaal. " +
        "Voor contante donaties, bankoverschrijvingen of " +
        "off-Stripe giften. In EURO'S (bv. 1250.50). " +
        "Leeg of 0 = geen correctie. Negatieve waarde mag voor " +
        "rechtzetting na fout (bv. dubbel-geboekte donatie).",
    },
    schema: {
      numeric_precision: 12,
      numeric_scale:     2,
      default_value:     0,
    },
  });

  await ensureField(client, COLLECTION, {
    field: "manual_raised_note",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "INTERNE admin-notitie bij handmatige correctie. " +
        "NIET zichtbaar op de website. NIET publiek uitleesbaar via " +
        "de API (defense-in-depth: uitgesloten van frontend-query én " +
        "van Directus public read permission). " +
        "Mag GEEN persoonsgegevens bevatten — geen donor-namen, " +
        "geen e-mails, geen telefoonnummers, geen bedrag-per-persoon. " +
        "Alleen voor jezelf als geheugensteun, bv. " +
        "'Cash inzameling Q1 — 3 enveloppen' of 'SEPA-overschrijvingen mrt'.",
    },
    schema: {},
  });

  await ensureField(client, COLLECTION, {
    field: "manual_monthly_donor_count",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      options:   { min: 0 },
      note:
        "Extra aantal maandelijkse donateurs BOVENOP automatisch " +
        "geteld (bijv. mensen met machtiging buiten Stripe). " +
        "Leeg of 0 = alleen automatische telling.",
    },
    schema: { default_value: 0 },
  });

  await ensureField(client, COLLECTION, {
    field: "progress_default_open",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      special:   ["cast-boolean"],
      note:
        "Aan = voortgangskaart staat standaard OPEN (uitgeklapt). " +
        "Uit = bezoeker moet eerst klikken op 'Bekijk voortgang'. " +
        "Default: uit (compact).",
    },
    schema: { default_value: false },
  });

  await ensureField(client, COLLECTION, {
    field: "show_on_homepage",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      special:   ["cast-boolean"],
      note:
        "Aan = deze campagne verschijnt OOK op de homepage in een " +
        "compacte versie. Maximaal 2 campagnes tegelijk op homepage; " +
        "bij meer wordt op volgorde (featured, sort) gekozen.",
    },
    schema: { default_value: false },
  });

  // ─── Legacy velden verbergen ──────────────────────────────────

  for (const field of LEGACY_FIELDS_TO_HIDE) {
    await hideField(client, COLLECTION, field);
  }

  console.log("✓ Stap 51 voltooid");
}

/**
 * Verbergt een bestaand veld in de admin-UI door meta.hidden = true.
 * Data blijft in de database; alleen niet meer zichtbaar in het admin-
 * formulier. Idempotent: PATCH met identieke waarde doet niets.
 *
 * Skipt netjes als het veld niet bestaat (bv. delivery 50 niet gedraaid).
 */
async function hideField(client, collection, field) {
  let existing;
  try {
    const resp = await client.get(`/fields/${collection}/${field}`);
    existing = resp?.data;
  } catch {
    console.log(`  · Legacy hide: ${collection}.${field} bestaat niet — overgeslagen`);
    return;
  }

  if (existing?.meta?.hidden === true) {
    console.log(`  · Legacy hide: ${collection}.${field} al verborgen`);
    return;
  }

  try {
    const currentNote = existing?.meta?.note || "";
    const legacyNote =
      "[LEGACY — niet meer gebruiken] " +
      (currentNote ? currentNote + " — " : "") +
      "Vervangen door euro-veld. Data blijft staan voor " +
      "backward-compatibility.";

    await client.patch(`/fields/${collection}/${field}`, {
      meta: {
        hidden: true,
        note:   legacyNote,
      },
    });
    console.log(`  ✓ Legacy hide: ${collection}.${field} verborgen`);
  } catch (err) {
    console.warn(`  ⚠️  Legacy hide: ${collection}.${field} PATCH faalde:`, err.message);
  }
}
