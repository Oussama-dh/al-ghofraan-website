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
  getTvDonationCampaign,
  getTvActivity,
} from "@/lib/directus";
import { getCampaignProgress } from "@/lib/donations";
import { renderQrSvg }         from "@/lib/qrcode";
import { getSiteUrl }          from "@/lib/utils";
import { getTvHadiethSeries }  from "@/lib/hadiethSeries";
import {
  parsePrayerTimesCSV,
  getTodaysPrayerTimes,
  getTomorrowsPrayerTimes,
  formatPrayerFileTitle,
} from "@/lib/prayerTimes";
import type { PrayerTimeRow } from "@/types/directus";
import PrayerTimesTvDisplay   from "@/components/prayer/PrayerTimesTvDisplay";
import type {
  TvDonationSlideData,
  TvActivitySlideData,
  TvSeriesSlideData,
} from "@/components/prayer/PrayerTimesTvDisplay";

// Altijd verse data — TV-pagina mag niet aan een stale cache hangen.
export const dynamic = "force-dynamic";

// TV-pagina hoort niet in zoekresultaten.
export const metadata: Metadata = {
  title:    "Gebedstijden — TV",
  robots:   { index: false, follow: false },
};

export default async function GebedstijdenTvPage() {
  // ─── Site-instellingen eerst ───────────────────────────────
  // We hebben de settings-flags (tv_show_donation_campaign, tv_show_next_activity)
  // nodig om te beslissen of we de aanvullende fetches überhaupt doen.
  // Twee-staps fetch i.p.v. één: voorkomt onnodige Directus-roundtrips
  // wanneer admin een blok uit heeft staan.
  const settings = await getSiteSettings();

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

  // ─── Delivery TV-A — master-toggles ─────────────────────────
  // Default `tv_show_donation_campaign` is TRUE (in stap 54), default
  // `tv_show_next_activity` is FALSE. Bij ontbrekende velden (oude
  // installs zonder seed 54 gedraaid) → undefined → boolean-coercie
  // valt netjes op false voor next_activity; voor donation behandelen
  // we undefined als true (default-secure: campagne werd al eerder
  // beheerd, niet plotseling verbergen).
  //
  // NB: `tv_show_next_activity` is de veldnaam — historisch heette het
  // "next activity" toen de TV automatisch de eerstvolgende toonde.
  // Sinds stap 55 toont de TV alleen activiteiten die zelf
  // `show_on_tv=true` hebben. De master-toggle blijft het schakelpunt.
  const showDonationOnTv =
    settings?.tv_show_donation_campaign !== false; // default TRUE
  const showActivityOnTv =
    settings?.tv_show_next_activity === true;      // default FALSE
  const activityLookaheadDays =
    typeof settings?.tv_activity_lookahead_days === "number"
      ? settings.tv_activity_lookahead_days
      : 7;

  // ─── Aanvullende data parallel ──────────────────────────────
  const [announcements, tvCampaign, tvActivity] = await Promise.all([
    getTvAnnouncements(),
    showDonationOnTv  ? getTvDonationCampaign()              : Promise.resolve(null),
    showActivityOnTv  ? getTvActivity(activityLookaheadDays) : Promise.resolve(null),
  ]);

  // ─── Delivery TV-A — donatie-slide opbouwen ─────────────────
  // Twee aanvullende fetches per campagne: voortgang (server-side
  // aggregatie via lib/donations.ts) en QR-code render. Beide
  // fail-soft: bij fout krijgen we lege/null en slaat de slide
  // zichzelf over via self-guard in PrayerTimesTvDisplay.
  let tvDonationSlide: TvDonationSlideData | null = null;
  if (tvCampaign) {
    // QR linkt direct naar /doneren?campaign=<slug> zodat de bezoeker
    // niet hoeft te zoeken — al-ghofraan.nl/doneren als fallback in
    // de tekst onder de QR.
    const baseUrl   = getSiteUrl();
    const donateUrl = `${baseUrl}/doneren?campaign=${encodeURIComponent(tvCampaign.slug)}`;

    const [progress, qrSvg] = await Promise.all([
      getCampaignProgress(tvCampaign.id),
      // Witte dark/wit-licht-config: scant goed op donkere TV-achtergrond.
      // Container in client-component krijgt witte achtergrond.
      renderQrSvg(donateUrl, { margin: 1, darkColor: "#0F172A", lightColor: "#FFFFFF" }),
    ]);

    tvDonationSlide = {
      campaign:  tvCampaign,
      qrSvg,
      donateUrl,
      progress,
    };
  }

  const tvActivitySlide: TvActivitySlideData | null = tvActivity
    ? { activity: tvActivity }
    : null;

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

  // ─── Delivery B — hadieth-series voor TV ────────────────────
  // Server-side ophalen met admin-token. Selectie hangt af van vandaag's
  // gebedstijden (voor weekly_window-series zoals Djoemoe'ah), dus pas
  // NA CSV-fetch. Bij geen actieve serie of geen items → null en de
  // slide wordt overgeslagen.
  const seriesResult = await getTvHadiethSeries(todayRow, new Date());
  const tvSeriesSlide: TvSeriesSlideData | null = seriesResult
    ? { series: seriesResult.series, item: seriesResult.item }
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
      tvDonation={tvDonationSlide}
      tvActivity={tvActivitySlide}
      tvSeries={tvSeriesSlide}
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
