// app/gebedstijden/tv/page.tsx
//
// TV-display pagina voor groot scherm in de moskee.
//
// Eisen (zie spec):
//   - gebedstijden van vandaag uit dezelfde CSV als /gebedstijden
//   - Europe/Amsterdam-logica
//   - site_name, datum, klok, eerstvolgend gebed, countdown, alle tijden
//   - geen nep-tijden in productie
//   - rustige fullscreen layout
//   - announcements roteren onderaan
//
// Implementatie: server component haalt CSV + announcements op, rendert
// een <PrayerTimesTvDisplay/> client component voor de "live" interactie
// (klok, countdown, rotatie, dagwisseling-refresh).
//
// De pagina wordt gerenderd ALS OVERLAY (fixed inset-0 z-50) bovenop de
// bestaande Header/Footer. Bewust géén layout-refactor — alleen visueel
// fullscreen vanuit de bestaande root-layout.

import type { Metadata }   from "next";
import {
  getActivePrayerTimeFile,
  getInternalAssetUrl,
  getSiteSettings,
  getTvAnnouncements,
  getAssetUrl,
} from "@/lib/directus";
import {
  parsePrayerTimesCSV,
  getTodaysPrayerTimes,
  getTomorrowsPrayerTimes,
  formatPrayerFileTitle,
} from "@/lib/prayerTimes";
import type { PrayerTimeRow } from "@/types/directus";
import PrayerTimesTvDisplay   from "@/components/prayer/PrayerTimesTvDisplay";

// Altijd verse data — TV-pagina mag niet aan een stale cache hangen.
export const dynamic = "force-dynamic";

// TV-pagina hoort niet in zoekresultaten.
export const metadata: Metadata = {
  title:    "Gebedstijden — TV",
  robots:   { index: false, follow: false },
};

export default async function GebedstijdenTvPage() {
  // ─── Site-instellingen + announcements parallel ────────────
  const [settings, announcements] = await Promise.all([
    getSiteSettings(),
    getTvAnnouncements(),
  ]);

  const siteName = settings?.site_name || "Al-Ghofraan";
  // Logo via getAssetUrl() — exact zelfde patroon als Header/Footer.
  // Geen next/image (Docker-fetch issue zoals gedocumenteerd in de samenvatting).
  // Bij leeg logo geeft getAssetUrl() "" terug → client component toont fallback.
  const logoUrl  = getAssetUrl(settings?.logo || null) || null;

  // ─── TV-snelheden uit Directus, met veilige fallbacks ───────
  // Ongeldige/lege waarden → defaults. Min-bound voorkomt extreem snelle
  // rotatie waardoor de tv onleesbaar wordt of de browser overbelast raakt.
  const tvConfig = {
    prayerSlideMs : clampSeconds(settings?.tv_prayer_slide_seconds, 25, 5, 600) * 1000,
    itemSlideMs   : clampSeconds(settings?.tv_item_slide_seconds,   15, 3, 600) * 1000,
    refreshMs     : clampMinutes(settings?.tv_refresh_minutes,       5, 1, 240) * 60_000,
  };

  // ─── CSV ophalen — exact zelfde patroon als /gebedstijden ──
  let todayRow:    PrayerTimeRow | null = null;
  let tomorrowRow: PrayerTimeRow | null = null;
  let fileInfo:    { title: string; year: number } | null = null;

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

          const resp = await fetch(assetUrl, {
            headers,
            // TV-pagina is force-dynamic, dus geen cache nodig.
            cache: "no-store",
          });
          if (resp.ok) {
            const csv = await resp.text();
            const rows = parsePrayerTimesCSV(csv);
            todayRow    = getTodaysPrayerTimes(rows);
            // Voor "Fajr morgen" na Ishaa (delivery 9): pak de rij van
            // morgen één keer aan op de server zodat de client niets
            // extra hoeft te fetchen. null = CSV stopt vóór morgen
            // (bv. jaareinde) — TV-helper valt dan netjes terug.
            tomorrowRow = getTomorrowsPrayerTimes(rows);
            fileInfo = { title: prayerFile.title, year: prayerFile.year };
          }
        }
      }
    }
  } catch (e) {
    // Geen nep-tijden tonen — alleen log; client-component toont nette melding.
    console.warn("TV gebedstijden laden mislukt:", e);
  }

  // Subtitel: bv. "Gebedstijden 2026" (alleen als we een file hebben)
  const subtitle = fileInfo
    ? formatPrayerFileTitle(fileInfo.title, fileInfo.year)
    : null;

  return (
    <PrayerTimesTvDisplay
      siteName={siteName}
      logoUrl={logoUrl}
      todayRow={todayRow}
      tomorrowRow={tomorrowRow}
      announcements={announcements}
      subtitle={subtitle}
      tvConfig={tvConfig}
    />
  );
}

// ─── Helpers ───────────────────────────────────────────────────
// Normaliseer een numerieke instelling uit Directus naar een veilig getal.
// `value` mag null/undefined/string/number zijn. Bij invalid → `fallback`.
// `min`/`max` clampen zodat extreme waarden (0, negatief, miljoen) nooit
// de TV-pagina kunnen breken.
function clampSeconds(
  value: number | string | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampMinutes(
  value: number | string | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  return clampSeconds(value, fallback, min, max);
}
