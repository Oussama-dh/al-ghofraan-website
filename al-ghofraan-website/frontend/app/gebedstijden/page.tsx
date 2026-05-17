// app/gebedstijden/page.tsx
//
// Vandaag-card + volledig maandoverzicht. Delivery 17 wijzigingen:
//   - De tabel-block onderaan is vervangen door `PrayerTimesOverview`,
//     dezelfde component die `/gebedstijden/overzicht` ook gebruikt.
//     Daarmee zijn de Nederlandse + Islamitische kalender-presentaties
//     overal identiek (toggle, maand-selectors, tabelstijl).
//   - Datum-presentatie in de "Vandaag"-header gebruikt nu de Nederlandse
//     notatie (bv. "vrijdag 1 mei") in plaats van "vrijdag 01-05".
//   - "Bekijk maandoverzicht"-knop is verwijderd: het maandoverzicht
//     staat nu direct op deze pagina, dus de doorverwijzing zou
//     redundant zijn. `/gebedstijden/overzicht` blijft wel bestaan
//     voor oude bookmarks.

import type { Metadata }          from "next";
import Container                  from "@/components/ui/Container";
import PageHero                   from "@/components/sections/PageHero";
import { TodayPrayerCard }        from "@/components/ui/PrayerTimesTable";
import PrayerTimesOverview        from "@/components/ui/PrayerTimesOverview";
import { PageSectionsList }       from "@/components/sections/PageSectionRenderer";
import {
  getActivePrayerTimeFile,
  getInternalAssetUrl,
  getPageContent,
  getSiteSettings,
  getPageSectionsWithItems,
  getHijriDateOverrides,
  getPrayerCalendarHighlights,
} from "@/lib/directus";
import {
  parsePrayerTimesCSV,
  getTodaysPrayerTimes,
  getNextPrayerInfo,
  getNextPrayerKey,
  formatPrayerFileTitle,
  getAmsterdamDateParts,
  getDayName,
  formatDatePartsShort,
} from "@/lib/prayerTimes";
import {
  buildHijriOverrideMap,
  getHijriDate,
  formatHijriShortNl,
} from "@/lib/hijri";
import type { PrayerTimeRow }     from "@/types/directus";

