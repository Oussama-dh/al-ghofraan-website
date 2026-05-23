// scripts/seed/steps/52-donation-campaign-public-fields.mjs
//
// Beveiligingsfix: zet de Directus public-read permission voor
// `donation_campaigns` om van `fields: ["*"]` naar een expliciete
// whitelist waarin `manual_raised_note` BEWUST ontbreekt.
//
// Waarom een aparte stap (niet alleen seed 02 corrigeren)?
//   - Seed 02 corrigeert de brondefinitie zodat verse installs
//     direct veilig zijn.
//   - Maar op productie wil je niet "seed 02" opnieuw draaien — dat
//     herschrijft ALLE public permissions (24+ collecties). Te ruime
//     impact voor wat in essentie een 1-collectie-fix is.
//   - Daarom: seed 52 patcht idempotent ALLEEN de productie-permission
//     voor donation_campaigns. Verse install: stap 02 doet het al,
//     stap 52 is dan een no-op.
//
// HARDE GARANTIES:
//   - Alleen `donation_campaigns` wordt geraakt.
//   - Geen andere collectie, geen andere policy, geen andere user.
//   - Géén nieuwe permissions toegevoegd.
//   - Géén delete-acties.
//   - Idempotent: tweede run = no-op (vergelijkt huidige fields-array).
//
// Synchronisatie:
//   - Houd `DONATION_CAMPAIGN_PUBLIC_FIELDS` in deze stap IDENTIEK aan
//     dezelfde array in scripts/seed/steps/02-permissions.mjs
//     EN scripts/seed/steps/54-tv-display-blocks.mjs.
//   - Houd in sync met `CAMPAIGN_FIELDS` in lib/directus.ts (zelfde
//     velden minus eventuele admin-only zoals manual_raised_note).
//   - Bij nieuwe velden: voeg overal toe zodat een rerun van een
//     willekeurige seed-stap niet stilletjes velden weer verbergt.

const COLLECTION   = "donation_campaigns";
const POLICY_NAME  = "Public"; // Directus standaard

const DONATION_CAMPAIGN_PUBLIC_FIELDS = [
  "id", "status", "title", "slug", "description", "image",
  "goal_amount", "goal_amount_display",
  "allow_one_time", "allow_monthly",
  "suggested_amounts", "default_amount",
  "featured", "sort",
  "use_stripe_payment_link", "stripe_payment_link_url", "stripe_payment_link_id",
  "raised_amount", "raised_amount_display", "short_text", "show_progress",
  "goal_amount_eur", "manual_raised_amount_eur",
  "manual_monthly_donor_count", "progress_default_open", "show_on_homepage",
  // Delivery TV-A — show_on_tv toegevoegd. Houd in sync met seed 02 + 54.
  "show_on_tv",
  // BEWUST UITGESLOTEN: manual_raised_note (interne admin-notitie).
];

export async function setupDonationCampaignPublicFields(client) {
  console.log("\n🔒 Stap 52 · Public read whitelist donation_campaigns (manual_raised_note uitsluiten)");

  // 1. Zoek de public policy
  const publicPolicy = await findPublicPolicy(client);
  if (!publicPolicy) {
    console.warn("  ⚠️  Public-policy niet gevonden — geen actie. Run eerst seed 02.");
    return;
  }

  // 2. Zoek de huidige read-permission voor donation_campaigns
  let permission;
  try {
    const resp = await client.get(
      `/permissions` +
      `?filter[policy][_eq]=${publicPolicy.id}` +
      `&filter[collection][_eq]=${encodeURIComponent(COLLECTION)}` +
      `&filter[action][_eq]=read` +
      `&limit=1`
    );
    permission = resp?.data?.[0];
  } catch (err) {
    console.warn(`  ⚠️  Permission-lookup faalde: ${err.message}`);
    return;
  }

  if (!permission) {
    console.log(
      `  · Geen public read-permission voor ${COLLECTION} gevonden — geen actie. ` +
      `Verwacht: run eerst seed 02 die deze permission aanmaakt.`
    );
    return;
  }

  // 3. Idempotentie: vergelijk huidige fields met de whitelist
  const currentFields = Array.isArray(permission.fields) ? permission.fields : [];
  const desiredFields = DONATION_CAMPAIGN_PUBLIC_FIELDS;

  // Sorteer-onafhankelijke vergelijking
  const currentSorted = [...currentFields].sort();
  const desiredSorted = [...desiredFields].sort();
  const isSame =
    currentSorted.length === desiredSorted.length &&
    currentSorted.every((f, i) => f === desiredSorted[i]);

  if (isSame) {
    console.log(`  · ${COLLECTION} fields-whitelist al up-to-date — geen actie`);
    return;
  }

  // 4. Toon wat er verandert (voor audit-trail in seed-output)
  const removed = currentFields.filter((f) => !desiredFields.includes(f));
  const added   = desiredFields.filter((f) => !currentFields.includes(f));

  if (currentFields.length === 1 && currentFields[0] === "*") {
    console.log(`  · Huidige fields: ["*"] (alles publiek) → vervangen door whitelist van ${desiredFields.length} velden`);
  } else {
    console.log(`  · Verwijderd uit publieke whitelist: ${removed.length > 0 ? removed.join(", ") : "(niets)"}`);
    console.log(`  · Toegevoegd aan publieke whitelist:  ${added.length > 0 ? added.join(", ") : "(niets)"}`);
  }
  console.log(`  · ${COLLECTION} permission ${permission.id} wordt gepatcht`);

  // 5. PATCH alleen het fields-veld; permissions/validation/presets ongemoeid
  try {
    await client.patch(`/permissions/${permission.id}`, {
      fields: desiredFields,
    });
    console.log(`  ✓ ${COLLECTION} public read whitelist toegepast — manual_raised_note niet meer publiek leesbaar`);
  } catch (err) {
    console.warn(`  ⚠️  PATCH faalde: ${err.message}`);
  }
}

/**
 * Zoek de Directus standaard "Public" policy. Identiek aan de helper
 * in seed 02; lokaal gedupliceerd om seed 02 niet te hoeven importeren
 * vanuit deze stap (vermijdt cross-step coupling).
 */
async function findPublicPolicy(client) {
  try {
    const resp = await client.get(
      `/policies?filter[name][_eq]=${encodeURIComponent(POLICY_NAME)}&limit=1`
    );
    return resp?.data?.[0] || null;
  } catch (err) {
    console.warn(`  ⚠️  Policy-lookup faalde: ${err.message}`);
    return null;
  }
}
