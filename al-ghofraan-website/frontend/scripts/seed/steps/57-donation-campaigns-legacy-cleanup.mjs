// scripts/seed/steps/57-donation-campaigns-legacy-cleanup.mjs
//
// Delivery 57 — verwijdert 4 legacy velden uit `donation_campaigns`:
//
//   - goal_amount            (integer, cents — vervangen door goal_amount_eur)
//   - goal_amount_display    (string, handmatige weergave — vervangen door auto-format)
//   - raised_amount          (integer, cents — vervangen door Stripe-aggregatie + manual_raised_amount_eur)
//   - raised_amount_display  (string — vervangen door auto-format)
//
// Context:
//   - Klant heeft expliciet bevestigd dat er geen waardevolle data is.
//   - Deze velden waren al hidden + [LEGACY]-note sinds stap 51.
//   - Frontend-fallbacks zijn in delivery 57 verwijderd (app/page.tsx,
//     app/doneren/page.tsx, components/donation/DonationForm.tsx).
//   - CAMPAIGN_FIELDS (lib/directus.ts) en publieke whitelists (seed
//     02 + 52 + 54) verwijzen niet meer naar deze velden.
//   - Stap 15 + 50 maken deze velden niet meer aan op fresh installs.
//
// VEILIGHEIDSNET:
//   Vóór delete telt deze stap of er campagnes zijn met:
//     goal_amount > 0 OR raised_amount > 0
//     OR goal_amount_display IS NOT NULL OR raised_amount_display IS NOT NULL
//   Als count > 0 → ABORT met duidelijke melding, gebruiker moet eerst
//   data migreren of expliciet doorgaan via environment variable:
//
//     Bash:        FORCE_LEGACY_CLEANUP=true npm run seed -- --only 57
//     PowerShell:  $env:FORCE_LEGACY_CLEANUP="true"; npm run seed -- --only 57
//
//   (Een CLI-flag zou stuiten op de strict argument-parser in
//   scripts/seed/index.mjs — vandaar een env-var i.p.v. argv.)
//
// HARDE GARANTIES:
//   - Idempotent: tweede run = no-op (velden bestaan al niet meer).
//   - Fail-soft op niet-bestaande velden (404 → log skip).
//   - Geen wijziging aan andere velden.
//   - manual_raised_note BLIJFT bestaan en blijft uitgesloten van
//     publieke whitelist.
//   - Stripe-flow, donatie-flow, Stripe-webhooks: niet geraakt.
//   - Stap 37, 40, andere seeds: niet geraakt.

const COLLECTION = "donation_campaigns";

const LEGACY_FIELDS = [
  "goal_amount",
  "goal_amount_display",
  "raised_amount",
  "raised_amount_display",
];

// Environment variable om de pre-delete data-check te overrulen.
// (Niet als CLI-flag — scripts/seed/index.mjs heeft een strict
// argument-parser die onbekende args weigert.)
const FORCE_ENV_VAR = "FORCE_LEGACY_CLEANUP";

