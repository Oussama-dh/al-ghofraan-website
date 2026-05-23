// lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge }               from "tailwind-merge";
import { format, parseISO }      from "date-fns";
import { nl }                    from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string, pattern = "d MMMM yyyy"): string {
  try {
    const date = parseISO(dateString);
    return format(date, pattern, { locale: nl });
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  return formatDate(dateString, "d MMM");
}

export function formatTime(dateString: string): string {
  try {
    return format(parseISO(dateString), "HH:mm", { locale: nl });
  } catch {
    return dateString;
  }
}

export function isUpcoming(dateString: string): boolean {
  return new Date(dateString) >= new Date();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "…";
}

/**
 * Formatteer een bedrag in eurocenten naar leesbare NL-tekst.
 * Gebruikt door /api/doneren/checkout en /api/stripe/webhook om
 * `donations.amount_display` te vullen met dezelfde formattering.
 *
 * Voorbeeld: 2500 → "€25,00"
 */
export function formatEurFromCents(cents: number): string {
  if (!Number.isFinite(cents)) return "";
  const euros = Math.floor(cents / 100);
  const rest  = Math.abs(cents) % 100;
  const restStr = rest.toString().padStart(2, "0");
  return `€${euros},${restStr}`;
}

/**
 * Normaliseer een telefoonnummer voor wa.me — alleen cijfers.
 * Verwijdert +, spaties, streepjes en haakjes.
 *
 * "+31 6 12345678" → "31612345678"
 */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw).replace(/\D/g, "");
}

/**
 * Bouw een wa.me URL. Geeft "" terug als nummer leeg/ongeldig is.
 */
export function buildWhatsAppUrl(
  number: string | null | undefined,
  defaultMessage?: string | null
): string {
  const normalized = normalizeWhatsAppNumber(number);
  if (!normalized) return "";
  const base = `https://wa.me/${normalized}`;
  if (defaultMessage && defaultMessage.trim()) {
    return `${base}?text=${encodeURIComponent(defaultMessage.trim())}`;
  }
  return base;
}

/**
 * Geeft de canonical site-URL terug zonder trailing slash.
 *
 * Volgorde:
 *   1. process.env.NEXT_PUBLIC_SITE_URL  (zowel server- als client-side beschikbaar)
 *   2. fallback http://localhost:3000   (alleen voor local dev / build-time)
 *
 * Gebruik dit voor alle plekken waar een ABSOLUTE URL nodig is:
 *   - Stripe success_url / cancel_url
 *   - canonical / Open Graph URLs
 *   - e-mail- of webhook-bevestigingen
 *
 * Voor interne links (bv. "/contact", "/doneren") is dit NIET nodig;
 * gebruik daar gewoon het pad.
 *
 * Bij domeinwijziging hoef je alleen NEXT_PUBLIC_SITE_URL aan te passen
 * in je productie-env (en de Stripe webhook endpoint in Stripe Dashboard).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/**
 * Haal de YouTube video-ID uit een willekeurige YouTube-URL.
 * Geeft null terug als de URL niet herkend wordt — zo kan de UI die
 * video gewoon overslaan in plaats van een runtime error te geven.
 *
 * Ondersteunde vormen:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/shorts/VIDEO_ID
 *   - https://youtube.com/shorts/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  // youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    return isValidYouTubeId(id) ? id : null;
  }

  // youtube.com / m.youtube.com / youtube-nocookie.com
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    // /watch?v=VIDEO_ID
    const v = parsed.searchParams.get("v");
    if (v && isValidYouTubeId(v)) return v;

    // /shorts/VIDEO_ID  /embed/VIDEO_ID  /v/VIDEO_ID
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["shorts", "embed", "v", "live"].includes(parts[0])) {
      return isValidYouTubeId(parts[1]) ? parts[1] : null;
    }
  }

  return null;
}

/**
 * YouTube video-IDs zijn 11 tekens [A-Za-z0-9_-]. Strikte check
 * voorkomt dat we malformed strings naar een embed-URL plakken.
 */
function isValidYouTubeId(id: string | null | undefined): boolean {
  return !!id && /^[A-Za-z0-9_-]{11}$/.test(id);
}

/**
 * Bouw een privacyvriendelijke YouTube-embed URL (no-cookie).
 * Geeft null terug als de bron-URL ongeldig is.
 */
export function buildYouTubeEmbedUrl(youtubeUrl: string | null | undefined): string | null {
  const id = extractYouTubeId(youtubeUrl);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/**
 * Strip HTML-tags en decodeer veelvoorkomende entities uit een string.
 * Bedoeld voor het weergeven van Directus rich-text velden als plain text
 * (bijvoorbeeld op de TV-route, activiteitkaarten, of in ICS-exports).
 *
 * - Vervangt <br> en </p> door whitespace voordat tags worden gestript
 *   zodat blokken niet aan elkaar plakken.
 * - Decodeer named entities (&nbsp; &amp; &lt; &gt; &quot; &apos;) en
 *   numerieke entities (&#39; &#x27;) — dekt de Directus WYSIWYG output.
 * - Collapse whitespace tot één spatie zodat de output rustig blijft op TV.
 * - Trim leading/trailing whitespace.
 *
 * NB: er bestaan al twee private `stripHtml`-helpers in `lib/ics.ts` en
 * `lib/calendar.ts` die identiek gedrag hebben. Bewust niet samengevoegd
 * in deze delivery om productie-paden voor ICS-export en calendar-link
 * niet te raken. Latere opruim-delivery kan ze hierheen laten verwijzen.
 */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/(h[1-6]|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const n = parseInt(code, 10);
      return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}
