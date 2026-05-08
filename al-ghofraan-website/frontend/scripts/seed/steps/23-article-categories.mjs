// scripts/seed/steps/23-article-categories.mjs
//
// Maakt de `article_categories` collectie aan en koppelt `articles.category_ref`
// als M2O. De bestaande `articles.category` (vrij tekstveld) blijft intact —
// dit zorgt dat oudere records niet breken. De frontend gebruikt
// category_ref als die ingevuld is, anders de oude string als fallback.
//
// Public read voor status=published wordt door 02-permissions geregeld.
// Idempotent — bestaande artikelen worden NIET gemigreerd of overschreven.

import { ensureCollection, ensureField, softCreateItem } from "../lib/helpers.mjs";

// ─── Helper: zorg dat een Directus-relatie-record bestaat ────────
// Net als bij donations.campaign → donation_campaigns (stap 15).
// Zonder dit record geeft Directus admin de fout
// "The relationship is not configured properly..." bij het openen
// van het M2O-veld in Data Model. De DB-kolom wordt al door
// `ensureField` aangemaakt; deze helper voegt alleen het ontbrekende
// directus_relations record toe.
//
// Idempotent: als de relatie al bestaat met dezelfde related_collection,
// gebeurt er niets.
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

export async function setupArticleCategories(client) {
  console.log("\n📂 Stap 23 · article_categories collectie + M2O op articles");

  // ─── 1. Collectie + velden ─────────────────────────────────
  await ensureCollection(client, {
    collection: "article_categories",
    meta: {
      icon:             "category",
      note:
        "Categorieën voor artikelen. Beheerder maakt deze zelf aan. " +
        "Alleen 'Gepubliceerd' + 'Actief' verschijnen als filter op /artikelen.",
      display_template: "{{name}} ({{status}})",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, "article_categories", {
    field: "status",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Gepubliceerd", value: "published" },
          { text: "Concept",      value: "draft"     },
          { text: "Gearchiveerd", value: "archived"  },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "Gepubliceerd", value: "published", foreground: "#FFFFFF", background: "#2ECDA7" },
          { text: "Concept",      value: "draft",     foreground: "#18222F", background: "#D3DAE4" },
          { text: "Gearchiveerd", value: "archived",  foreground: "#FFFFFF", background: "#A2B5CD" },
        ],
      },
    },
    schema: { default_value: "published", is_nullable: false },
  });

  await ensureField(client, "article_categories", {
    field: "name",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "article_categories", {
    field: "slug",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      options:   { slug: true, trim: true },
      special:   ["slug"],
      required:  true,
      note:      "Wordt gebruikt in /artikelen?category=... URL.",
    },
    schema:{ is_nullable: false, is_unique: true },
  });

  await ensureField(client, "article_categories", {
    field: "description",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "article_categories", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input", note: "Lager = eerder in de filterlijst." },
    schema:{},
  });

  await ensureField(client, "article_categories", {
    field: "active",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Snel uit te zetten zonder de status te wijzigen." },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "article_categories", {
    field: "created_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-created"] },
    schema:{},
  });

  // ─── 2. M2O-veld op articles ───────────────────────────────
  // BEWUST geen alias-veld op article_categories.articles (zou de bekende
  // "column does not exist"-fout in Directus 11 triggeren — zie samenvatting).
  await ensureField(client, "articles", {
    field: "category_ref",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "select-dropdown-m2o",
      special:   ["m2o"],
      options:   {
        template:    "{{name}}",
        // Alleen actieve gepubliceerde categorieën aanbieden in de admin-dropdown.
        filter:      { status: { _eq: "published" }, active: { _eq: true } },
      },
      note:
        "Gestructureerde categorie. Heeft voorrang boven het oude vrije " +
        "`category`-veld als gevuld. Bestaande artikelen blijven werken zonder.",
    },
    schema: { foreign_key_table: "article_categories" },
  });

  // M2O relation entry — zelfde vorm als donations.campaign in stap 15.
  // Zonder dit record geeft Directus admin de "relationship not configured"-
  // fout bij het openen van het category_ref-veld. `one_field: null` voorkomt
  // dat er een alias-veld op article_categories wordt aangemaakt.
  await ensureRelation(client, {
    collection:         "articles",
    field:              "category_ref",
    related_collection: "article_categories",
    meta: {
      one_field:           null,
      sort_field:          null,
      one_deselect_action: "nullify",
    },
    schema: { on_delete: "SET NULL" },
  });

  // ─── 3. Soft-create defaults — alleen als ze nog niet bestaan ──
  // Zo krijgt een nieuwe site direct een paar zinnige categorieën, zonder
  // bestaande edits te raken.
  const DEFAULTS = [
    { name: "Nieuws",     slug: "nieuws",     sort: 10 },
    { name: "Lezing",     slug: "lezing",     sort: 20 },
    { name: "Reflectie",  slug: "reflectie",  sort: 30 },
    { name: "Activiteit", slug: "activiteit", sort: 40 },
  ];

  for (const item of DEFAULTS) {
    await softCreateItem(client, "article_categories", "slug", item.slug, {
      ...item,
      status: "published",
      active: true,
    });
  }

  console.log("✓ Stap 23 voltooid");
}
