// scripts/seed/steps/24-video-categories.mjs
//
// Maakt:
//   - `video_categories` collectie (zelfde patroon als article_categories)
//   - velden op `videos`:
//       - category_ref (M2O naar video_categories)
//       - show_on_homepage (boolean, default false)
//       - homepage_sort (integer, optioneel)
//
// Idempotent. Bestaande videos worden NIET gemigreerd of overschreven.
// Public read voor video_categories status=published wordt door
// 02-permissions geregeld; show_on_homepage zit op de bestaande
// `videos`-collectie die al een public-read filter (`status=published`) heeft.

import { ensureCollection, ensureField, softCreateItem } from "../lib/helpers.mjs";

// ─── Helper: zorg dat een Directus-relatie-record bestaat ────────
// Zelfde patroon als donations.campaign (stap 15) en articles.category_ref (stap 23).
// Zonder dit record geeft Directus admin de "relationship not configured"-fout
// bij het openen van het M2O-veld. Idempotent.
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

export async function setupVideoCategories(client) {
  console.log("\n🎥 Stap 24 · video_categories collectie + velden op videos");

  // ─── 1. Collectie ──────────────────────────────────────────
  await ensureCollection(client, {
    collection: "video_categories",
    meta: {
      icon:             "video_library",
      note:
        "Categorieën voor video's. Beheerder maakt deze zelf aan. " +
        "Alleen 'Gepubliceerd' + 'Actief' verschijnen als filter op /videos.",
      display_template: "{{name}} ({{status}})",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, "video_categories", {
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

  await ensureField(client, "video_categories", {
    field: "name",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "video_categories", {
    field: "slug",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      options:   { slug: true, trim: true },
      special:   ["slug"],
      required:  true,
      note:      "Wordt gebruikt in /videos?category=... URL.",
    },
    schema:{ is_nullable: false, is_unique: true },
  });

  await ensureField(client, "video_categories", {
    field: "description",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "video_categories", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input", note: "Lager = eerder in de filterlijst." },
    schema:{},
  });

  await ensureField(client, "video_categories", {
    field: "active",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean" },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "video_categories", {
    field: "created_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-created"] },
    schema:{},
  });

  // ─── 2. Velden op videos ───────────────────────────────────
  await ensureField(client, "videos", {
    field: "category_ref",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "select-dropdown-m2o",
      special:   ["m2o"],
      options: {
        template: "{{name}}",
        filter:   { status: { _eq: "published" }, active: { _eq: true } },
      },
      note: "Optioneel — voor filter op /videos.",
    },
    schema: { foreign_key_table: "video_categories" },
  });

  // M2O relation entry — zelfde vorm als de andere M2O-velden.
  // `one_field: null` voorkomt alias-veld op video_categories.
  await ensureRelation(client, {
    collection:         "videos",
    field:              "category_ref",
    related_collection: "video_categories",
    meta: {
      one_field:           null,
      sort_field:          null,
      one_deselect_action: "nullify",
    },
    schema: { on_delete: "SET NULL" },
  });

  await ensureField(client, "videos", {
    field: "show_on_homepage",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Aanvinken om deze video op de homepage te tonen (max 3 worden getoond, " +
        "gesorteerd op `homepage_sort` oplopend).",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, "videos", {
    field: "homepage_sort",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Volgorde op homepage. Lager = eerder. Leeg = onderaan.",
    },
    schema: {},
  });

  // ─── 3. Soft-create defaults ───────────────────────────────
  const DEFAULTS = [
    { name: "Vrijdagpreken", slug: "vrijdagpreken", sort: 10 },
    { name: "Lezingen",      slug: "lezingen",      sort: 20 },
    { name: "Activiteiten",  slug: "activiteiten",  sort: 30 },
  ];

  for (const item of DEFAULTS) {
    await softCreateItem(client, "video_categories", "slug", item.slug, {
      ...item,
      status: "published",
      active: true,
    });
  }

  console.log("✓ Stap 24 voltooid");
}