export const dynamic = "force-dynamic";

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

  // ─── Eerstvolgend gebed ─────────────────────────────────────
  // Nieuw gedrag (delivery 9): wanneer alle gebeden van vandaag voorbij
  // zijn beschouwen we Fajr van morgen als het volgende gebed. De helper
  // `getNextPrayerInfo` geeft niet alleen de key terug, maar ook of het
  // gebed op morgen valt + welke CSV-rij erbij hoort.
  //
  // De TodayPrayerCard krijgt een licht-gemixte rij: alle tiles van
  // vandaag, behalve het highlighted gebed dat zijn waarde uit
  // `info.sourceRow` haalt zodat de getoonde tijd correspondeert met
  // het moment dat ook gemarkeerd wordt.
  //
  // FALLBACK: wanneer er geen todayRow is, gebruiken we (zoals voorheen)
  // FALLBACK_ROW voor de visuele preview in dev. Daarop draait dezelfde
  // info-helper zodat er ook bij offline-state een plausibele highlight
  // verschijnt.
  const rowForHighlight = todayRow || FALLBACK_ROW;
  const nextInfo = getNextPrayerInfo(allRows.length ? allRows : [rowForHighlight]);
  const nextPrayerKey   = nextInfo?.key ?? getNextPrayerKey(rowForHighlight);

  // Stel de rij samen die we aan de today-card geven.
  // - Bij isTomorrow=true: kopieer todayRow en overschrijf alleen de
  //   `fajr`-tile met de tijd van morgen. Andere tiles blijven leesbaar
  //   maar staan niet highlighted.
  // - Bij isTomorrow=false: gewoon todayRow.
  const cardRow: PrayerTimeRow = (() => {
    if (!todayRow) return rowForHighlight;
    if (nextInfo && nextInfo.isTomorrow) {
      return { ...todayRow, [nextInfo.key]: nextInfo.time };
    }
    return todayRow;
  })();

  // Vandaag-header label: weekdag + Nederlandse datum (bv. "vrijdag 1 mei")
  // — delivery 17 vervangt het oude dd-mm formaat.
  const todayParts = getAmsterdamDateParts();
  const todayDateLabel = formatDatePartsShort(
    todayParts.year,
    todayParts.month,
    todayParts.day,
  );
  // Weekdag op basis van gebedstijden-rij (datum-string in CSV) als die bestaat,
  // anders zelf opbouwen vanuit Amsterdamse parts.
  const todayWeekday = todayRow
    ? getDayName(todayRow.datum)
    : (() => {
        const d = new Date(todayParts.year, todayParts.month - 1, todayParts.day);
        return ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"][d.getDay()];
      })();

  // Hijri-datum voor vandaag (voor subtiele weergave bij vandaag-card).
  // Falen mag stil — Hijri is hier optioneel/extra.
  const hijriOverridesAll = await getHijriDateOverrides();
  const hijriOverrideMap  = buildHijriOverrideMap(hijriOverridesAll);
  // Delivery 21 — Kalender-highlights (Eid, Ramadan, etc.). Helper filtert
  // al op status=published + show_on_calendar=true; lege array bij fout.
  const calendarHighlights = await getPrayerCalendarHighlights();
  const todayHijri = (() => {
    const d = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));
    return getHijriDate(d, hijriOverrideMap);
  })();
  const todayHijriLabel = todayHijri ? formatHijriShortNl(todayHijri) : null;

  // Subtitel: voorkom dubbel jaartal
  const subtitleText = fileInfo
    ? formatPrayerFileTitle(fileInfo.title, fileInfo.year)
    : "Actuele gebedstijden";

  return (
    <>
      <PageHero
        title={page?.title || HEADER_FALLBACK.title}
        arabic={page?.arabic_title || HEADER_FALLBACK.arabic}
        subtitle={page?.subtitle || subtitleText}
        backgroundImage={page?.hero_background_image}
      />

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
              {/* Heading: "22 Dhul-Qi'dah 1447 — Vandaag" (Hijri vóór het
                  woord Vandaag). Als de Hijri-datum niet kon worden bepaald
                  (bv. Node zonder ICU), valt het label terug op alleen
                  "Vandaag" zodat de pagina nooit blanco kop heeft. De
                  Nederlandse weekdag + datum (delivery 17: "vrijdag 1 mei"
                  in plaats van "vrijdag 01-05") staan in een subtielere
                  regel eronder zodat ze zichtbaar blijven. */}
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-2xl text-ink flex items-center gap-3">
                  <span className="w-2 h-8 bg-slate-mosque rounded-full inline-block" />
                  <span>
                    {todayHijriLabel ? `${todayHijriLabel} — Vandaag` : "Vandaag"}
                  </span>
                </h2>
                <span className="font-body text-sm text-taupe-dark pl-5 capitalize">
                  {todayWeekday} {todayDateLabel}
                </span>
              </div>
            </div>

            {todayRow ? (
              <>
                <TodayPrayerCard row={cardRow} nextPrayerKey={nextPrayerKey} />
                {nextInfo && (
                  <p className="font-body text-xs text-taupe mt-3 text-center">
                    {nextInfo.isTomorrow
                      ? `Volgend gebed: ${nextInfo.label} morgen om ${nextInfo.time}`
                      : `Volgend gebed: ${nextInfo.label} om ${nextInfo.time}`}
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

          {/* Maandoverzicht — delivery 17: zelfde component als
              /gebedstijden/overzicht. Toggle Gregoriaans/Hijri,
              maand-selectors en tabelstijl zijn nu uniform tussen
              beide routes. De "Bekijk maandoverzicht"-knop is
              verwijderd omdat dit blok zelf al het volledige
              overzicht toont; de aparte /overzicht route blijft
              wel bestaan voor oude bookmarks. */}
          {allRows.length > 0 && (
            <div>
              <PrayerTimesOverview
                rows={allRows}
                hijriOverrides={hijriOverridesAll}
                highlights={calendarHighlights}
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