export async function setupDonationCampaignsLegacyCleanup(client) {
  console.log("\n🧹 Stap 57 · donation_campaigns legacy cent-velden cleanup");

  // ─── 1. Bestaan de velden überhaupt? ──────────────────────────
  const existingFields = await listExistingLegacyFields(client);
  if (existingFields.length === 0) {
    console.log("  · alle legacy velden al opgeruimd — niets te doen");
    return;
  }

  console.log(`  · gevonden legacy velden: ${existingFields.join(", ")}`);

  // ─── 2. Veiligheidsnet — telt non-zero/non-null data ──────────
  const force = process.env[FORCE_ENV_VAR] === "true";
  const dataCount = await countCampaignsWithLegacyData(client, existingFields);

  if (dataCount > 0 && !force) {
    console.error("");
    console.error("  ╔══════════════════════════════════════════════════════════════════╗");
    console.error("  ║  ⛔ ABORT — Gevonden " + String(dataCount).padStart(3) + " campagne(s) met data in legacy velden.   ║");
    console.error("  ╚══════════════════════════════════════════════════════════════════╝");
    console.error("");
    console.error("  De volgende velden bevatten nog non-zero/non-null waarden:");
    console.error("    " + existingFields.join(", "));
    console.error("");
    console.error("  Voordat je deze velden verwijdert:");
    console.error("    1. Controleer in Directus admin → Donation Campaigns of er");
    console.error("       campagnes zijn met bedragen in goal_amount of raised_amount");
    console.error("       (in EUROCENTEN), of strings in *_display velden.");
    console.error("    2. Vul voor elke campagne het overeenkomstige euro-veld in:");
    console.error("         goal_amount    (cents) → goal_amount_eur    (euro's, /100)");
    console.error("         raised_amount  (cents) → manual_raised_amount_eur");
    console.error("    3. *_display velden: handmatig kopiëren als context nodig is");
    console.error("       (er is geen euro-equivalent — auto-format uit goal_amount_eur).");
    console.error("");
    console.error("  Wil je TOCH doorgaan en data permanent verliezen?");
    console.error("  Zet de environment variable en run opnieuw:");
    console.error("    Bash:        FORCE_LEGACY_CLEANUP=true npm run seed -- --only 57");
    console.error("    PowerShell:  $env:FORCE_LEGACY_CLEANUP=\"true\"; npm run seed -- --only 57");
    console.error("");
    throw new Error(
      `Stap 57 afgebroken — ${dataCount} campagne(s) hebben nog data in legacy velden. ` +
      `Migreer data of zet ${FORCE_ENV_VAR}=true om door te gaan.`,
    );
  }

  if (dataCount > 0 && force) {
    console.warn(`  ⚠  ${FORCE_ENV_VAR}=true actief — ${dataCount} campagne(s) met legacy data worden NU verwijderd`);
  } else {
    console.log("  · geen campagnes met legacy data — veilig om te verwijderen");
  }

  // ─── 3. Velden verwijderen ────────────────────────────────────
  for (const field of existingFields) {
    await deleteField(client, field);
  }

  console.log("✓ Stap 57 voltooid");
}

// ─── Helpers ─────────────────────────────────────────────────────

async function listExistingLegacyFields(client) {
  const existing = [];
  for (const field of LEGACY_FIELDS) {
    try {
      await client.get(`/fields/${COLLECTION}/${field}`);
      existing.push(field);
    } catch (err) {
      // 404 = veld bestaat niet — al opgeruimd
      const msg = err?.message || "";
      if (msg.includes("404") || msg.includes("FORBIDDEN") || msg.includes("not found")) {
        // verwacht — niet loggen
      } else {
        console.warn(`  ⚠  lookup ${field} faalde: ${msg}`);
      }
    }
  }
  return existing;
}

/**
 * Telt campagnes die nog data hebben in de op te ruimen velden.
 * Doet één query per veld want OR-filters over verschillende velden
 * leveren onnodig complexe Directus-queries op.
 *
 * Returnt het aantal UNIEKE campagne-id's (set-deduplicatie).
 */
async function countCampaignsWithLegacyData(client, fields) {
  const dirtyIds = new Set();

  for (const field of fields) {
    const isString = field.endsWith("_display");
    // String: _nnull (niet null EN niet lege string). Numeric: _gt 0.
    const filter = isString
      ? `filter[${field}][_nnull]=true&filter[${field}][_neq]=`
      : `filter[${field}][_gt]=0`;

    try {
      const resp = await client.get(
        `/items/${COLLECTION}?${filter}&fields=id&limit=-1`,
      );
      const rows = resp?.data || [];
      for (const row of rows) {
        if (row?.id !== undefined && row?.id !== null) {
          dirtyIds.add(String(row.id));
        }
      }
    } catch (err) {
      console.warn(`  ⚠  data-count voor ${field} faalde: ${err?.message ?? err}`);
      // Bij lookup-fout: behandel veilig — accepteer dat we niet zeker
      // weten of er data is, force-flag is nog steeds vereist.
      dirtyIds.add(`__lookup_failed_${field}__`);
    }
  }

  return dirtyIds.size;
}

async function deleteField(client, field) {
  try {
    await client.delete(`/fields/${COLLECTION}/${field}`);
    console.log(`  ✓ ${COLLECTION}.${field} verwijderd`);
  } catch (err) {
    const msg = err?.message || "";
    if (msg.includes("404")) {
      console.log(`  · ${COLLECTION}.${field} bestond al niet meer — overgeslagen`);
    } else {
      console.warn(`  ⚠  DELETE ${COLLECTION}.${field} faalde: ${msg}`);
    }
  }
}
