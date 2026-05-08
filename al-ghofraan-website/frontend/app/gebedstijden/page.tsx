// app/gebedstijden/page.tsx

import type { Metadata }          from "next";
import Container                  from "@/components/ui/Container";
import SectionTitle               from "@/components/ui/SectionTitle";
import Button                     from "@/components/ui/Button";
import PrayerTimesTable, { TodayPrayerCard } from "@/components/ui/PrayerTimesTable";
import { PageSectionsList }       from "@/components/sections/PageSectionRenderer";
import { CalendarDays }           from "lucide-react";
import {
  getActivePrayerTimeFile,
  getInternalAssetUrl,
  getPageContent,
  getSiteSettings,
  getPageSectionsWithItems,
  getHijriDateOverrides,
} from "@/lib/directus";
import {
  parsePrayerTimesCSV,
  getTodaysPrayerTimes,
  getCurrentMonthRows,
  getNextPrayerKey,
  formatPrayerFileTitle,
  getAmsterdamDateParts,
  getDayName,
} from "@/lib/prayerTimes";
import {
  buildHijriOverrideMap,
  getHijriDate,
  formatHijriShortNl,
} from "@/lib/hijri";
import type { PrayerTimeRow }     from "@/types/directus";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 3600;

const HEADER_FALLBACK = {
  title:  "Gebedstijden",
  arabic: "مواقيت الصلاة",
};

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("gebedstijden"),
    getSiteSettings(),
  ]);
  return {
    title:       page?.seo_title || page?.title || HEADER_FALLBACK.title,
    description:
      page?.seo_description ||
      settings?.default_seo_description ||
      "Bekijk de actuele gebedstijden voor dit jaar.",
  };
}

const FALLBACK_ROW: PrayerTimeRow = {
  datum:    "—",
  fajr:     "05:30",
  shoeroeq: "07:15",
  dhoehr:   "13:00",
  asr:      "16:30",
  maghrib:  "19:45",
  ishaa:    "21:15",
};

// Gebruik FALLBACK_ROW alleen voor de "highlight"-berekening;
// in de UI tonen we hem nooit als echte tijd op productie.
const SHOW_FALLBACK_PREVIEW = process.env.NODE_ENV !== "production";

