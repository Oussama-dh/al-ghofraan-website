"use client";

// components/prayer/PrayerTimesTvDisplay.tsx
//
// TV-display als eenvoudige fullscreen slideshow met vaste boven- en onderbalk.
//
// ─── Layout-structuur ──────────────────────────────────────────
//   ┌───────────────────────────────────────────────────────────┐
//   │ TopBar:  [logo] Al-Ghofraan · 8 mei 2026         18:42    │   ← altijd zichtbaar
//   ├───────────────────────────────────────────────────────────┤
//   │                                                            │
//   │           ROTERENDE SLIDE-CONTENT (midden)                 │   ← prayer / item
//   │           - prayer_times slide (25s)                       │
//   │           - announcement / hadieth / reminder ... (15s)     │
//   │                                                            │
//   ├───────────────────────────────────────────────────────────┤
//   │ BottomBar:  Volgend gebed: Maghrib over 37 minuten         │   ← altijd zichtbaar
//   └───────────────────────────────────────────────────────────┘
//
// ─── Hydration-strategie ───────────────────────────────────────
// Tijdgevoelige waarden (klok, "over X minuten", dagdatum, gebed-highlight)
// renderen pas NA mount. Server rendert lege placeholders. Hierdoor matchen
// server- en eerste-client-render altijd.

import { useEffect, useMemo, useState } from "react";
import { useRouter }                    from "next/navigation";
import { Sunrise, Sun, CloudSun, Sunset, Moon, MoonStar, Heart, Calendar, MapPin, BookOpen } from "lucide-react";
import type { LucideIcon }              from "lucide-react";
import { cn, stripHtml }                from "@/lib/utils";
import {
  getAmsterdamDateParts,
  getAmsterdamMinutes,
  getNextPrayerInfo,
  timeToMinutes,
  type PrayerKey,
} from "@/lib/prayerTimes";
import type {
  PrayerTimeRow,
  TvAnnouncement,
  Activity,
  DonationCampaign,
  HadiethSeries,
  HadiethSeriesItem,
} from "@/types/directus";
import type { CampaignProgressData } from "@/lib/donations";

// ─── Configuratie ─────────────────────────────────────────────
// Slide-duur en refresh-interval komen via props (uit site_settings).
// Fallback-defaults staan in de page.tsx (clampSeconds/clampMinutes).
const SAFETY_REFRESH_MS_FALLBACK = 5 * 60_000;

// Zelfde icoon-mapping en volgorde als components/ui/PrayerTimesTable.tsx
// (TodayPrayerCard) — visuele consistentie met /gebedstijden.
const GEBEDEN: ReadonlyArray<{
  key:    PrayerKey;
  label:  string;
  arabic: string;
  Icon:   LucideIcon;
}> = [
  { key: "fajr",     label: "Fajr",     arabic: "الفجر",   Icon: MoonStar },
  { key: "shoeroeq", label: "Shoeroeq", arabic: "الشروق",  Icon: Sunrise  },
  { key: "dhoehr",   label: "Dhoehr",   arabic: "الظهر",   Icon: Sun      },
  { key: "asr",      label: "'Asr",     arabic: "العصر",   Icon: CloudSun },
  { key: "maghrib",  label: "Maghrib",  arabic: "المغرب",  Icon: Sunset   },
  { key: "ishaa",    label: "'Ishaa",   arabic: "العشاء",  Icon: Moon     },
];

const NL_WEEKDAYS = [
  "zondag", "maandag", "dinsdag", "woensdag",
  "donderdag", "vrijdag", "zaterdag",
];
const NL_MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

type Slide =
  | { kind: "prayer" }
  | { kind: "item";     item: TvAnnouncement }
  | { kind: "donation"; data: TvDonationSlideData }
  | { kind: "activity"; data: TvActivitySlideData }
  | { kind: "series";   data: TvSeriesSlideData };

/**
 * Delivery TV-A — extra data voor donatiecampagne-slide.
 * Server (page.tsx) pre-rendert QR-SVG en haalt voortgang op zodat
 * de client component verder niets hoeft te fetchen.
 */
export interface TvDonationSlideData {
  campaign:  DonationCampaign;
  /** Server-side gerenderde QR-SVG (donker op wit). Leeg = geen QR tonen. */
  qrSvg:     string;
  donateUrl: string;
  progress:  CampaignProgressData;
}

/** Delivery TV-A — extra data voor eerstvolgende-activiteit-slide. */
export interface TvActivitySlideData {
  activity: Activity;
}

/**
 * Delivery B — beheerbare hadieth-series. Server kiest de winnende
 * serie en het item van vandaag; client rendert puur. Bij actieve serie
 * onderdrukt de client TEVENS de losse `tv_announcements.type=hadith`
 * items zodat hadieth-content niet door elkaar loopt.
 */
export interface TvSeriesSlideData {
  series: HadiethSeries;
  item:   HadiethSeriesItem;
}

/**
 * Snelheidsinstellingen vanuit site_settings (in milliseconden).
 * Worden door de server-route ge-clampt en met fallbacks uitgerust,
 * zodat ze hier altijd geldig zijn.
 */
export interface TvConfig {
  prayerSlideMs: number;
  itemSlideMs:   number;
  refreshMs:     number;
}

interface Props {
  siteName:      string;
  logoUrl:       string | null;
  todayRow:      PrayerTimeRow | null;
  /**
   * Rij voor de dag NA `todayRow`. Wordt gebruikt om na Ishaa
   * "Fajr morgen om 04:12" te kunnen tonen — zowel in de slide-card
   * (Fajr-tile krijgt de tijd van morgen + highlight) als in de
   * bottom-bar countdown. Mag null zijn; helper valt dan terug op
   * Fajr van vandaag zodat de UI nooit leeg blijft.
   */
  tomorrowRow:   PrayerTimeRow | null;
  announcements: TvAnnouncement[];
  subtitle?:     string | null;
  tvConfig?:     TvConfig;
  /**
   * Delivery TV-A — optionele extra slides.
   * Wanneer null/undefined wordt de slide simpelweg niet ingevoegd in
   * de playlist; bestaande TV-routes blijven identiek werken.
   */
  tvDonation?:   TvDonationSlideData | null;
  tvActivity?:   TvActivitySlideData | null;
  /**
   * Delivery B — beheerbare hadieth-series. Wanneer aanwezig wordt:
   *   (a) een SeriesSlide met de hadieth-content getoond, EN
   *   (b) bestaande `tv_announcements.type=hadith` items uit de
   *       playlist gefilterd — om dubbele hadieth-content te voorkomen.
   *       Andere announcement-types blijven gewoon staan.
   */
  tvSeries?:     TvSeriesSlideData | null;
}

