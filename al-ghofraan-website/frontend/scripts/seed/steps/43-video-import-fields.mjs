// scripts/seed/steps/43-video-import-fields.mjs
//
// Voegt idempotent 4 import-velden toe aan de `videos` collectie zodat
// het YouTube-import script (scripts/import-youtube-videos.mjs) nieuwe
// video's kan opslaan zonder dubbele records te maken en met
// herkenbare provenance.
//
//   - youtube_video_id  (string, 11 chars) — primaire dedup-key.
//   - thumbnail_url     (string)            — gecachte thumbnail-URL,
//                                              vermijdt elke request tijdens render.
//   - imported_from     (string)            — bron, bv. "youtube-rss:channel:UC..."
//   - imported_at       (timestamp)         — wanneer het script de rij heeft aangemaakt.
//
// Backward compatibility:
//   - Bestaande video's krijgen NULL voor deze velden — geen migratie.
//   - Bestaande velden (youtube_url, published_at) blijven leidend voor
//     de website. Deze import-velden zijn een aanvulling, geen vervanging.
//
// Privacy / dedup-strategie:
//   - youtube_video_id is uniek per YouTube-video (11 chars, [A-Za-z0-9_-]).
//   - Het import-script zoekt op youtube_video_id; alleen wanneer leeg
//     valt het terug op youtube_url match. Zo blijven oude handmatige
//     items findbaar.

import { ensureField } from "../lib/helpers.mjs";

export async function setupVideoImportFields(client) {
  console.log("\n📺 Stap 43 · YouTube-import velden op videos");

  await ensureField(client, "videos", {
    field: "youtube_video_id",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:
        "YouTube video-ID (11 tekens). Wordt automatisch gevuld door het " +
        "import-script en gebruikt om dubbele imports te voorkomen. Bestaande " +
        "video's mogen leeg blijven; de website gebruikt nog steeds youtube_url.",
    },
    schema: {},
  });

  await ensureField(client, "videos", {
    field: "thumbnail_url",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Volledige URL naar de YouTube-thumbnail (i.ytimg.com). " +
        "Wordt gevuld door het import-script. Mag leeg blijven — frontend " +
        "leidt dan zelf af uit youtube_video_id.",
    },
    schema: {},
  });

  await ensureField(client, "videos", {
    field: "imported_from",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      readonly:  true,
      note:
        "Bron van import (bv. 'youtube-rss:channel:UC...'). Readonly — " +
        "wordt gezet door scripts/import-youtube-videos.mjs.",
    },
    schema: {},
  });

  await ensureField(client, "videos", {
    field: "imported_at",
    type:  "timestamp",
    meta: {
      width:     "half",
      interface: "datetime",
      readonly:  true,
      note: "Wanneer het import-script deze video heeft aangemaakt.",
    },
    schema: {},
  });

  console.log("✓ Stap 43 voltooid");
}
