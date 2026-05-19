// app/api/agenda/[slug]/ics/route.ts
//
// Genereert een .ics bestand voor één activiteit, voor Apple
// Calendar / Outlook / Thunderbird en als import in Google Calendar.
//
// Waarom server-side (en niet client-side blob)?
//   - iOS Safari behandelt server-served Content-Type: text/calendar
//     veel betrouwbaarder dan een client-blob met dezelfde MIME.
//   - Eén URL die kopieerbaar is (handig voor support / hergebruik).
//   - Cachebaar per slug — geen runtime-werk per request voor populaire
//     activiteiten.
//
// Veilig:
//   - Alleen GET. Geen mutaties. Geen body.
//   - Lookup is publiek omdat activity-pagina's zelf publiek zijn.
//   - Bij ongeldig slug: 404 met plain text. Geen stack trace lek.
//
// Delivery recurring — occurrence query params:
//   - ?start=ISO&end=ISO   → gebruik exact die datums (één occurrence
//                            uit een terugkerende serie). UID krijgt
//                            occurrence-start gemixt zodat verschillende
//                            occurrences niet collideren in calendar-clients.
//   - Geen query params    → bestaand gedrag (start_date van hoofdrecord).
//   - Ongeldige query      → fail-soft, valt terug op hoofdrecord-datums.

import { NextResponse }       from "next/server";
import { getActivityBySlug }  from "@/lib/directus";
import { buildIcsContent }    from "@/lib/ics";
import { resolveActivityEnd } from "@/lib/activityCalendar";
import { getSiteUrl }         from "@/lib/utils";

export const dynamic    = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Valideer een ISO-timestamp uit query params. Strikt: alleen accepteren
 * als parseDate slaagt; defensief tegen `javascript:` of andere niet-ISO
 * payloads. Lengte-cap voorkomt extreme inputs.
 */
function parseIsoQuery(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.length > 64) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  const slug = (params?.slug || "").trim();
  if (!slug) {
    return new NextResponse("Geen activiteit-slug.", { status: 400 });
  }

  const activity = await getActivityBySlug(slug);
  if (!activity) {
    return new NextResponse("Activiteit niet gevonden.", { status: 404 });
  }

  // Delivery recurring — query params lezen, fail-soft fallback.
  const url       = new URL(request.url);
  const occStart  = parseIsoQuery(url.searchParams.get("start"));
  const occEnd    = parseIsoQuery(url.searchParams.get("end"));

  const start = occStart ?? activity.start_date;
  // Als de caller een end meegeeft, gebruik die. Anders bereken via
  // resolveActivityEnd (en als occStart wel gegeven was, gebruik daar
  // de fallback-duur van 2u zodat de occurrence consistent is).
  const end =
    occEnd ??
    (occStart
      ? resolveActivityEnd({ start_date: occStart, end_date: null })
      : resolveActivityEnd(activity));

  const ics = buildIcsContent({
    // UID bevat de occurrence-start zodat verschillende occurrences
    // van dezelfde activiteit niet als dezelfde event worden gezien
    // door calendar-clients.
    uid:         `${activity.slug}-${start}@al-ghofraan.nl`,
    start,
    end,
    title:       activity.title,
    description: activity.description || undefined,
    location:    activity.location || undefined,
    url:         `${getSiteUrl()}/agenda/${activity.slug}`,
  });

  // Filename voor browsers — ASCII-safe maken (geen umlauten/spaties).
  const safeSlug = activity.slug.replace(/[^a-z0-9-]/gi, "-");
  const filename = `agenda-${safeSlug}.ics`;

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Browser/CDN mag het 5 minuten cachen — een wijziging in
      // Directus is binnen die tijd nog geen issue. Verschillende
      // query params krijgen automatisch een eigen cache-entry.
      "Cache-Control":       "public, max-age=300",
    },
  });
}
