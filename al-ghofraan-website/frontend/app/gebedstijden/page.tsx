// app/gebedstijden/page.tsx

import type { Metadata }          from "next";
import Container                  from "@/components/ui/Container";
import SectionTitle               from "@/components/ui/SectionTitle";
import PrayerTimesTable, { TodayPrayerCard } from "@/components/ui/PrayerTimesTable";
import { getActivePrayerTimeFile, getAssetUrl } from "@/lib/directus";
import { parsePrayerTimesCSV, getTodaysPrayerTimes, getCurrentMonthRows } from "@/lib/prayerTimes";
import type { PrayerTimeRow }     from "@/types/directus";

export const metadata: Metadata = {
  title: "Gebedstijden",
  description: "Bekijk de actuele gebedstijden voor dit jaar.",
};

export const revalidate = 3600;

// Fallback gebedstijden als er geen CSV beschikbaar is
const FALLBACK_ROW: PrayerTimeRow = {
  datum:   "—",
  fajr:    "05:30",
  shuruq:  "07:15",
  dhuhr:   "13:00",
  asr:     "16:30",
  maghrib: "19:45",
  isha:    "21:15",
};

export default async function GebedstijdenPage() {
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
        const assetUrl = getAssetUrl(fileId);
        const token    = process.env.DIRECTUS_TOKEN;
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const resp = await fetch(assetUrl, { headers, next: { revalidate: 3600 } });
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
    } else {
      error = "Geen gebedstijden-bestand gevonden. Upload een CSV-bestand via Directus.";
    }
  } catch (e) {
    console.warn("Gebedstijden laden mislukt:", e);
    error = "Gebedstijden konden niet worden geladen.";
  }

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const todayDatum = `${dd}-${mm}`;

  const displayRows = monthRows.length > 0 ? monthRows : allRows.slice(0, 31);

  return (
    <>
      {/* Page header */}
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title="Gebedstijden"
            arabic="مواقيت الصلاة"
            subtitle={
              fileInfo
                ? `${fileInfo.title} — ${fileInfo.year}`
                : "Actuele gebedstijden"
            }
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
                Beheerder: upload een CSV-bestand via Directus → Gebedstijden bestanden → Bestand toevoegen.
              </p>
            </div>
          )}

          {/* Vandaag */}
          <div className="mb-12">
            <h2 className="font-display text-2xl text-ink mb-6 flex items-center gap-3">
              <span className="w-2 h-8 bg-slate-mosque rounded-full inline-block" />
              Vandaag — {dd}-{mm}
            </h2>
            <TodayPrayerCard row={todayRow || FALLBACK_ROW} />
            {!todayRow && allRows.length === 0 && (
              <p className="font-body text-xs text-taupe mt-3 text-center">
                * Tijden zijn indicatief. Upload het juiste CSV-bestand via Directus.
              </p>
            )}
          </div>

          {/* Maandoverzicht */}
          {displayRows.length > 0 && (
            <div>
              <h2 className="font-display text-2xl text-ink mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-taupe/40 rounded-full inline-block" />
                Overzicht {monthRows.length > 0 ? "deze maand" : ""}
              </h2>
              <PrayerTimesTable
                rows={displayRows}
                todayDatum={todayDatum}
              />
            </div>
          )}

          {/* Info CSV */}
          <div className="mt-10 p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="font-body font-semibold text-ink mb-2 text-sm">
              ℹ️ Over de gebedstijden
            </h3>
            <p className="font-body text-taupe-dark text-sm leading-relaxed">
              De gebedstijden worden beheerd via ons CMS. Een vrijwilliger kan
              jaarlijks een nieuw CSV-bestand uploaden. Zie de documentatie voor
              de exacte werkwijze.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
