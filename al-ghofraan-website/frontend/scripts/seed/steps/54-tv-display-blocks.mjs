// scripts/seed/steps/54-tv-display-blocks.mjs
//
// Delivery A — TV-display uitbreiding met:
//   1. Donatiecampagne + QR-code slide
//   2. Eerstvolgende activiteit slide
//
// Schema-wijzigingen:
//
//   donation_campaigns.show_on_tv  (boolean, default false)
//     Aparte toggle van show_on_homepage — beheerder kiest expliciet
//     wat op TV verschijnt. Bij meerdere actieve campagnes: featured →
//     sort → title.
//
//   site_settings.tv_show_donation_campaign      (boolean, default true)
//     Master-toggle voor donatiecampagne-slide op TV.
//
//   site_settings.tv_show_next_activity          (boolean, default false)
//     Master-toggle voor eerstvolgende-activiteit-slide op TV.
//     Default UIT (klein-en-veilig: niets verandert tot admin aanzet).
//
//   site_settings.tv_activity_lookahead_days     (integer, default 7)
//     "Toon activiteit alleen als deze binnen X dagen valt".
//     0 = altijd tonen. Voorkomt dat activiteit over maanden eindeloos
//     op TV blijft staan.
//
// Public read permission:
//   - donation_campaigns whitelist krijgt `show_on_tv` erbij (idempotente
//     PATCH op productie-permission, zelfde patroon als stap 52).
//   - Synchronisatie-truth: 3 plekken houden dezelfde lijst — seed 02
//     bron-definitie, seed 54 productie-patch, en lib/directus.ts
//     CAMPAIGN_FIELDS. Allen aangepast in deze delivery.
//   - GEEN nieuwe public-read voor nieuwe collecties (geen nieuwe
//     collecties in deze delivery).
//
// HARDE GARANTIES:
//   - Géén nieuwe collecties of relations.
//   - Géén nieuwe dependencies (qrcode bestaat al).
//   - Géén delete-permissions.
//   - Géén wijziging aan stap 02 PERMISSIONS op productie — alleen
//     idempotente PATCH op donation_campaigns fields-whitelist.
//   - Idempotent: tweede run = no-op.
//   - manual_raised_note blijft uitgesloten van publieke leesbaarheid.

import { ensureField } from "../lib/helpers.mjs";

const POLICY_NAME = "Public";

// Houd IDENTIEK aan:
//   - scripts/seed/steps/02-permissions.mjs DONATION_CAMPAIGN_PUBLIC_FIELDS
//   - lib/directus.ts CAMPAIGN_FIELDS (minus admin-only manual_raised_note)
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
  // Delivery TV-A — show_on_tv toegevoegd aan publieke whitelist.
  "show_on_tv",
  // BEWUST UITGESLOTEN: manual_raised_note (interne admin-notitie).
];

