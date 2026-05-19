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

import { NextResponse }       from "next/server";
import { getActivityBySlug }  from "@/lib/directus";
import { buildIcsContent }    from "@/lib/ics";
import { resolveActivityEnd } from "@/lib/activityCalendar";
import { getSiteUrl }         from "@/lib/utils";

export const dynamic    = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  _request: Request,
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

  const ics = buildIcsContent({
    uid:         `${activity.slug}-${activity.start_date}@al-ghofraan.nl`,
    start:       activity.start_date,
    end:         resolveActivityEnd(activity),
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
      // Directus is binnen die tijd nog geen issue.
      "Cache-Control":       "public, max-age=300",
    },
  });
}