export default function PrayerTimesTvDisplay({
  siteName,
  logoUrl,
  todayRow,
  tomorrowRow,
  announcements,
  subtitle,
  tvConfig,
  tvDonation,
  tvActivity,
  tvSeries,
}: Props) {
  const router = useRouter();

  // Hardcoded fallback-defaults voor het geval geen tvConfig wordt meegegeven
  // (defensief; de server-route levert ze altijd aan).
  const prayerSlideMs = tvConfig?.prayerSlideMs ?? 25_000;
  const itemSlideMs   = tvConfig?.itemSlideMs   ?? 15_000;
  const refreshMs     = tvConfig?.refreshMs     ?? SAFETY_REFRESH_MS_FALLBACK;

  // ─── Mounted-gate (hydration safety) ────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ─── Live klok ──────────────────────────────────────────────
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Playlist [prayer, extra, prayer, extra, ...] ──────────
  //
  // Volgorde van extra-slides (klant-keuze Delivery B):
  //   1. Hadieth-serie slide (als tvSeries aanwezig — belangrijkste
  //      inhoudelijke reminder; series eerst).
  //   2. Donatiecampagne + QR (als tvDonation aanwezig).
  //   3. Eerstvolgende activiteit (als tvActivity aanwezig).
  //   4. Bestaande announcements — met één filter:
  //        Bij actieve serie worden `tv_announcements.type=hadith`
  //        verborgen om dubbele hadieth-content te voorkomen.
  //        Andere announcement-types (reminder, announcement, event,
  //        donation) blijven onveranderd.
  //
  // Tussen elke item-slide blijft een prayer-slide staan zodat de TV
  // nooit twee item-slides achter elkaar toont (= rustige look,
  // kernpatroon ongewijzigd t.o.v. v1).
  //
  // Self-guards:
  //   - tvDonation met lege QR-SVG (renderQrSvg fail-soft) wordt
  //     overgeslagen — anders lege bak.
  //   - tvSeries item zonder translation_nl wordt al server-side
  //     gefilterd in lib/hadiethSeries.ts.
  const slides: Slide[] = useMemo(() => {
    const list: Slide[] = [{ kind: "prayer" }];

    const extras: Slide[] = [];
    if (tvSeries) {
      extras.push({ kind: "series", data: tvSeries });
    }
    if (tvDonation && tvDonation.qrSvg) {
      extras.push({ kind: "donation", data: tvDonation });
    }
    if (tvActivity) {
      extras.push({ kind: "activity", data: tvActivity });
    }
    // Bestaande announcements — bij actieve serie filteren we type=hadith.
    const filteredAnnouncements = tvSeries
      ? announcements.filter((a) => a.type !== "hadith")
      : announcements;
    for (const item of filteredAnnouncements) {
      extras.push({ kind: "item", item });
    }

    for (const extra of extras) {
      list.push(extra);
      list.push({ kind: "prayer" });
    }
    return list;
  }, [announcements, tvDonation, tvActivity, tvSeries]);

  // ─── Slide-rotatie ─────────────────────────────────────────
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    setSlideIdx(0);
  }, [slides.length]);

  useEffect(() => {
    if (!mounted) return;
    if (slides.length <= 1) return;

    const current  = slides[slideIdx];
    const duration = current?.kind === "prayer" ? prayerSlideMs : itemSlideMs;

    const id = setTimeout(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, duration);

    return () => clearTimeout(id);
  }, [mounted, slideIdx, slides, prayerSlideMs, itemSlideMs]);

  // ─── Server-data refresh ───────────────────────────────────
  const parts    = getAmsterdamDateParts(now);
  const todayKey = `${parts.year}-${parts.month}-${parts.day}`;

  const [lastDayKey, setLastDayKey] = useState(todayKey);
  useEffect(() => {
    if (!mounted) return;
    if (lastDayKey !== todayKey) {
      setLastDayKey(todayKey);
      router.refresh();
    }
  }, [mounted, todayKey, lastDayKey, router]);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => router.refresh(), refreshMs);
    return () => clearInterval(id);
  }, [mounted, router, refreshMs]);

  // ─── Afgeleide labels — pas client-side ───────────────────
  const dateString = useMemo(() => {
    if (!mounted) return "";
    const jsDate  = new Date(parts.year, parts.month - 1, parts.day);
    const weekday = NL_WEEKDAYS[jsDate.getDay()];
    const month   = NL_MONTHS[parts.month - 1] ?? "";
    return `${weekday} ${parts.day} ${month} ${parts.year}`;
  }, [mounted, parts.year, parts.month, parts.day]);

  const clockHHMM = mounted
    ? `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`
    : "";

  // ─── Eerstvolgend gebed ────────────────────────────────────
  // Nieuw gedrag (delivery 9): na Ishaa wordt Fajr van morgen het
  // volgende gebed. We bouwen een minimale rows-array van
  // `[todayRow, tomorrowRow]` (alleen niet-null) en laten de helper
  // bepalen welk gebed nu hoort te tellen.
  //
  // De `minutesUntil` uit de helper is initieel correct, maar omdat
  // `now` elke seconde tikt rekenen we de minuten zelf opnieuw uit
  // op basis van de huidige Amsterdam-minuten + targetdag. Zo loopt
  // de countdown vloeiend mee zonder server-refresh.
  const nextInfo = useMemo(() => {
    if (!mounted) return null;
    const rows: PrayerTimeRow[] = [];
    if (todayRow)    rows.push(todayRow);
    if (tomorrowRow) rows.push(tomorrowRow);
    if (rows.length === 0) return null;
    return getNextPrayerInfo(rows, now);
  }, [mounted, todayRow, tomorrowRow, now]);

  const nextPrayerKey: PrayerKey | null = nextInfo?.key ?? null;
  const nextPrayer    = GEBEDEN.find((g) => g.key === nextPrayerKey) ?? null;

  // Live minuten-countdown — herberekend op elke `now`-tik.
  let minutesUntilNext: number | null = null;
  if (mounted && nextInfo) {
    const target = timeToMinutes(nextInfo.time);
    const nowMin = getAmsterdamMinutes(now);
    if (target !== null) {
      const diff = nextInfo.isTomorrow
        ? (24 * 60 - nowMin) + target
        : (target - nowMin);
      minutesUntilNext = diff > 0 ? diff : 0;
    }
  }

  // Rij voor de slide-card: bij isTomorrow wordt de Fajr-tile gevuld
  // met de tijd van morgen. Andere tiles tonen vandaag's tijden (al
  // verstreken, maar staan niet highlighted dus die context blijft
  // leesbaar). Wanneer er geen todayRow is, valt het terug op
  // tomorrowRow (zodat de TV nooit een lege state heeft).
  const slideRow: PrayerTimeRow | null = useMemo(() => {
    if (!todayRow && !tomorrowRow) return null;
    if (!todayRow) return tomorrowRow;
    if (nextInfo?.isTomorrow) {
      return { ...todayRow, [nextInfo.key]: nextInfo.time };
    }
    return todayRow;
  }, [todayRow, tomorrowRow, nextInfo]);

  const currentSlide = slides[slideIdx] ?? { kind: "prayer" as const };

  // ─── Render ─────────────────────────────────────────────────
  return (
    // `tv-scope` pin de kleur-variabelen op de light-mode waardes
    // zodat /gebedstijden/tv er identiek uitziet onafhankelijk van
    // de bezoeker zijn theme-keuze (delivery 10-fix).
    <div className="tv-scope fixed inset-0 z-50 bg-slate-mosque text-white overflow-hidden">
      {/* Decoratieve achtergrond */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-slate-dark via-slate-mosque to-slate-dark"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.06), transparent 50%), radial-gradient(circle at 80% 100%, rgba(255,255,255,0.05), transparent 50%)",
        }}
      />

      {/* 3-rij layout: TopBar (auto) | midden (1fr) | BottomBar (auto) */}
      <div className="relative h-full grid grid-rows-[auto_1fr_auto]">

        <TopBar
          logoUrl={logoUrl}
          siteName={siteName}
          subtitle={subtitle}
          dateString={dateString}
          clockHHMM={clockHHMM}
          mounted={mounted}
        />

        <main className="min-h-0 flex items-center justify-center p-6 md:p-10 lg:p-12 overflow-hidden">
          {(() => {
            // Switch over discriminated union — TypeScript verifieert
            // dat alle slide-kinds afgehandeld zijn.
            switch (currentSlide.kind) {
              case "prayer":
                return (
                  <PrayerSlide
                    todayRow={slideRow}
                    nextPrayerKey={nextPrayerKey}
                  />
                );
              case "item":
                return <ItemSlide item={currentSlide.item} />;
              case "donation":
                return <DonationSlide data={currentSlide.data} />;
              case "activity":
                return <ActivitySlide data={currentSlide.data} />;
              case "series":
                return <SeriesSlide data={currentSlide.data} />;
            }
          })()}
        </main>

        <BottomBar
          mounted={mounted}
          nextPrayer={nextPrayer}
          nextPrayerTime={nextInfo?.time ?? null}
          isTomorrow={nextInfo?.isTomorrow ?? false}
          minutesUntilNext={minutesUntilNext}
          slides={slides}
          slideIdx={slideIdx}
        />
      </div>
    </div>
  );
}

