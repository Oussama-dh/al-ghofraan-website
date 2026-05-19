// scripts/seed/steps/38-education-categories.mjs
//
// Maakt:
//   - `education_categories` collectie (zelfde patroon als video_categories
//     en article_categories — stappen 23/24)
//   - veld op `education_programs`:
//       - category_ref (M2O naar education_categories)
//
// Idempotent. Bestaande education_programs worden NIET gemigreerd of
// overschreven; `target_group` blijft bestaan en wordt nog steeds als
// badge getoond op de cards.
//
// Public read voor education_categories status=published wordt door
// 02-permissions geregeld.
//
// GEEN default categorieën — beheerder vult zelf via Directus admin.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

// ─── Helper: zorg dat een Directus-relatie-record bestaat ────────
// Identiek aan het patroon uit stap 15 / 23 / 24. Idempotent.
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

export async function setupEducationCategories(client) {
  console.log("\n🎓 Stap 38 · education_categories collectie + category_ref op education_programs");

  // ─── 1. Collectie ──────────────────────────────────────────
  await ensureCollection(client, {
    collection: "education_categories",
    meta: {
      icon:             "school",
      note:
        "Categorieën voor onderwijsprogramma's. Beheerder maakt deze zelf aan. " +
        "Alleen 'Gepubliceerd' + 'Actief' verschijnen als filter op /onderwijs.",
      display_template: "{{name}} ({{status}})",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, "education_categories", {
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

  await ensureField(client, "education_categories", {
    field: "name",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "education_categories", {
    field: "slug",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      options:   { slug: true, trim: true },
      special:   ["slug"],
      required:  true,
      note:      "Wordt gebruikt in /onderwijs?category=... URL.",
    },
    schema:{ is_nullable: false, is_unique: true },
  });

  await ensureField(client, "education_categories", {
    field: "description",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "education_categories", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input", note: "Lager = eerder in de filterlijst." },
    schema:{},
  });

  await ensureField(client, "education_categories", {
    field: "active",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean" },
    schema:{ default_value: true, is_nullable: false },
  });

  await ensureField(client, "education_categories", {
    field: "created_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-created"] },
    schema:{},
  });

  // ─── 2. Velden op education_programs ──────────────────────
  // category_ref is een M2O naar education_categories. Bestaande programma's
  // hebben dit veld leeg en blijven werken — ze verschijnen in "Alle" maar
  // niet onder een specifieke categorie-filter.
  await ensureField(client, "education_programs", {
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
      note:
        "Optioneel — categoriseer dit programma voor de filterknoppen op /onderwijs. " +
        "Het bestaande veld 'target_group' blijft als badge zichtbaar op de cards.",
    },
    schema: { foreign_key_table: "education_categories" },
  });

  // M2O relation entry — zelfde vorm als videos.category_ref (stap 24).
  // `one_field: null` voorkomt een alias-veld op education_categories.
  // `on_delete: SET NULL` zorgt dat als beheerder een categorie verwijdert,
  // gekoppelde programma's gewoon "ongecategoriseerd" worden (verschijnen
  // in "Alle"), niet cascade-verwijderd.
  await ensureRelation(client, {
    collection:         "education_programs",
    field:              "category_ref",
    related_collection: "education_categories",
    meta: {
      one_field:           null,
      sort_field:          null,
      one_deselect_action: "nullify",
    },
    schema: { on_delete: "SET NULL" },
  });

  console.log("✓ Stap 38 voltooid");
}
