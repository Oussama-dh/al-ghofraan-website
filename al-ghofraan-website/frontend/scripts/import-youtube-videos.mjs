// scripts/import-youtube-videos.mjs
//
// Importeert recente YouTube-video's via RSS naar de Directus
// `videos` collectie als draft-items. Geen YouTube API key nodig.
//
// Gebruik:
//
//   node scripts/import-youtube-videos.mjs --channel-id=UCxxxxxxxxxxxxxxxxxxxxxxxx
//   node scripts/import-youtube-videos.mjs --playlist-id=PLxxxxxxxxxxxxxxxxxxxxxxxx
//
// Of via npm-script (zie package.json — niet door dit script
// aangepast):
//
//   YOUTUBE_CHANNEL_ID=UC... npm run import:youtube
//
// Het RSS-endpoint geeft de laatste ~15 video's terug. Voor het
// importeren van een complete back-catalog van een kanaal heeft RSS
// niet genoeg dekking — dat zou een YouTube Data API key vereisen.
// Voor de meest voorkomende use case ("nieuwe video's automatisch
// oppakken") is RSS prima.
//
// Eigenschappen:
//
//   - Idempotent: dedup op `youtube_video_id`. Met fallback naar match
//     op `youtube_url` voor oudere handmatige rijen.
//   - Bestaande video's worden niet overschreven. Alleen LEGE velden
//     worden aangevuld (vergelijkbaar met onze seed-upsert pattern).
//   - Nieuwe video's worden aangemaakt met `status="draft"` zodat de
//     beheerder ze in Directus controleert vóór ze live gaan.
//   - Vraagt geen YouTube API key.
//   - Geen externe dependencies — gebruikt node:fetch en een minimale
//     regex-RSS parser. Veilig voor de stabiele YouTube RSS feed-vorm.
//
// Veiligheid:
//   - Strikte validatie van CLI-arguments (alleen [A-Za-z0-9_-]).
//   - Strikte validatie van YouTube video-IDs (11 chars, [A-Za-z0-9_-]).
//   - Alleen GET-request naar youtube.com voor de feed.
//   - Geen externe URLs anders dan de feed.

import { loadEnv }     from "./seed/lib/env.mjs";
import { createClient } from "./seed/lib/client.mjs";

// ─── CLI args parsen ──────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([a-z-]+)(?:=(.*))?$/i);
    if (!m) continue;
    out[m[1]] = m[2] ?? true;
  }
  return out;
}

// Alleen letters/cijfers/dashes/underscores — voorkomt injectie in URL.
function isValidYouTubeIdent(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function isValidVideoId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id);
}

// ─── RSS fetch + parse ────────────────────────────────────

