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
//   │           - announcement / hadith / reminder ... (15s)     │
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
import { Sunrise, Sun, CloudSun, Sunset, Moon, MoonStar } from "lucide-react";
import type { LucideIcon }              from "lucide-react";
import { cn }                           from "@/lib/utils";
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
} from "@/types/directus";

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
  { key: "asr",      label: "Asr",      arabic: "العصر",   Icon: CloudSun },
  { key: "maghrib",  label: "Maghrib",  arabic: "المغرب",  Icon: Sunset   },
  { key: "ishaa",    label: "Ishaa",    arabic: "العشاء",  Icon: Moon     },
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
  | { kind: "item"; item: TvAnnouncement };

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
}

export default function PrayerTimesTvDisplay({
  siteName,
  logoUrl,
  todayRow,
  tomorrowRow,
  announcements,
  subtitle,
  tvConfig,
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

  // ─── Playlist [prayer, item, prayer, item, ...] ────────────
  const slides: Slide[] = useMemo(() => {
    const list: Slide[] = [{ kind: "prayer" }];
    for (const item of announcements) {
      list.push({ kind: "item", item });
      list.push({ kind: "prayer" });
    }
    return list;
  }, [announcements]);

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
          {currentSlide.kind === "prayer" ? (
            <PrayerSlide
              todayRow={slideRow}
              nextPrayerKey={nextPrayerKey}
            />
          ) : (
            <ItemSlide item={currentSlide.item} />
          )}
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

// ─── Item-slide (announcement / hadith / reminder / event / donation) ─
// Layout-keuzes:
//   - Type-label is groot en gekleurd zodat het van afstand leesbaar is
//   - Voor hadith: Arabisch is bewust de grootste tekst, vertaling eronder kleiner
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
          {/* Voor hadith staat Arabisch BOVENAAN en is leidend */}
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
    label: "Hadith",
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