export default async function GebedstijdenPage() {
  const sectionsPromise = getPageSectionsWithItems("gebedstijden");
  const pagePromise     = getPageContent("gebedstijden");

  let allRows: PrayerTimeRow[] = [];
  let monthRows: PrayerTimeRow[] = [];
  let todayRow: PrayerTimeRow | null = null;
  let fileInfo: { title: string; year: number; uploaded_at: string } | null = null;
  let error: string | null = null;

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
          const token   = process.env.DIRECTUS_TOKEN;
          const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

          const isDev = process.env.NODE_ENV !== "production";
          // Next.js verbiedt het combineren van `cache` en `next.revalidate`.
          // Dev: geen cache. Prod: alleen revalidate (geen `cache`-veld).
          const resp = await fetch(
            assetUrl,
            isDev
              ? { headers, cache: "no-store" }
              : { headers, next: { revalidate: 3600 } },
          );
          if (resp.ok) {
            const csv = await resp.text();
            allRows   = parsePrayerTimesCSV(csv);
            monthRows = getCurrentMonthRows(allRows);
            todayRow  = getTodaysPrayerTimes(allRows);
            fileInfo  = {
              title:       prayerFile.title,
              year:        prayerFile.year,
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

  const sections      = await sectionsPromise;
  const page          = await pagePromise;
  const ctaSections   = sections.filter((s) => s.type === "cta");
  const otherSections = sections.filter((s) => s.type !== "cta");

  // Bereken eerstvolgend gebed o.b.v. huidige tijd. Bij geen todayRow of
  // wanneer alle gebeden voorbij zijn → null = geen highlight (eenvoudig).
  // Bij rendering met de FALLBACK_ROW gebruiken we de fallback-row zelf
  // zodat de "volgende"-tag ook in offline state plausibel oogt.
  const rowForHighlight = todayRow || FALLBACK_ROW;
  const nextPrayerKey   = getNextPrayerKey(rowForHighlight);

  // Vandaag-header label (weekdag dd-mm)
  const todayParts = getAmsterdamDateParts();
  const dd = String(todayParts.day).padStart(2, "0");
  const mm = String(todayParts.month).padStart(2, "0");
  // Weekdag op basis van gebedstijden-rij (datum-string in CSV) als die bestaat,
  // anders zelf opbouwen vanuit Amsterdamse parts.
  const todayWeekday = todayRow
    ? getDayName(todayRow.datum)
    : (() => {
        const d = new Date(todayParts.year, todayParts.month - 1, todayParts.day);
        return ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"][d.getDay()];
      })();

  // Highlight in tabel matcht op datum-string van vandaag-rij
  const todayDatum = todayRow?.datum;

  // Hijri-datum voor vandaag (voor subtiele weergave bij vandaag-card).
  // Falen mag stil — Hijri is hier optioneel/extra.
  const hijriOverridesAll = await getHijriDateOverrides();
  const hijriOverrideMap  = buildHijriOverrideMap(hijriOverridesAll);
  const todayHijri = (() => {
    const d = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));
    return getHijriDate(d, hijriOverrideMap);
  })();
  const todayHijriLabel = todayHijri ? formatHijriShortNl(todayHijri) : null;

  // Subtitel: voorkom dubbel jaartal
  const subtitleText = fileInfo
    ? formatPrayerFileTitle(fileInfo.title, fileInfo.year)
    : "Actuele gebedstijden";

  // Toon eerste 31 rijen als fallback wanneer huidige maand leeg is
  const displayRows = monthRows.length > 0 ? monthRows : allRows.slice(0, 31);

  return (
    <>
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title={page?.title || HEADER_FALLBACK.title}
            arabic={page?.arabic_title || HEADER_FALLBACK.arabic}
            subtitle={page?.subtitle || subtitleText}
            light
          />
        </Container>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f9f7f5" />
          </svg>
        </div>
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 text-center">
              <p className="font-body text-amber-800 text-sm">{error}</p>
              <p className="font-body text-amber-700 text-xs mt-2">
                Beheerder: upload een CSV-bestand via Directus → Prayer Time Files.
              </p>
            </div>
          )}

          <div className="mb-12">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
              <h2 className="font-display text-2xl text-ink flex items-center gap-3">
                <span className="w-2 h-8 bg-slate-mosque rounded-full inline-block" />
                <span className="capitalize">Vandaag — {todayWeekday} {dd}-{mm}</span>
              </h2>
              {todayHijriLabel && (
                <span className="font-body text-sm text-taupe-dark bg-slate-mosque/5 border border-slate-mosque/15 rounded-full px-3 py-1">
                  {todayHijriLabel}
                </span>
              )}
            </div>

            {todayRow ? (
              <>
                <TodayPrayerCard row={todayRow} nextPrayerKey={nextPrayerKey} />
                {nextPrayerKey === null && (
                  <p className="font-body text-xs text-taupe mt-3 text-center">
                    Alle gebeden van vandaag zijn voorbij. Tot morgen, in shaa Allah.
                  </p>
                )}
              </>
            ) : SHOW_FALLBACK_PREVIEW ? (
              // In dev een visuele preview tonen (handig zonder CSV)
              <>
                <TodayPrayerCard row={FALLBACK_ROW} nextPrayerKey={nextPrayerKey} />
                <p className="font-body text-xs text-taupe mt-3 text-center">
                  * Demo-tijden (alleen lokaal zichtbaar). Upload het juiste CSV-bestand via Directus.
                </p>
              </>
            ) : (
              // In productie GEEN nep-tijden tonen — duidelijke melding ipv misleidende data
              <div className="bg-white border border-sand-200 rounded-2xl p-8 text-center">
                <p className="font-body text-taupe-dark">
                  Gebedstijden zijn tijdelijk niet beschikbaar.
                </p>
              </div>
            )}
          </div>

          {displayRows.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <h2 className="font-display text-2xl text-ink flex items-center gap-3">
                  <span className="w-2 h-8 bg-taupe/40 rounded-full inline-block" />
                  Overzicht {monthRows.length > 0 ? "deze maand" : ""}
                </h2>
                <Button href="/gebedstijden/overzicht" variant="outline" size="sm" className="shrink-0">
                  <CalendarDays className="w-4 h-4" />
                  Bekijk maandoverzicht
                </Button>
              </div>
              <PrayerTimesTable
                rows={displayRows}
                todayDatum={todayDatum}
                shortDateOnly
                showDayColumn
              />
            </div>
          )}

        </Container>
      </section>

      <PageSectionsList sections={otherSections} />
      <PageSectionsList sections={ctaSections} />
    </>
  );
}