export async function setupTvDisplayBlocks(client) {
  console.log("\n📺 Stap 54 · TV-display: donatiecampagne + QR + eerstvolgende activiteit");

  // ─── donation_campaigns.show_on_tv ────────────────────────────

  await ensureField(client, "donation_campaigns", {
    field: "show_on_tv",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Aan = deze campagne verschijnt als slide op /gebedstijden/tv " +
        "met QR-code naar /doneren?campaign=<slug>. " +
        "Apart van 'show_on_homepage' — kan dezelfde of andere campagne zijn. " +
        "Bij meerdere actieve campagnes wint volgorde: featured → sort → title. " +
        "Master-toggle 'tv_show_donation_campaign' in site_settings moet " +
        "ook aan staan.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  // ─── site_settings.tv_show_donation_campaign ──────────────────

  await ensureField(client, "site_settings", {
    field: "tv_show_donation_campaign",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Master-toggle voor donatiecampagne-slide op /gebedstijden/tv. " +
        "Aan = TV toont een slide met de actieve campagne en QR-code " +
        "(mits een campagne 'show_on_tv' aan heeft staan). " +
        "Uit = geen donatieblok op TV, ongeacht campagne-instelling.",
    },
    schema: { default_value: true, is_nullable: false },
  });

  // ─── site_settings.tv_show_next_activity ──────────────────────

  await ensureField(client, "site_settings", {
    field: "tv_show_next_activity",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Master-toggle voor eerstvolgende-activiteit-slide op " +
        "/gebedstijden/tv. Aan = TV toont een slide met de " +
        "eerstvolgende gepubliceerde activiteit (titel, datum, " +
        "locatie, korte beschrijving — geen image om TV rustig te " +
        "houden). Uit = geen activiteit-slide op TV. " +
        "Default UIT.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  // ─── site_settings.tv_activity_lookahead_days ─────────────────

  await ensureField(client, "site_settings", {
    field: "tv_activity_lookahead_days",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      note:
        "Toon eerstvolgende activiteit op TV alleen als die binnen X " +
        "dagen valt. 0 = altijd tonen, ongeacht hoe ver in de toekomst. " +
        "Voorkomt dat een activiteit over maanden eindeloos op TV " +
        "blijft hangen. Default 7 dagen.",
    },
    schema: { default_value: 7, is_nullable: false },
  });

  // ─── Public-permission whitelist patch ────────────────────────
  //
  // Verfijning op de bestaande donation_campaigns public-read permission:
  // voeg `show_on_tv` toe aan fields-whitelist. Identieke logica als
  // stap 52 — idempotente PATCH met vergelijking van huidige array.

  await patchDonationCampaignPublicFields(client);

  console.log("✓ Stap 54 voltooid");
}

// ─── Helpers ────────────────────────────────────────────────────

async function patchDonationCampaignPublicFields(client) {
  // 1. Public policy
  const publicPolicy = await findPublicPolicy(client);
  if (!publicPolicy) {
    console.warn("  ⚠️  Public-policy niet gevonden — fields-whitelist patch overgeslagen. Run eerst seed 02.");
    return;
  }

  // 2. Huidige read-permission ophalen
  let permission;
  try {
    const resp = await client.get(
      `/permissions` +
      `?filter[policy][_eq]=${publicPolicy.id}` +
      `&filter[collection][_eq]=donation_campaigns` +
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
      "  · Geen public read-permission voor donation_campaigns gevonden — " +
      "fields-whitelist patch overgeslagen. Run eerst seed 02."
    );
    return;
  }

  // 3. Vergelijk huidige fields met desired whitelist
  const currentFields = Array.isArray(permission.fields) ? permission.fields : [];
  const desiredFields = DONATION_CAMPAIGN_PUBLIC_FIELDS;

  const currentSorted = [...currentFields].sort();
  const desiredSorted = [...desiredFields].sort();
  const isSame =
    currentSorted.length === desiredSorted.length &&
    currentSorted.every((f, i) => f === desiredSorted[i]);

  if (isSame) {
    console.log("  · donation_campaigns fields-whitelist al up-to-date — geen actie");
    return;
  }

  // 4. Audit-log wat verandert
  const removed = currentFields.filter((f) => !desiredFields.includes(f));
  const added   = desiredFields.filter((f) => !currentFields.includes(f));

  if (currentFields.length === 1 && currentFields[0] === "*") {
    console.log(`  · Huidige fields: ["*"] (alles publiek) → vervangen door whitelist van ${desiredFields.length} velden`);
  } else {
    console.log(`  · Verwijderd uit publieke whitelist: ${removed.length > 0 ? removed.join(", ") : "(niets)"}`);
    console.log(`  · Toegevoegd aan publieke whitelist:  ${added.length > 0 ? added.join(", ") : "(niets)"}`);
  }

  // 5. PATCH alleen fields; permissions/validation/presets ongemoeid
  try {
    await client.patch(`/permissions/${permission.id}`, {
      fields: desiredFields,
    });
    console.log("  ✓ donation_campaigns public read whitelist toegepast — show_on_tv nu publiek leesbaar");
  } catch (err) {
    console.warn(`  ⚠️  PATCH faalde: ${err.message}`);
  }
}

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
