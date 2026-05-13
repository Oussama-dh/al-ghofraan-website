// app/gebedstijden/overzicht/page.tsx

import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero      from "@/components/sections/PageHero";
import Button from "@/components/ui/Button";
import PrayerTimesOverview from "@/components/ui/PrayerTimesOverview";
import { ChevronLeft } from "lucide-react";
import { getActivePrayerTimeFile, getInternalAssetUrl, getSiteSettings, getPageSectionsWithItems, getHijriDateOverrides, getPrayerCalendarHighlights } from "@/lib/directus";
import { parsePrayerTimesCSV } from "@/lib/prayerTimes";
import type { PrayerTimeRow } from "@/types/directus";

export const dynamic = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "Gebedstijden overzicht",
    description: settings?.default_seo_description || "Maandoverzicht van alle gebedstijden.",
  };
}

export default async function GebedstijdenOverzichtPage() {
  let allRows: PrayerTimeRow[] = [];
  let fileInfo: { title: string; year: number; uploaded_at: string } | null = null;
  let error: string | null = null;

  // Hijri-overrides parallel ophalen — falen mag, vallen we terug op pure Intl-berekening
  const hijriOverrides = await getHijriDateOverrides();
  // Delivery 21 — Kalender-highlights ophalen voor visuele markering in tabel.
  const calendarHighlights = await getPrayerCalendarHighlights();

  try {
    const prayerFile = await getActivePrayerTimeFile();

    if (prayerFile) {
      const fileId =
        typeof prayerFile.file === "string"
          ? prayerFile.file
          : (prayerFile.file as { id: string })?.id;

      if (fileId) {
        const assetUrl = getInternalAssetUrl(fileId);
        if (assetUrl) {
          const token = process.env.DIRECTUS_TOKEN;
          const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

          const isDev = process.env.NODE_ENV !== "production";
          const resp = await fetch(assetUrl, {
            headers,
            ...(isDev
              ? { cache: "no-store" as const }
              : { next: { revalidate: 3600 } }),
          });
          if (resp.ok) {
            const csv = await resp.text();
            allRows = parsePrayerTimesCSV(csv);
            fileInfo = {
              title: prayerFile.title,
              year: prayerFile.year,
              uploaded_at: prayerFile.uploaded_at,
            };
          }
        }
      }
    } else {
      error = "Geen gebedstijden-bestand gevonden. Upload een CSV-bestand via Directus.";
    }
  } catch (e) {
    console.warn("Gebedstijden laden mislukt:", e);
    error = "Gebedstijden konden niet worden geladen.";
  }

  return (
    <>
      <PageHero
        title="Gebedstijden overzicht"
        arabic="مواقيت الصلاة"
        subtitle={fileInfo ? `${fileInfo.title}` : "Maandoverzicht"}
      />

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          <Button href="/gebedstijden" variant="ghost" size="sm" className="mb-6 -ml-1">
            <ChevronLeft className="w-4 h-4" />
            Terug naar gebedstijden
          </Button>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 text-center">
              <p className="font-body text-amber-800 text-sm">{error}</p>
              <p className="font-body text-amber-700 text-xs mt-2">
                Beheerder: upload een CSV-bestand via Directus → Prayer Time Files.
              </p>
            </div>
          )}

          {allRows.length > 0 ? (
            <PrayerTimesOverview rows={allRows} hijriOverrides={hijriOverrides} highlights={calendarHighlights} />
          ) : (
            !error && (
              <div className="bg-white border border-sand-200 rounded-2xl p-8 text-center">
                <p className="font-body text-taupe-dark">
                  Geen gegevens beschikbaar.
                </p>
              </div>
            )
          )}
        </Container>
      </section>
    </>
  );
}
