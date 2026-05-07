// scripts/seed/steps/19-videos.mjs
//
// Maakt de `videos` collectie aan met velden voor publiekelijke YouTube-videos.
// Public read voor status=published wordt door 02-permissions geregeld
// (zie COLLECTIONS-array daar).
//
// Bewust GEEN voorbeeld-items: admin maakt zelf video's aan.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

export async function setupVideos(client) {
  console.log("\n🎬 Stap 19 · videos collectie");

  await ensureCollection(client, {
    collection: "videos",
    meta: {
      icon:             "play_circle",
      note:             "Video's die op /videos verschijnen.",
      display_template: "{{title}} ({{status}})",
      sort_field:       "-featured",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, "videos", {
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

  await ensureField(client, "videos", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "videos", {
    field: "description",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-multiline",
      note:      "Korte beschrijving (1-3 zinnen) onder de video op /videos.",
    },
    schema:{},
  });

  await ensureField(client, "videos", {
    field: "youtube_url",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      required:  true,
      note:
        "Plak de volledige YouTube-URL. Ondersteunde vormen: " +
        "youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID.",
    },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "videos", {
    field: "featured",
    type:  "boolean",
    meta:  {
      width:     "half",
      interface: "boolean",
      note:      "Uitgelichte video's verschijnen bovenaan op /videos.",
    },
    schema:{ default_value: false, is_nullable: false },
  });

  await ensureField(client, "videos", {
    field: "sort",
    type:  "integer",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Lager getal verschijnt eerst (binnen featured/non-featured groep).",
    },
    schema:{},
  });

  await ensureField(client, "videos", {
    field: "published_at",
    type:  "timestamp",
    meta:  {
      width:     "half",
      interface: "datetime",
      note:      "Datum waarop de video is/wordt gepubliceerd. Wordt gebruikt voor sortering.",
    },
    schema:{},
  });

  await ensureField(client, "videos", {
    field: "created_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true, special: ["date-created"] },
    schema:{},
  });

  console.log("✓ Stap 19 voltooid (videos collectie klaar — admin voegt items zelf toe)");
}
