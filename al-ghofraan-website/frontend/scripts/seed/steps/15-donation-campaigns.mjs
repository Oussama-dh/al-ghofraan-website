// scripts/seed/steps/15-donation-campaigns.mjs
//
// Maakt de donation_campaigns collectie aan + de M2O relatie naar
// donations.campaign. Geen voorbeelddata — admin maakt zelf doelen aan.
//
// Public read voor status=published wordt door 02-permissions geregeld
// (donation_campaigns moet daar in COLLECTIONS staan).

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

async function ensureRelation(client, def) {
  const { collection, field, related_collection } = def;
  let existing;
  try {
    const resp = await client.get(`/relations/${collection}/${field}`);
    existing = resp?.data;
  } catch {
    existing = null;
  }

  if (
    existing &&
    existing.collection         === collection &&
    existing.field              === field &&
    existing.related_collection === related_collection
  ) {
    console.log(`  · relatie ${collection}.${field} → ${related_collection} bestaat al`);
    return false;
  }

  try {
    await client.post("/relations", def);
    console.log(`  ✓ relatie ${collection}.${field} → ${related_collection} aangemaakt`);
    return true;
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("already exists") || msg.includes("RECORD_NOT_UNIQUE")) {
      console.log(`  · relatie ${collection}.${field} bestond al (andere vorm)`);
      return false;
    }
    console.warn(`  ⚠️  relatie ${collection}.${field} aanmaken mislukt: ${msg}`);
    return false;
  }
}

export async function setupDonationCampaigns(client) {
  console.log("\n🎯 Stap 15 · donation_campaigns collectie + donations.campaign relatie");

  // ─── donation_campaigns collectie ─────────────────────────
  await ensureCollection(client, {
    collection: "donation_campaigns",
    meta: {
      icon:             "campaign",
      note:             "Donatiedoelen die op /doneren als keuze verschijnen.",
      display_template: "{{title}} ({{status}})",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, "donation_campaigns", {
    field: "status",
    type:  "string",
    meta: {
      width:     "full",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Gepubliceerd", value: "published" },
          { text: "Concept",       value: "draft"     },
          { text: "Gearchiveerd",  value: "archived"  },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "Gepubliceerd", value: "published", foreground: "#FFFFFF", background: "#2ECDA7" },
          { text: "Concept",       value: "draft",     foreground: "#18222F", background: "#D3DAE4" },
          { text: "Gearchiveerd",  value: "archived",  foreground: "#FFFFFF", background: "#A2B5CD" },
        ],
      },
    },
    schema: { default_value: "draft", is_nullable: false },
  });

  await ensureField(client, "donation_campaigns", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "donation_campaigns", {
    field: "slug",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      options:   { slug: true, trim: true },
      special:   ["slug"],
      required:  true,
      note:      "URL-segment, automatisch uit titel gegenereerd. Bv. 'ramadan-iftar-2026'.",
    },
    schema:{ is_nullable: false, is_unique: true },
  });

  await ensureField(client, "donation_campaigns", {
    field: "description",
    type:  "text",
    meta:  { width: "full", interface: "input-rich-text-html", note: "Korte uitleg waarom dit doel belangrijk is." },
    schema:{},
  });

  await ensureField(client, "donation_campaigns", {
    field: "image",
    type:  "uuid",
    meta:  { width: "full", interface: "file-image", special: ["file"] },
    schema:{ foreign_key_table: "directus_files" },
  });

  // Delivery 57 — legacy cent-velden goal_amount en goal_amount_display
  // worden NIET meer aangemaakt op fresh installs. Beheerders gebruiken
  // uitsluitend goal_amount_eur (in euro's, niet cents). Op productie
  // installs waar deze velden al bestaan, ruimt scripts/seed/steps/
  // 57-donation-campaigns-legacy-cleanup.mjs ze idempotent op.
  //
  // ensureField(donation_campaigns, goal_amount)        — verwijderd in delivery 57
  // ensureField(donation_campaigns, goal_amount_display) — verwijderd in delivery 57

  await ensureField(client, "donation_campaigns", {
    field: "allow_one_time",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Sta eenmalige donaties toe voor dit doel." },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "donation_campaigns", {
    field: "allow_monthly",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Sta maandelijkse donaties toe voor dit doel." },
    schema:{ default_value: false, is_nullable: false },
  });

  await ensureField(client, "donation_campaigns", {
    field: "suggested_amounts",
    type:  "json",
    meta:  {
      width:     "full",
      interface: "input-code",
      options:   { language: "json" },
      note:      "Vaste-bedrag-knoppen op /doneren — JSON array in EURO'S, bv. [5, 10, 25, 50, 100]. Laat leeg voor standaard set.",
    },
    schema:{},
  });

  await ensureField(client, "donation_campaigns", {
    field: "default_amount",
    type:  "integer",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Voorgeselecteerd bedrag in EURO'S (bv. 25 voor €25). Laat leeg om Stripe-default (€25) te gebruiken.",
    },
    schema:{},
  });

  await ensureField(client, "donation_campaigns", {
    field: "featured",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Toon deze campagne extra prominent." },
    schema:{ default_value: false, is_nullable: false },
  });

  await ensureField(client, "donation_campaigns", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input", note: "Lager getal = bovenaan." },
    schema:{},
  });

  await ensureField(client, "donation_campaigns", {
    field: "created_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-created"] },
    schema:{},
  });

  // ─── donations.campaign + campaign_slug + campaign_title ──
  // Directus maakt voor een nieuwe collectie standaard een integer auto-increment id aan.
  // Daarom gebruiken we hier 'integer' i.p.v. 'uuid' — anders krijgen we
  // dezelfde fout als bij registrations: "invalid input syntax for type uuid".
  await ensureField(client, "donations", {
    field: "campaign",
    type:  "integer",
    meta:  {
      width:     "half",
      interface: "select-dropdown-m2o",
      special:   ["m2o"],
      options:   { template: "{{title}}" },
      readonly:  true,
      note:      "Gekoppelde campagne — automatisch ingevuld bij donatie. Leeg = algemene donatie.",
    },
    schema:{ foreign_key_table: "donation_campaigns" },
  });

  await ensureField(client, "donations", {
    field: "campaign_slug",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      readonly:  true,
      note:      "Slug van de campagne ten tijde van donatie — historisch correct ook bij latere wijzigingen.",
    },
    schema:{},
  });

  await ensureField(client, "donations", {
    field: "campaign_title",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      readonly:  true,
      note:      "Titel van de campagne ten tijde van donatie. 'Algemene donatie' als geen campagne gekozen.",
    },
    schema:{},
  });

  // ─── M2O relation entry ───────────────────────────────────
  // Geen one_field — voorkomt 'column donation_campaigns.donations does not
  // exist'. Filteren op een campagne gebeurt via Directus-filter op campaign.
  await ensureRelation(client, {
    collection:         "donations",
    field:              "campaign",
    related_collection: "donation_campaigns",
    meta: {
      one_field:           null,
      sort_field:          null,
      one_deselect_action: "nullify",
    },
    schema: { on_delete: "SET NULL" },
  });

  console.log("✓ Stap 15 voltooid");
}