async function fetchYouTubeFeed({ channelId, playlistId }) {
  let url;
  if (channelId)  url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  if (playlistId) url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`;
  if (!url) throw new Error("Geen channel-id of playlist-id meegegeven.");

  console.log(`🌐 RSS ophalen: ${url}`);
  const resp = await fetch(url, {
    headers: { "User-Agent": "al-ghofraan-import-script/1.0" },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `RSS-request mislukt (HTTP ${resp.status}). ` +
      `Controleer of het ID klopt en publiek toegankelijk is.\n${text.slice(0, 200)}`,
    );
  }
  const xml = await resp.text();
  return parseFeed(xml);
}

/**
 * Minimale regex-parser voor YouTube's RSS-feed. We parsen ALLEEN de
 * velden die we nodig hebben en escapen niet zelf — we leggen alleen
 * de raw tekst vast. De RSS-feed is een door YouTube gegenereerde
 * bron met consistente structuur; daarom is een full XML parser hier
 * overkill.
 *
 * Per <entry> halen we:
 *   <yt:videoId>VIDEO_ID</yt:videoId>
 *   <title>...</title>
 *   <published>2026-01-15T12:00:00+00:00</published>
 *   <media:description>...</media:description>
 *   <link rel="alternate" href="..."/>
 */
function parseFeed(xml) {
  const entries = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRe.exec(xml)) !== null) {
    const block = match[1];
    const videoId    = getTag(block, "yt:videoId");
    const title      = decodeXml(getTag(block, "title")) || "";
    const published  = getTag(block, "published") || "";
    const description = decodeXml(getTag(block, "media:description")) || "";
    const link       = getAttr(block, "link", "href") || "";

    if (!isValidVideoId(videoId)) continue;

    entries.push({
      videoId,
      title:       title.trim(),
      published:   published.trim(),
      description: description.trim(),
      link:        link.trim(),
    });
  }
  return entries;
}

function getTag(block, tag) {
  const re = new RegExp(
    `<${tag.replace(/:/g, "\\:")}[^>]*>([\\s\\S]*?)<\\/${tag.replace(/:/g, "\\:")}>`,
    "i",
  );
  const m = block.match(re);
  return m ? m[1] : null;
}

function getAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const m = block.match(re);
  return m ? m[1] : null;
}

// Veilig decoderen van de paar XML-entities die we tegenkomen in titels.
function decodeXml(s) {
  if (s == null) return s;
  return s
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// ─── Directus helpers ─────────────────────────────────────

async function findExistingVideoByYouTubeId(client, youtubeId) {
  // Eerste poging: exacte match op youtube_video_id.
  const byId = await client.get(
    `/items/videos?filter[youtube_video_id][_eq]=${encodeURIComponent(youtubeId)}&limit=1`,
  );
  if (byId?.data?.[0]) return byId.data[0];

  // Fallback: match op youtube_url die het ID bevat. Vangt oudere
  // handmatig toegevoegde rijen waar youtube_video_id (nog) leeg is.
  const byUrl = await client.get(
    `/items/videos?filter[youtube_url][_contains]=${encodeURIComponent(youtubeId)}&limit=1`,
  );
  return byUrl?.data?.[0] || null;
}

function isEmpty(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);
  const channelIdArg  = typeof args["channel-id"]  === "string" ? args["channel-id"]  : null;
  const playlistIdArg = typeof args["playlist-id"] === "string" ? args["playlist-id"] : null;

  // ENV fallback voor scheduled jobs (cron / npm-script).
  const envChannel  = process.env.YOUTUBE_CHANNEL_ID  || null;
  const envPlaylist = process.env.YOUTUBE_PLAYLIST_ID || null;

  const channelId  = channelIdArg  || envChannel;
  const playlistId = playlistIdArg || envPlaylist;

  if (!channelId && !playlistId) {
    console.error(
      "❌ Geef --channel-id=UC... of --playlist-id=PL... mee, " +
      "of zet YOUTUBE_CHANNEL_ID / YOUTUBE_PLAYLIST_ID in .env.\n\n" +
      "Voorbeeld:\n" +
      "  node scripts/import-youtube-videos.mjs --channel-id=UCxxxxxxxxxxxxxxxxxxxxxxxx",
    );
    process.exit(2);
  }
  if (channelId && playlistId) {
    console.error("❌ Geef óf --channel-id óf --playlist-id, niet allebei.");
    process.exit(2);
  }
  const chosenId = channelId || playlistId;
  if (!isValidYouTubeIdent(chosenId)) {
    console.error(`❌ Ongeldig YouTube-ID: "${chosenId}" (verwacht: alleen [A-Za-z0-9_-]).`);
    process.exit(2);
  }

  // Bron-label voor `imported_from`.
  const importedFrom = channelId
    ? `youtube-rss:channel:${channelId}`
    : `youtube-rss:playlist:${playlistId}`;

  console.log("\n🎬 YouTube import — DawahCommissie\n");

  // Directus client (login via admin-credentials uit .env).
  const env = loadEnv();
  const client = await createClient(env);

  // RSS ophalen.
  const entries = await fetchYouTubeFeed({ channelId, playlistId });
  console.log(`📥 ${entries.length} video's in feed gevonden.\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of entries) {
    const existing = await findExistingVideoByYouTubeId(client, entry.videoId);

    const youtubeUrl    = entry.link || `https://www.youtube.com/watch?v=${entry.videoId}`;
    const thumbnailUrl  = `https://i.ytimg.com/vi/${entry.videoId}/hqdefault.jpg`;
    const now           = new Date().toISOString();

    if (existing) {
      // Bestaande rij: alleen LEGE velden aanvullen. We raken titel,
      // beschrijving, status NIET aan — die heeft de beheerder mogelijk
      // bewust aangepast.
      const patch = {};
      if (isEmpty(existing.youtube_video_id)) patch.youtube_video_id = entry.videoId;
      if (isEmpty(existing.youtube_url))      patch.youtube_url      = youtubeUrl;
      if (isEmpty(existing.thumbnail_url))    patch.thumbnail_url    = thumbnailUrl;
      if (isEmpty(existing.published_at))     patch.published_at     = entry.published;
      if (isEmpty(existing.imported_from))    patch.imported_from    = importedFrom;
      if (isEmpty(existing.imported_at))      patch.imported_at      = now;

      if (Object.keys(patch).length === 0) {
        console.log(`  · ${entry.videoId}  ${entry.title.slice(0, 60)} — al volledig`);
        skipped++;
        continue;
      }
      await client.patch(`/items/videos/${existing.id}`, patch);
      console.log(`  ↻ ${entry.videoId}  ${entry.title.slice(0, 60)} — aangevuld (${Object.keys(patch).join(", ")})`);
      updated++;
      continue;
    }

    // Nieuwe rij: status="draft", featured=false. Beheerder publiceert
    // zelf via Directus admin. Sortering bestaat al via `sort` veld;
    // niet zelf invullen om handmatige order te respecteren.
    const item = {
      status:           "draft",
      title:            entry.title || `YouTube video ${entry.videoId}`,
      description:      entry.description || null,
      youtube_url:      youtubeUrl,
      youtube_video_id: entry.videoId,
      thumbnail_url:    thumbnailUrl,
      published_at:     entry.published || null,
      imported_from:    importedFrom,
      imported_at:      now,
      featured:         false,
    };
    await client.post("/items/videos", item);
    console.log(`  ✓ ${entry.videoId}  ${entry.title.slice(0, 60)} — aangemaakt (draft)`);
    created++;
  }

  console.log("");
  console.log(`✅ Klaar. ${created} nieuw, ${updated} aangevuld, ${skipped} ongewijzigd.`);
  console.log("   Nieuwe video's staan op status=draft. Publiceer ze via Directus admin.");
}

main().catch((err) => {
  console.error("\n❌ Import mislukt:");
  console.error(err);
  process.exit(1);
});