// ─── TopBar ────────────────────────────────────────────────────
// Links: logo + site_name + datum (klein eronder).
// Rechts: huidige tijd HH:mm.
function TopBar({
  logoUrl,
  siteName,
  subtitle,
  dateString,
  clockHHMM,
  mounted,
}: {
  logoUrl:    string | null;
  siteName:   string;
  subtitle?:  string | null;
  dateString: string;
  clockHHMM:  string;
  mounted:    boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 md:px-10 lg:px-14 py-4 md:py-5 border-b border-white/10 bg-black/15 backdrop-blur-sm">
      {/* Links: logo + naam */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {logoUrl ? (
          // Bewust een gewone <img> + getAssetUrl() — geen next/image (Docker-fetch issue
          // zoals beschreven in de project-samenvatting).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${siteName} logo`}
            className="h-12 md:h-16 lg:h-20 w-auto max-w-[200px] object-contain shrink-0"
          />
        ) : (
          // Fallback — zelfde mosque-SVG als Header/Footer, hier groter en lichter
          // omdat we tegen een donkere TV-achtergrond staan.
          <div
            aria-hidden="true"
            className="h-12 w-12 md:h-16 md:w-16 lg:h-20 lg:w-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0"
          >
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2l2 4h2l1 2H7l1-2h2l2-4z" fill="currentColor" opacity="0.9" />
              <rect x="9"  y="8"  width="6"  height="12" rx="1"   fill="currentColor" />
              <rect x="6"  y="18" width="12" height="2"  rx="0.5" fill="currentColor" />
            </svg>
          </div>
        )}

        <div className="min-w-0">
          <div className="font-display text-2xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tight truncate">
            {siteName}
          </div>
          <div className="font-body text-sand/70 text-sm md:text-base lg:text-lg truncate flex items-center gap-2">
            {subtitle && <span>{subtitle}</span>}
            {subtitle && dateString && <span aria-hidden="true">·</span>}
            <span className="capitalize">
              {/* Pre-mount: leeg om hydration-mismatch te voorkomen.
                  Geeft een korte visuele blink, maar voorkomt server/client divergentie. */}
              {mounted ? dateString : "\u00A0"}
            </span>
          </div>
        </div>
      </div>

      {/* Rechts: klok */}
      <div className="font-display tabular-nums text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white shrink-0">
        {mounted ? clockHHMM : "\u00A0"}
      </div>
    </header>
  );
}

// ─── BottomBar ─────────────────────────────────────────────────
// Gecentreerd: "Volgend gebed: Maghrib over 37 minuten"
// + slide-indicator dots als rotatie actief is.
function BottomBar({
  mounted,
  nextPrayer,
  nextPrayerTime,
  isTomorrow,
  minutesUntilNext,
  slides,
  slideIdx,
}: {
  mounted:           boolean;
  nextPrayer:        { key: PrayerKey; label: string; arabic: string; Icon: LucideIcon } | null;
  nextPrayerTime:    string | null;
  /** Of het eerstvolgende gebed pas morgen is — voegt "morgen" toe aan de tekst. */
  isTomorrow:        boolean;
  minutesUntilNext:  number | null;
  slides:            Slide[];
  slideIdx:          number;
}) {
  // Bouw de "over X minuten" tekst — afhankelijk van of het gebed binnen
  // een uur valt of langer. Werkt ook voor "morgen" omdat de caller een
  // grote `minutesUntilNext` doorgeeft (bv. 425 voor 7 uur).
  let countdownText = "";
  if (mounted && nextPrayer && minutesUntilNext !== null) {
    if (minutesUntilNext === 0) {
      countdownText = "begint nu";
    } else if (minutesUntilNext < 60) {
      const label = minutesUntilNext === 1 ? "minuut" : "minuten";
      countdownText = `over ${minutesUntilNext} ${label}`;
    } else {
      const hours = Math.floor(minutesUntilNext / 60);
      const mins  = minutesUntilNext % 60;
      const hLab  = "uur"; // 1 uur / 2 uur — geen meervoud in NL
      const mLab  = mins  === 1 ? "minuut" : "minuten";
      countdownText = mins > 0
        ? `over ${hours} ${hLab} en ${mins} ${mLab}`
        : `over ${hours} ${hLab}`;
    }
  }

  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm px-6 md:px-10 lg:px-14 py-4 md:py-5 relative">
      <div className="text-center font-body text-lg md:text-2xl lg:text-3xl">
        {mounted && nextPrayer && nextPrayerTime ? (
          <>
            <span className="text-sand/70">Volgend gebed: </span>
            <span className="text-white font-medium">{nextPrayer.label}</span>
            {isTomorrow && (
              <span className="text-sand/70"> morgen</span>
            )}
            {countdownText && (
              <>
                <span className="text-sand/70"> {countdownText}</span>
                <span className="text-sand/50 ml-3 text-base md:text-xl lg:text-2xl tabular-nums hidden sm:inline">
                  ({nextPrayerTime})
                </span>
              </>
            )}
          </>
        ) : mounted ? (
          // Echt geen gebedstijden beschikbaar (geen vandaag, geen morgen)
          // — bv. CSV ontbreekt of stopt. Geen "tot morgen" tekst meer:
          // delivery 9 verwijdert die misleidende melding overal.
          <span className="text-sand/60 italic">
            Gebedstijden zijn tijdelijk niet beschikbaar.
          </span>
        ) : (
          <span aria-hidden="true">&nbsp;</span>
        )}
      </div>

      {/* Slide-indicator dots — alleen bij actieve rotatie */}
      {slides.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 flex gap-1.5 pointer-events-none">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i === slideIdx ? "w-6 bg-white/80" : "w-1 bg-white/25",
              )}
            />
          ))}
        </div>
      )}
    </footer>
  );
}

