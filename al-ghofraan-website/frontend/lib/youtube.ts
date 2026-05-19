// lib/youtube.ts
//
// YouTube-specifieke helpers voor thumbnails en watch-URLs. Gebruikt
// door zowel het import-script (Node) als de frontend (React). Pure
// functies, zero dependencies.
//
// We hergebruiken extractYouTubeId / isValidYouTubeId logica uit
// lib/utils.ts; deze module bevat alleen het nieuwe deel (thumbnails +
// watch-URL constructor).

import { extractYouTubeId } from "@/lib/utils";

/**
 * Beschikbare thumbnail-resoluties op i.ytimg.com.
 *
 *   - default    = 120×90
 *   - mqdefault  = 320×180
 *   - hqdefault  = 480×360  (default voor onze cards; altijd beschikbaar)
 *   - sddefault  = 640×480  (niet altijd beschikbaar, kan 404 geven)
 *   - maxresdefault = 1280×720 (alleen voor HD uploads, kan 404 geven)
 *
 * We kiezen `hqdefault` als veilige default — beschikbaar voor elke
 * upload, sneller te laden dan maxres, scherper dan mq op retina.
 */
export type YouTubeThumbnailQuality =
  | "default" | "mqdefault" | "hqdefault" | "sddefault" | "maxresdefault";

/**
 * Bouw een YouTube-thumbnail URL voor een gegeven video-ID.
 * Retourneert null als de ID ongeldig is.
 *
 * Vermijd het rechtstreeks ophalen van de afbeelding via fetch — laat
 * de browser dat doen via <img src=…>. i.ytimg.com is een publieke CDN.
 */
export function buildYouTubeThumbnailUrl(
  videoId: string | null | undefined,
  quality: YouTubeThumbnailQuality = "hqdefault",
): string | null {
  if (!videoId || typeof videoId !== "string") return null;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Bouw een YouTube-thumbnail URL uit een willekeurige YouTube-URL
 * (watch, shorts, embed, youtu.be). Geeft null als de URL niet parsebaar is.
 */
export function buildYouTubeThumbnailUrlFromUrl(
  youtubeUrl: string | null | undefined,
  quality: YouTubeThumbnailQuality = "hqdefault",
): string | null {
  const id = extractYouTubeId(youtubeUrl);
  return buildYouTubeThumbnailUrl(id, quality);
}

/**
 * Canonieke watch-URL voor een video-ID. Wordt gebruikt door het
 * import-script en als fallback in cards.
 */
export function buildYouTubeWatchUrl(videoId: string | null | undefined): string | null {
  if (!videoId || typeof videoId !== "string") return null;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}
