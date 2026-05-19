// components/contact/ContactMap.tsx
//
// Server-component voor de Google Maps-integratie op /contact.
// Render-strategie:
//   1. embed_url wordt strikt gevalideerd: alleen https:// op een
//      Google Maps host (whitelist). Andere URLs → niet renderen.
//   2. iframe is responsive (aspect-video), heeft loading=lazy en
//      verbeterde privacy-headers.
//   3. place_url (knop) idem strikt gevalideerd.
//   4. Niets renderen als enabled=false of embed_url ongeldig is —
//      caller hoeft niet te checken, deze component is self-guarded.

import { MapPin, ExternalLink } from "lucide-react";

interface ContactMapProps {
  enabled?:      boolean | null;
  embedUrl?:     string | null;
  placeUrl?:     string | null;
  addressLabel?: string | null;
}

/**
 * Whitelist voor Google Maps embed-URLs.
 *
 * Geaccepteerde hosts (alle https):
 *   - www.google.com/maps/embed       (officiële embed)
 *   - www.google.com/maps             (sommige gegenereerde share-URLs)
 *   - maps.google.com                 (legacy)
 *   - www.google.<tld>/maps/embed     (lokale TLDs zoals .nl)
 *
 * Geen javascript:, geen data:, geen andere hosts.
 */
function isValidEmbedUrl(raw: string | null | undefined): raw is string {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();
  // Whitelist: google.com en regionale TLDs, plus legacy maps.google.com
  const googleHost = /^(?:www\.)?google\.[a-z.]{2,8}$/i.test(host);
  const mapsHost   = host === "maps.google.com" || /^maps\.google\.[a-z.]{2,8}$/i.test(host);
  if (!googleHost && !mapsHost) return false;

  // Path moet /maps/embed of /maps zijn — niet /search of /url.
  if (googleHost && !/^\/maps(\/embed)?(\/|$)/.test(parsed.pathname)) return false;
  return true;
}

/**
 * Place-URL whitelist (knop). Strenger: alleen Google Maps + Google's
 * korte maps.app.goo.gl en goo.gl/maps.
 */
function isValidPlaceUrl(raw: string | null | undefined): raw is string {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host === "maps.google.com" ||
    /^(?:www\.)?google\.[a-z.]{2,8}$/i.test(host) ||
    /^maps\.google\.[a-z.]{2,8}$/i.test(host)
  );
}

export default function ContactMap({
  enabled,
  embedUrl,
  placeUrl,
  addressLabel,
}: ContactMapProps) {
  if (!enabled) return null;
  if (!isValidEmbedUrl(embedUrl)) return null;

  const showPlaceButton = isValidPlaceUrl(placeUrl);

  return (
    <div className="bg-white rounded-2xl border border-sand-200 overflow-hidden">
      {/* iframe — aspect-video houdt verhouding mobile + desktop netjes */}
      <div className="relative aspect-video w-full bg-sand-50">
        <iframe
          src={embedUrl}
          title={addressLabel || "Locatie op Google Maps"}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>

      {/* Onder de kaart: optioneel adres-label + knop */}
      {(addressLabel || showPlaceButton) && (
        <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
          {addressLabel && (
            <div className="flex items-center gap-2 text-sm font-body text-taupe-dark">
              <MapPin className="w-4 h-4 text-slate-mosque shrink-0" />
              <span>{addressLabel}</span>
            </div>
          )}
          {showPlaceButton && (
            <a
              href={placeUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-slate-mosque text-white px-4 py-2 text-sm font-body hover:bg-slate-dark transition-colors"
            >
              Open in Google Maps
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