// ─── Prayer-slide (midden) ────────────────────────────────────
// Vakjes volgen exact dezelfde visuele opbouw als TodayPrayerCard op
// /gebedstijden — icoon, Arabische naam, latijns label, tijd, met
// "Volgende"-tag op het highlighted vakje. Verschil: alles flink groter
// voor 16:9 TV, en het kleurenschema is geïnverteerd voor de donkere TV-
// achtergrond (highlight = wit blok met donkere tekst, ipv andersom op
// /gebedstijden waar achtergrond licht is).
function PrayerSlide({
  todayRow,
  nextPrayerKey,
}: {
  todayRow:      PrayerTimeRow | null;
  nextPrayerKey: PrayerKey | null;
}) {
  if (!todayRow) {
    return (
      <div className="w-full max-w-3xl bg-white/10 border border-white/20 rounded-3xl p-8 lg:p-14 text-center">
        <p className="font-body text-2xl md:text-3xl lg:text-4xl text-sand/90">
          Gebedstijden zijn tijdelijk niet beschikbaar.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-[1800px] mx-auto",
        // Gap-progressie: ruim genoeg op mobile/tablet, iets compacter
        // op LG+ zodat de cards de schermbreedte gevuld houden zonder
        // overdreven witruimte tussen vakjes.
        "gap-4 md:gap-6 lg:gap-6",
        // Mobile/tablet: 3-koloms grid (2 rijen × 3 cards). Op kleine
        // schermen heeft fysieke breedte-verdeling weinig nut.
        "grid grid-cols-3",
        // LG+ (TV-doelmaat): flex-row met vaste pixel-breedte/hoogte
        // per card-type (zie `lg:w-[...] lg:h-[...]` op de cards zelf).
        // `flex-nowrap` houdt single-row gegarandeerd, `justify-center`
        // centreert de rij, `items-center` zorgt dat de hogere
        // highlight-card symmetrisch boven én onder de normale cards
        // uitsteekt in plaats van top-aligned.
        "lg:flex lg:flex-row lg:flex-nowrap lg:justify-center lg:items-center",
      )}
    >
      {GEBEDEN.map((gebed) => {
        const isNext = nextPrayerKey === gebed.key;
        return (
          <div
            key={gebed.key}
            className={cn(
              "rounded-3xl flex flex-col items-center justify-between transition-colors",
              // Delivery 31: VASTE pixel-afmetingen per card-type op LG+,
              // in drie groei-stappen. Geen flex-grow / basis-% meer —
              // expliciet "deze card is W breed en H hoog". Zo blijft
              // de vorm (rounded rectangle) identiek voor alle cards,
              // alleen de schaal verschilt.
              //
              // Sizing per breakpoint (1366 / 1280-1535 / 1536+ TV's):
              //   normaal  : 170×280  → 190×320  → 250×360
              //   highlight: 240×360  → 280×410  → 370×460
              // Verhoudingen blijven ~1.4× breder voor highlight.
              //
              // Veiligheid op 1366×768 (xl-breakpoint actief):
              //   5×190 + 280 + 5×24 (gap-6) = 1350px < 1366 ✓
              // Op 1920×1080 (2xl-breakpoint):
              //   5×250 + 370 + 120 = 1740px in 1800 max-w = ~30px wit
              //   per kant na justify-center.
              isNext
                ? "lg:w-[240px] lg:h-[360px] xl:w-[280px] xl:h-[410px] 2xl:w-[370px] 2xl:h-[460px]"
                : "lg:w-[170px] lg:h-[280px] xl:w-[190px] xl:h-[320px] 2xl:w-[250px] 2xl:h-[360px]",
              // Padding (delivery 31): proportioneel bij de nieuwe
              // fysieke afmetingen. Iets meer ademruimte rondom de
              // tijd dan delivery 30, maar niet overdreven.
              isNext
                ? "p-6 md:p-9 lg:p-7 xl:p-8 2xl:p-9  min-h-[220px] md:min-h-[300px]"
                : "p-4 md:p-6 lg:p-5 xl:p-5 2xl:p-7  min-h-[170px] md:min-h-[230px]",
              isNext
                ? "bg-white text-slate-mosque ring-4 ring-white/40 shadow-2xl shadow-black/30"
                : "bg-white/10 border-2 border-white/20 text-white",
            )}
          >
            {/* Icoon — bovenaan, klein subtiel zoals op /gebedstijden */}
            <div
              className={cn(
                "flex justify-center",
                isNext ? "text-slate-mosque/80" : "text-sand/80",
              )}
            >
              <gebed.Icon
                className={cn(
                  // Delivery 31: icons groeien per breakpoint mee met
                  // de fysieke card-grootte.
                  isNext
                    ? "w-9 h-9 md:w-12 md:h-12 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16"
                    : "w-7 h-7 md:w-9  md:h-9  lg:w-10 lg:h-10 xl:w-11 xl:h-11 2xl:w-14 2xl:h-14",
                )}
                strokeWidth={1.75}
              />
            </div>

            {/* Arabische naam */}
            <div
              className={cn(
                "font-arabic leading-none",
                // Delivery 31: drie-staps groei mee met card-afmeting.
                isNext
                  ? "text-2xl md:text-4xl lg:text-3xl xl:text-4xl 2xl:text-5xl"
                  : "text-xl  md:text-3xl lg:text-2xl xl:text-3xl 2xl:text-4xl",
                isNext ? "text-slate-mosque/80" : "text-sand/85",
              )}
              lang="ar"
              dir="rtl"
            >
              {gebed.arabic}
            </div>

            {/* Latijns label */}
            <div
              className={cn(
                "font-body uppercase tracking-widest font-medium",
                // Delivery 31: drie-staps groei.
                isNext
                  ? "text-sm md:text-lg lg:text-base xl:text-lg 2xl:text-xl"
                  : "text-xs md:text-sm lg:text-sm  xl:text-base 2xl:text-lg",
                isNext ? "text-slate-mosque/70" : "text-sand/80",
              )}
            >
              {gebed.label}
            </div>

            {/* Tijd — grootste element */}
            <div
              className={cn(
                "font-display tabular-nums leading-none",
                // Delivery 31: drie-staps groei. Op LG conservatief
                // gehouden om in 170px-brede normale card te passen.
                // Op 2xl mooi groot voor de TV-doelmaat.
                isNext
                  ? "text-4xl md:text-6xl lg:text-5xl xl:text-6xl 2xl:text-7xl"
                  : "text-3xl md:text-5xl lg:text-4xl xl:text-5xl 2xl:text-6xl",
                isNext ? "text-slate-mosque" : "text-white",
              )}
            >
              {todayRow[gebed.key as keyof PrayerTimeRow] || "—"}
            </div>

            {/* Volgende-tag (alleen op highlighted vakje) */}
            {isNext && (
              <div className="font-body uppercase tracking-widest text-slate-mosque/70 text-xs md:text-sm lg:text-base font-medium">
                Volgende
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Item-slide (announcement / hadieth / reminder / event / donation) ─
// Layout-keuzes:
//   - Type-label is groot en gekleurd zodat het van afstand leesbaar is
//   - Voor hadieth: Arabisch is bewust de grootste tekst, vertaling eronder kleiner
//   - Bron/referentie/grade onderaan, klein en cursief
//   - Voor andere types: titel is leidend, body daaronder
//   - Line-clamp + max-width voorkomen overflow
function ItemSlide({ item }: { item: TvAnnouncement }) {
  const isHadith = item.type === "hadith";
  const meta     = META_BY_TYPE[item.type] ?? META_BY_TYPE.announcement;

  return (
    <div className="w-full max-w-[1500px] flex flex-col items-center text-center gap-6 lg:gap-10">
      {/* ─── Type-label (groot & duidelijk) ─────────────────── */}
      <div
        className={cn(
          "inline-flex items-center gap-3 lg:gap-5 rounded-full",
          "px-6 md:px-8 lg:px-10 py-2 md:py-3 lg:py-4",
          "border-2",
          meta.badge,
        )}
      >
        <span
          aria-hidden="true"
          className={cn("inline-block rounded-full", "w-3 h-3 lg:w-4 lg:h-4", meta.dot)}
        />
        <span className="font-display tracking-wide text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
          {meta.label}
        </span>
      </div>

      {isHadith ? (
        <>
          {/* Voor hadieth staat Arabisch BOVENAAN en is leidend */}
          {item.arabic_text && (
            <div
              className={cn(
                "font-arabic text-sand/95 max-w-[1400px] overflow-hidden",
                // Forse Arabische typografie + ruime regelafstand
                "text-4xl md:text-6xl lg:text-7xl xl:text-8xl",
                "leading-[1.7] md:leading-[1.7] lg:leading-[1.7]",
              )}
              lang="ar"
              dir="rtl"
              style={{
                display:           "-webkit-box",
                WebkitLineClamp:   3,
                WebkitBoxOrient:   "vertical",
              }}
            >
              {item.arabic_text}
            </div>
          )}

          {/* Optionele titel — kleiner dan Arabisch want context */}
          {item.title && (
            <h2
              className="font-display text-xl md:text-2xl lg:text-3xl text-sand/80 leading-tight max-w-4xl overflow-hidden"
              style={{
                display:           "-webkit-box",
                WebkitLineClamp:   2,
                WebkitBoxOrient:   "vertical",
              }}
            >
              {item.title}
            </h2>
          )}

          {/* Vertaling onder Arabisch — substantieel, maar kleiner dan arabic_text */}
          {(item.translation || item.body) && (
            <p
              className="font-body text-white/90 leading-relaxed max-w-5xl overflow-hidden text-2xl md:text-3xl lg:text-4xl"
              style={{
                display:           "-webkit-box",
                WebkitLineClamp:   4,
                WebkitBoxOrient:   "vertical",
              }}
            >
              {item.translation || item.body}
            </p>
          )}

          {/* Bron / referentie / grade — klein onderaan */}
          {(item.source || item.reference || item.grade) && (
            <div className="font-body text-base md:text-lg lg:text-xl text-sand/70 italic mt-2">
              {[item.source, item.reference].filter(Boolean).join(" — ")}
              {item.grade && (
                <span className="ml-3 not-italic font-medium">[{item.grade}]</span>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Voor andere types: titel groot, body eronder */}
          <h2
            className="font-display text-white leading-tight max-w-[1400px] overflow-hidden text-4xl md:text-6xl lg:text-7xl xl:text-8xl"
            style={{
              display:           "-webkit-box",
              WebkitLineClamp:   3,
              WebkitBoxOrient:   "vertical",
            }}
          >
            {item.title}
          </h2>

          {item.arabic_text && (
            <div
              className="font-arabic text-sand/90 leading-relaxed max-w-4xl overflow-hidden text-2xl md:text-3xl lg:text-4xl"
              lang="ar"
              dir="rtl"
              style={{
                display:           "-webkit-box",
                WebkitLineClamp:   3,
                WebkitBoxOrient:   "vertical",
              }}
            >
              {item.arabic_text}
            </div>
          )}

          {(item.translation || item.body) && (
            <p
              className="font-body text-white/90 leading-relaxed max-w-5xl overflow-hidden text-xl md:text-2xl lg:text-3xl xl:text-4xl"
              style={{
                display:           "-webkit-box",
                WebkitLineClamp:   6,
                WebkitBoxOrient:   "vertical",
              }}
            >
              {item.translation || item.body}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Type-meta (label + accentkleur per slide-type) ───────────
// Houdt elk type een rustige eigen identiteit — geen drukke palette.
const META_BY_TYPE: Record<
  TvAnnouncement["type"],
  { label: string; badge: string; dot: string }
> = {
  hadith: {
    label: "Hadieth",
    badge: "bg-white/10 border-sand/40 text-sand/95",
    dot:   "bg-sand",
  },
  reminder: {
    label: "Herinnering",
    badge: "bg-white/10 border-sand/40 text-sand/95",
    dot:   "bg-sand",
  },
  announcement: {
    label: "Mededeling",
    badge: "bg-white/15 border-white/40 text-white",
    dot:   "bg-white",
  },
  event: {
    label: "Evenement",
    badge: "bg-white/15 border-white/40 text-white",
    dot:   "bg-white",
  },
  donation: {
    label: "Donatie",
    badge: "bg-white/15 border-white/40 text-white",
    dot:   "bg-white",
  },
};

// ─── DonationSlide (Delivery TV-A) ────────────────────────────
// Layout: links campagne-info (titel, short_text, voortgang),
// rechts QR-code op witte achtergrond (~320px). Verhouding 60/40
// op LG+ zodat de QR scannable blijft vanaf afstand.
//
// Voortgang: alleen tonen als campagne.show_progress=true (admin
// stuurt dit via Directus). Hergebruikt bestaande velden:
//   - goal_amount_eur            (doelbedrag in euro's)
//   - manual_raised_amount_eur   (handmatige bijdrage)
//   - progress.autoRaisedCents   (server-side Stripe aggregatie)
//   - progress.monthlyDonorCount + manual_monthly_donor_count
//
// Self-guards:
//   - Lege qrSvg → playlist sloeg slide al over (zie useMemo).
//     Defense-in-depth: hier ook null-check.
//   - Geen voortgang als show_progress=false of goal_amount_eur ontbreekt.
function DonationSlide({ data }: { data: TvDonationSlideData }) {
  const { campaign, qrSvg, progress } = data;

  // Bedrag-formatting — geen externe lib (Intl is native + werkt
  // server- én client-side identiek).
  const fmtEur = (eurAmount: number): string => {
    try {
      return new Intl.NumberFormat("nl-NL", {
        style:                 "currency",
        currency:              "EUR",
        maximumFractionDigits: 0,
      }).format(eurAmount);
    } catch {
      return `€${Math.round(eurAmount)}`;
    }
  };

  // Voortgangsberekening — alleen relevant als show_progress aan staat.
  // Niet show_progress aan? → progressBlock = null en de slide toont
  // alleen titel + short_text + QR (rustiger voor gevoelige fondsen).
  const showProgress = campaign.show_progress === true;
  const goalEur      = Number(campaign.goal_amount_eur ?? 0);
  const manualEur    = Number(campaign.manual_raised_amount_eur ?? 0);
  const autoEur      = Math.round((progress.autoRaisedCents ?? 0) / 100);
  const raisedEur    = manualEur + autoEur;
  const monthlyDonors =
    (progress.monthlyDonorCount ?? 0) +
    Number(campaign.manual_monthly_donor_count ?? 0);

  const showProgressBlock = showProgress && goalEur > 0;
  // Percentage met clamp op 100 voor de balk (visueel) — bedrag mag
  // boven 100% uitkomen, dat is goed nieuws en mag in tekst staan.
  const pctClamped =
    showProgressBlock ? Math.min(100, Math.round((raisedEur / goalEur) * 100)) : 0;

  return (
    <div className="w-full max-w-[1500px] flex flex-col items-center gap-6 lg:gap-10">
      {/* Type-label — consistent met andere item-slides */}
      <div className="inline-flex items-center gap-3 lg:gap-5 rounded-full px-6 md:px-8 lg:px-10 py-2 md:py-3 lg:py-4 border-2 bg-white/15 border-white/40 text-white">
        <Heart
          aria-hidden="true"
          className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7"
          strokeWidth={2}
        />
        <span className="font-display tracking-wide text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
          Doneer mee
        </span>
      </div>

      {/* Twee-koloms layout op LG+: links info (60%), rechts QR (40%).
          Op mobile/tablet stacken we (info boven, QR onder) zodat de
          QR niet te klein wordt om te scannen. */}
      <div className="w-full flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-8 lg:gap-14">
        {/* Links — campagne info */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-4 lg:gap-6 max-w-[700px]">
          {/* Titel */}
          <h2
            className="font-display text-white leading-tight text-4xl md:text-5xl lg:text-6xl xl:text-7xl overflow-hidden"
            style={{
              display:         "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {campaign.title}
          </h2>

          {/* Short text — fallback naar description als short_text leeg is */}
          {(campaign.short_text || campaign.description) && (
            <p
              className="font-body text-sand/90 leading-relaxed text-xl md:text-2xl lg:text-3xl overflow-hidden"
              style={{
                display:         "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }}
            >
              {campaign.short_text || campaign.description}
            </p>
          )}

          {/* Voortgang — alleen als show_progress=true EN goal_amount_eur > 0 */}
          {showProgressBlock && (
            <div className="w-full max-w-[520px] flex flex-col gap-2 mt-2">
              <div className="flex items-baseline justify-between gap-4 font-display tabular-nums">
                <span className="text-white text-3xl md:text-4xl lg:text-5xl">
                  {fmtEur(raisedEur)}
                </span>
                <span className="text-sand/70 text-xl md:text-2xl lg:text-3xl">
                  van {fmtEur(goalEur)}
                </span>
              </div>
              {/* Balk — visuele clamp op 100, geen percentage-tekst om
                  niet competitief over te komen ("100% =klaar") en om
                  net-boven-100 niet aanstootgevend te tonen. */}
              <div className="w-full h-3 lg:h-4 rounded-full bg-white/10 border border-white/15 overflow-hidden">
                <div
                  className="h-full bg-white/85 transition-all duration-500"
                  style={{ width: `${pctClamped}%` }}
                />
              </div>
              {monthlyDonors > 0 && (
                <div className="font-body text-sand/75 text-base md:text-lg lg:text-xl mt-1">
                  {monthlyDonors === 1
                    ? "1 maandelijkse donateur"
                    : `${monthlyDonors} maandelijkse donateurs`}
                </div>
              )}
            </div>
          )}

          {/* CTA-tekst onder info — verwijst naar QR rechts */}
          <p className="font-body text-white/90 text-lg md:text-xl lg:text-2xl mt-2">
            Scan de QR-code voor directe donatie
          </p>
        </div>

        {/* Rechts — QR-code in wit blok */}
        {qrSvg && (
          <div className="shrink-0 flex flex-col items-center gap-3">
            <div
              className="bg-white rounded-2xl p-4 md:p-5 lg:p-6 shadow-2xl shadow-black/40"
              style={{
                // Vaste pixel-afmetingen zorgen dat QR groot genoeg
                // is om vanaf 4-5 meter te scannen. Op kleinere
                // breakpoints houden we een minimum.
                width:  "min(320px, 80vw)",
                height: "min(320px, 80vw)",
              }}
              aria-label={`QR-code naar ${data.donateUrl}`}
              // SVG-string is server-side gerenderd door lib/qrcode.ts
              // — geen XSS-risico (vaste lib output, vaste opties).
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            {/* URL-fallback onder QR — voor wie geen telefoon bij zich heeft */}
            <p className="font-body tabular-nums text-sand/75 text-base md:text-lg text-center max-w-[320px] break-all">
              al-ghofraan.nl/doneren
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ActivitySlide (Delivery TV-A) ────────────────────────────
// Eerstvolgende activiteit op TV. Tekst-only — geen image om TV
// rustig te houden (image-aspectratio's variëren, willen geen
// onverwachte witvlakken op groot scherm).
//
// Layout:
//   - Type-label "Eerstvolgende activiteit"
//   - Titel groot
//   - Datum + locatie als chip-row
//   - Korte beschrijving (line-clamp 3)
function ActivitySlide({ data }: { data: TvActivitySlideData }) {
  const { activity } = data;

  // Datum-formatting in Europe/Amsterdam — herbruik native Intl met
  // nl-NL locale. Doet automatisch DST en weekdagen.
  // Voor recurring activities staat start_date vaak in het verleden;
  // dan tonen we toch die datum (de admin heeft via recurring de
  // bedoeling de serie lopend te houden). Volgende-occurrence-logica
  // is uit scope voor TV — /agenda toont dat correct.
  let dateLabel = "";
  let timeLabel = "";
  try {
    const d = new Date(activity.start_date);
    if (!Number.isNaN(d.getTime())) {
      dateLabel = new Intl.DateTimeFormat("nl-NL", {
        weekday:  "long",
        day:      "numeric",
        month:    "long",
        year:     "numeric",
        timeZone: "Europe/Amsterdam",
      }).format(d);
      // Tijd alleen tonen als start_date een tijd-component heeft
      // (T-separator). Date-only events tonen geen 00:00.
      if (/T\d{2}:\d{2}/.test(activity.start_date)) {
        timeLabel = new Intl.DateTimeFormat("nl-NL", {
          hour:     "2-digit",
          minute:   "2-digit",
          timeZone: "Europe/Amsterdam",
        }).format(d);
      }
    }
  } catch {
    // Fail-soft: lege labels, slide toont titel + locatie zonder datum.
  }

  return (
    <div className="w-full max-w-[1500px] flex flex-col items-center text-center gap-6 lg:gap-10">
      {/* Type-label */}
      <div className="inline-flex items-center gap-3 lg:gap-5 rounded-full px-6 md:px-8 lg:px-10 py-2 md:py-3 lg:py-4 border-2 bg-white/15 border-white/40 text-white">
        <Calendar
          aria-hidden="true"
          className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7"
          strokeWidth={2}
        />
        <span className="font-display tracking-wide text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
          Eerstvolgende activiteit
        </span>
      </div>

      {/* Titel — leidend, groot */}
      <h2
        className="font-display text-white leading-tight max-w-[1400px] overflow-hidden text-4xl md:text-6xl lg:text-7xl xl:text-8xl"
        style={{
          display:         "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}
      >
        {activity.title}
      </h2>

      {/* Meta-chips: datum + locatie. Capitalisering: weekdag krijgt
          first-letter-caps via CSS zodat we niet hoeven te slicen. */}
      {(dateLabel || activity.location) && (
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          {dateLabel && (
            <div className="inline-flex items-center gap-2 md:gap-3 rounded-full px-5 md:px-6 py-2 md:py-3 bg-white/10 border border-white/20">
              <Calendar
                aria-hidden="true"
                className="w-5 h-5 md:w-6 md:h-6 text-sand/85"
                strokeWidth={1.75}
              />
              <span className="font-body text-white text-xl md:text-2xl lg:text-3xl capitalize">
                {dateLabel}
                {timeLabel && (
                  <>
                    <span className="text-sand/60 mx-2">·</span>
                    <span className="tabular-nums">{timeLabel}</span>
                  </>
                )}
              </span>
            </div>
          )}
          {activity.location && (
            <div className="inline-flex items-center gap-2 md:gap-3 rounded-full px-5 md:px-6 py-2 md:py-3 bg-white/10 border border-white/20">
              <MapPin
                aria-hidden="true"
                className="w-5 h-5 md:w-6 md:h-6 text-sand/85"
                strokeWidth={1.75}
              />
              <span className="font-body text-white text-xl md:text-2xl lg:text-3xl">
                {activity.location}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Korte beschrijving — plain text, line-clamp houdt TV-layout stabiel.
          stripHtml() decodeert HTML-tags én entities (&nbsp; &amp; &#39; ...)
          uit het Directus rich-text veld. GEEN dangerouslySetInnerHTML op
          de TV-route — bezoekers in de moskee zien rustige tekst, geen
          rauwe HTML. Self-guard: lege output na strip → geen <p> renderen. */}
      {(() => {
        const plain = stripHtml(activity.description);
        if (!plain) return null;
        return (
          <p
            className="font-body text-white/90 leading-relaxed max-w-5xl text-xl md:text-2xl lg:text-3xl xl:text-4xl overflow-hidden"
            style={{
              display:         "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
            }}
          >
            {plain}
          </p>
        );
      })()}
    </div>
  );
}

// ─── SeriesSlide ───────────────────────────────────────────────
// Delivery B — hadieth uit een actieve serie. Visueel sterk gespiegeld
// op de hadieth-variant van ItemSlide (Arabisch leidend, NL-vertaling
// onder, bron + authenticiteit klein), maar met het serie-titel als
// label (bv. "Djoemoe'ah-serie", "Ramadhaan-serie", "Algemene ahadieth").
//
// Server (lib/hadiethSeries.ts) garandeert dat translation_nl niet leeg is.
// arabic_text en source/authenticity zijn optioneel.
function SeriesSlide({ data }: { data: TvSeriesSlideData }) {
  const { series, item } = data;
  return (
    <div className="w-full max-w-[1500px] flex flex-col items-center text-center gap-6 lg:gap-10">
      {/* ─── Serie-label ────────────────────────────────────── */}
      <div
        className={cn(
          "inline-flex items-center gap-3 lg:gap-5 rounded-full",
          "px-6 md:px-8 lg:px-10 py-2 md:py-3 lg:py-4",
          "border-2 border-sand/50 bg-sand/15 text-sand",
        )}
      >
        <BookOpen
          aria-hidden="true"
          className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
          strokeWidth={1.75}
        />
        <span className="font-display tracking-wide text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
          {series.title}
        </span>
      </div>

      {/* ─── Arabische tekst leidend (optioneel) ────────────── */}
      {item.arabic_text && (
        <div
          className={cn(
            "font-arabic text-sand/95 max-w-[1400px] overflow-hidden",
            "text-4xl md:text-6xl lg:text-7xl xl:text-8xl",
            "leading-[1.7] md:leading-[1.7] lg:leading-[1.7]",
          )}
          lang="ar"
          dir="rtl"
          style={{
            display:         "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {item.arabic_text}
        </div>
      )}

      {/* ─── Nederlandse vertaling (vereist) ─────────────────── */}
      <p
        className="font-body text-white/90 leading-relaxed max-w-5xl overflow-hidden text-2xl md:text-3xl lg:text-4xl"
        style={{
          display:         "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
        }}
      >
        {item.translation_nl}
      </p>

      {/* ─── Bron + authenticiteit klein onderaan ───────────── */}
      {(item.source || item.authenticity) && (
        <div className="font-body text-base md:text-lg lg:text-xl text-sand/70 italic mt-2">
          {item.source}
          {item.authenticity && (
            <span className="ml-3 not-italic font-medium">[{item.authenticity}]</span>
          )}
        </div>
      )}
    </div>
  );
}
