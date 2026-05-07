// scripts/seed/steps/16-articles.mjs
//
// Maakt de articles collectie aan + één voorbeeldartikel als draft.
// Public read voor status=published wordt door 02-permissions geregeld.

import { ensureCollection, ensureField, upsertItem } from "../lib/helpers.mjs";

export async function setupArticles(client) {
  console.log("\n📰 Stap 16 · articles collectie");

  await ensureCollection(client, {
    collection: "articles",
    meta: {
      icon:             "article",
      note:             "Artikelen die op /artikelen verschijnen.",
      display_template: "{{title}} ({{status}})",
      sort_field:       "-published_at",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, "articles", {
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

  await ensureField(client, "articles", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "articles", {
    field: "slug",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      options:   { slug: true, trim: true },
      special:   ["slug"],
      required:  true,
    },
    schema:{ is_nullable: false, is_unique: true },
  });

  await ensureField(client, "articles", {
    field: "excerpt",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-multiline",
      note:      "Korte samenvatting (1-2 zinnen) voor de overzichtspagina en social previews.",
    },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "body",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-rich-text-html",
      note:      "Hoofdtekst van het artikel.",
    },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "image",
    type:  "uuid",
    meta:  { width: "full", interface: "file-image", special: ["file"] },
    schema:{ foreign_key_table: "directus_files" },
  });

  await ensureField(client, "articles", {
    field: "author_name",
    type:  "string",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "category",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Bv. 'Lezing', 'Nieuws', 'Reflectie'. Vrij tekstveld.",
    },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "tags",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      note:      "Komma-gescheiden tags, bv. 'ramadan,gemeenschap,jongeren'.",
    },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "published_at",
    type:  "timestamp",
    meta:  {
      width:     "half",
      interface: "datetime",
      note:      "Datum waarop het artikel is/wordt gepubliceerd. Wordt gebruikt voor sortering.",
    },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "seo_title",
    type:  "string",
    meta:  { width: "full", interface: "input", note: "Optioneel — overschrijft default SEO-titel." },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "seo_description",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "featured",
    type:  "boolean",
    meta:  { width: "half", interface: "boolean", note: "Uitgelichte artikelen verschijnen bovenaan op /artikelen." },
    schema:{ default_value: false, is_nullable: false },
  });

  await ensureField(client, "articles", {
    field: "sort",
    type:  "integer",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "created_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-created"] },
    schema:{},
  });

  await ensureField(client, "articles", {
    field: "updated_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-updated"] },
    schema:{},
  });

  // ─── Voorbeeld-item (draft) ───────────────────────────────
  await upsertItem(client, "articles", "slug", "welkom-bij-de-dawahcommissie", {
    slug:        "welkom-bij-de-dawahcommissie",
    title:       "Welkom bij de DawahCommissie",
    excerpt:     "Een korte introductie tot het werk van de DawahCommissie van moskee Al-Ghofraan en wat u kunt verwachten.",
    body:
      "<p>Beste lezer, <em>assalaamoe alaikoem</em>. Op deze plek delen we " +
      "regelmatig artikelen over onderwerpen die spelen binnen onze gemeenschap " +
      "— van praktische uitleg tot reflecties op actuele thema's.</p>" +
      "<p>Heeft u zelf een idee voor een artikel? Neem dan contact met ons op.</p>",
    author_name: "DawahCommissie",
    category:    "Nieuws",
    tags:        "welkom,gemeenschap",
    status:      "draft",
    featured:    false,
    sort:        10,
  });

  console.log("✓ Stap 16 voltooid (voorbeeldartikel staat op 'draft' — activeer in Directus om live te zetten)");
}
