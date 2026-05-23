// lib/hadiethSeries.ts
//
// Beheerbare hadieth-series voor /gebedstijden/tv (Delivery B, stap 56).
//
// Verantwoordelijkheden:
//   - `isSeriesActiveNow(series, ctx)`  → pure functie, geeft aan of een
//      serie nu actief is volgens zijn schedule_type.
//   - `pickActiveSeries(seriesList, ctx)` → kies de winnende serie
//      (hoogste priority, stabiele tie-break).
//   - `pickSeriesItemForToday(items, now)` → kies deterministisch het
//      item van vandaag (dag-rotatie).
//   - `getTvHadiethSeries(now)` → server-side wrapper: haalt
//      published/active/show_on_tv series + items op (admin-token),
//      doet de hele pipeline, returnt {series, item} | null.
//
// Schedule-types:
//   - "always"        — altijd actief
//   - "date_range"    — vandaag (NL) tussen start_date en end_date
//   - "weekly_window" — wekelijks venster, bv. donderdag-maghrib t/m vrijdag-maghrib
//   - "hijri_month"   — vandaag's Hijri-maand == hijri_month (via Intl + overrides)
//
// Veilige defaults overal — bij ontbrekende config of CSV-fout geeft
// elke check `false`, zodat de TV stilletjes terugvalt op gewone slides.

import { readItems } from "@directus/sdk";

import {
  directusServer,
  getHijriDateOverrides,
} from "./directus";
import {
  getAmsterdamDateParts,
  getAmsterdamMinutes,
  getTodayIsoInAmsterdam,
  timeToMinutes,
  type PrayerKey,
} from "./prayerTimes";
import {
  buildHijriOverrideMap,
  getHijriDate,
} from "./hijri";
import type {
  HadiethSeries,
  HadiethSeriesItem,
  PrayerTimeRow,
} from "@/types/directus";

/**
 * Lokale fail-soft wrapper. Equivalent aan de `safe()` in lib/directus.ts
 * maar daar privaat — we dupliceren minimaal hier om dat bestand niet aan
 * te raken. Bij elke Directus-fout: log + return fallback, geen exception
 * naar boven (TV-route mag nooit crashen op data-fetch).
 */
async function safeOrNull<T>(
  fn: () => Promise<T | null>,
  label: string,
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[hadiethSeries] ${label} faalde:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Constanten (één bron van waarheid voor seed + code) ─────────

export const SCHEDULE_TYPES = [
  "always",
  "date_range",
  "weekly_window",
  "hijri_month",
] as const;

export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

/**
 * Weekday-conventie: JS getDay(). 0=zondag .. 6=zaterdag.
 * Beheerder ziet dit terug in de field-note van weekday_start/weekday_end.
 */
export const WEEKDAYS_NL: Record<number, string> = {
  0: "zondag",
  1: "maandag",
  2: "dinsdag",
  3: "woensdag",
  4: "donderdag",
  5: "vrijdag",
  6: "zaterdag",
};

// ─── Context voor isSeriesActiveNow ──────────────────────────────

export interface SeriesContext {
  /** Vandaag's gebedstijden-rij (CSV). null = geen rij, weekly_window gaat false. */
  todayRow: PrayerTimeRow | null;
  /** Now (server-tijd; NL-tijd wordt intern berekend). */
  now: Date;
  /**
   * Vandaag's Hijri-datum (optioneel). Indien meegegeven gebruikt
   * hijri_month-schedule deze; anders berekent de check zelf (extra Intl call).
   */
  hijriToday?: { day: number; month: number; year: number } | null;
}

// ─── Schedule-evaluatie ──────────────────────────────────────────

export function isSeriesActiveNow(
  series: HadiethSeries,
  ctx: SeriesContext,
): boolean {
  // Basisvoorwaarden — defensief check, hoewel de fetch al filtert.
  if (series.status !== "published") return false;
  if (series.active === false) return false;
  if (series.show_on_tv === false) return false;

  switch (series.schedule_type) {
    case "always":
      return true;
    case "date_range":
      return isInDateRange(series, ctx.now);
    case "weekly_window":
      return isInWeeklyWindow(series, ctx);
    case "hijri_month":
      return isInHijriMonth(series, ctx);
    default:
      // Onbekende of ontbrekende schedule_type → veilig false
      return false;
  }
}

// ─── date_range ──────────────────────────────────────────────────

function isInDateRange(series: HadiethSeries, now: Date): boolean {
  const todayIso = getTodayIsoInAmsterdam(now);
  const start = normalizeIsoDate(series.start_date);
  const end   = normalizeIsoDate(series.end_date);
  if (!start || !end) return false;
  // Inclusief aan beide kanten — beheerder verwacht "loopt t/m 19 maart".
  return todayIso >= start && todayIso <= end;
}

/** Normaliseer "2026-03-19T00:00:00" → "2026-03-19". null bij invalid. */
function normalizeIsoDate(v: string | null | undefined): string | null {
  if (!v || typeof v !== "string") return null;
  const slice = v.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : null;
}

// ─── weekly_window ───────────────────────────────────────────────

const VALID_PRAYERS: ReadonlyArray<PrayerKey> = [
  "fajr", "shoeroeq", "dhoehr", "asr", "maghrib", "ishaa",
];

function isValidPrayerKey(k: string | null | undefined): k is PrayerKey {
  return !!k && (VALID_PRAYERS as readonly string[]).includes(k);
}

/**
 * Wekelijks venster van (weekday_start @ start_prayer) tot
 * (weekday_end @ end_prayer), Europe/Amsterdam.
 *
 * Strategie zonder volledige CSV-week:
 *   - Bepaal vandaag's NL weekdag (0-6) en NL-minuten-since-midnight.
 *   - Lees vandaag's start_prayer en end_prayer uit `todayRow`.
 *   - Voor cross-day venster (start_dag != eind_dag):
 *       * Vandaag == start_dag → actief als now >= start_prayer-tijd
 *       * Vandaag == eind_dag  → actief als now <  end_prayer-tijd
 *       * Vandaag is "tussendag" (cyclisch tussen start en eind) → actief
 *       * Anders → niet actief
 *   - Voor zelfde-dag venster (start_dag == eind_dag):
 *       * Vandaag == start_dag → actief als start_prayer ≤ now < end_prayer
 *       * Anders → niet actief
 *
 * Fail-soft: ontbrekende todayRow of ongeldig gebed → false.
 */
function isInWeeklyWindow(series: HadiethSeries, ctx: SeriesContext): boolean {
  const ws = series.weekday_start;
  const we = series.weekday_end;
  const sp = series.start_prayer;
  const ep = series.end_prayer;

  if (typeof ws !== "number" || typeof we !== "number") return false;
  if (ws < 0 || ws > 6 || we < 0 || we > 6) return false;
  if (!isValidPrayerKey(sp) || !isValidPrayerKey(ep)) return false;
  if (!ctx.todayRow) return false;

  const parts        = getAmsterdamDateParts(ctx.now);
  // JS Date.getDay() in Amsterdam: bouw via Date.UTC + parts (geen
  // tijdcomponent → datum-only is robuust).
  const todayWeekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const nowMinutes   = getAmsterdamMinutes(ctx.now);

  const startMins = timeToMinutes(ctx.todayRow[sp] as string);
  const endMins   = timeToMinutes(ctx.todayRow[ep] as string);
  if (startMins === null && todayWeekday === ws) return false;
  if (endMins   === null && todayWeekday === we) return false;

  if (ws === we) {
    // Zelfde-dag venster
    if (todayWeekday !== ws) return false;
    if (startMins === null || endMins === null) return false;
    return startMins <= nowMinutes && nowMinutes < endMins;
  }

  // Cross-day venster
  if (todayWeekday === ws) {
    return startMins !== null && nowMinutes >= startMins;
  }
  if (todayWeekday === we) {
    return endMins !== null && nowMinutes < endMins;
  }
  // Tussendag-check (cyclisch). Bv. ws=4 (do), we=1 (ma): tussendagen
  // zijn 5 (vr), 6 (za), 0 (zo). Bv. ws=4, we=5 (klassieke Djoemoe'ah):
  // geen tussendagen.
  return isWeekdayBetweenExclusive(todayWeekday, ws, we);
}

/** Cyclische "tussen" check, exclusief beide eindpunten. */
function isWeekdayBetweenExclusive(d: number, start: number, end: number): boolean {
  let cur = (start + 1) % 7;
  while (cur !== end) {
    if (cur === d) return true;
    cur = (cur + 1) % 7;
  }
  return false;
}

// ─── hijri_month ─────────────────────────────────────────────────

function isInHijriMonth(series: HadiethSeries, ctx: SeriesContext): boolean {
  const target = series.hijri_month;
  if (typeof target !== "number" || target < 1 || target > 12) return false;

  // Gebruik meegegeven Hijri (vermijdt dubbele Intl-call) of bereken nu.
  const h = ctx.hijriToday ?? getHijriDate(ctx.now);
  if (!h) return false;
  return h.month === target;
}

// ─── Serie kiezen ────────────────────────────────────────────────

/**
 * Kies de winnende serie uit een lijst, gegeven de context.
 *
 * Tie-break (deterministisch):
 *   1. Hoogste `priority` wint.
 *   2. Daarna alphabetisch op slug (ASC).
 *   3. Daarna op id (ASC) — laatste vangnet voor dubbele slugs (hoort
 *      niet voor te komen door unique-index op slug).
 *
 * Returnt null bij geen actieve serie.
 */
export function pickActiveSeries(
  seriesList: HadiethSeries[],
  ctx: SeriesContext,
): HadiethSeries | null {
  const active = seriesList.filter((s) => isSeriesActiveNow(s, ctx));
  if (active.length === 0) return null;
  active.sort((a, b) => {
    const pa = typeof a.priority === "number" ? a.priority : 0;
    const pb = typeof b.priority === "number" ? b.priority : 0;
    if (pa !== pb) return pb - pa; // hoogste eerst
    const sa = (a.slug ?? "").toLowerCase();
    const sb = (b.slug ?? "").toLowerCase();
    if (sa !== sb) return sa < sb ? -1 : 1;
    const ia = String(a.id ?? "");
    const ib = String(b.id ?? "");
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
  return active[0];
}

// ─── Item-rotatie ────────────────────────────────────────────────

/**
 * Bereken "dag-index" in Europe/Amsterdam:
 *   floor((midnight_NL_van_vandaag_in_UTC_ms) / 86400000)
 *
 * Geeft een geheel getal dat één keer per NL-dag verspringt; ideaal voor
 * deterministische dagrotatie. Bij DST-overgangen blijft de index stabiel
 * omdat we de datum-componenten gebruiken, niet wall-clock.
 */
export function getAmsterdamDayIndex(now: Date = new Date()): number {
  const p = getAmsterdamDateParts(now);
  const midnightUtcMs = Date.UTC(p.year, p.month - 1, p.day);
  return Math.floor(midnightUtcMs / 86_400_000);
}

/**
 * Kies item van vandaag uit een serie. Items moeten reeds gefilterd zijn
 * op status=published EN active=true en gesorteerd op (sort ASC, id ASC).
 *
 * Returnt null als items leeg is.
 */
export function pickSeriesItemForToday(
  items: HadiethSeriesItem[],
  now: Date = new Date(),
): HadiethSeriesItem | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  const idx = getAmsterdamDayIndex(now) % items.length;
  return items[idx];
}

// ─── Server-side fetch — admin-token ─────────────────────────────

const SERIES_FIELDS = [
  "id", "status", "active", "title", "slug", "description",
  "priority", "show_on_tv", "schedule_type",
  "start_date", "end_date",
  "weekday_start", "weekday_end", "start_prayer", "end_prayer",
  "hijri_month",
  "sort",
];

const SERIES_ITEM_FIELDS = [
  "id", "status", "active", "series",
  "arabic_text", "translation_nl",
  "source", "authenticity", "explanation_short",
  "sort",
];

/**
 * Resultaat voor TV-route: de winnende serie + het item van vandaag,
 * of null als er geen actieve serie / geen items zijn.
 */
export interface TvHadiethSeriesResult {
  series: HadiethSeries;
  item:   HadiethSeriesItem;
}

/**
 * Hoofd-entry voor de TV-route. Haalt alle kandidaat-series op (klein
 * dataset, server-side admin-token), bepaalt winnaar via `pickActiveSeries`,
 * haalt items van de winnende serie op, en kiest item van vandaag.
 *
 * Fail-soft: returnt null bij Directus-fout of geen winnaar.
 */
export async function getTvHadiethSeries(
  todayRow: PrayerTimeRow | null,
  now: Date = new Date(),
): Promise<TvHadiethSeriesResult | null> {
  return safeOrNull(
    async () => {
      // 1. Kandidaten ophalen — published EN active EN show_on_tv
      const seriesResp = await directusServer.request(
        readItems("hadieth_series", {
          filter: {
            status:     { _eq: "published" },
            active:     { _eq: true },
            show_on_tv: { _eq: true },
          } as never,
          fields: SERIES_FIELDS,
          limit:  -1,
        }),
      );
      const candidates = (seriesResp as unknown as HadiethSeries[]) ?? [];
      if (candidates.length === 0) return null;

      // 2. Hijri-overrides ophalen voor hijri_month-schedules.
      //    Best-effort: bij fout = lege map (Intl-fallback in getHijriDate).
      const needsHijri = candidates.some((s) => s.schedule_type === "hijri_month");
      let hijriToday = null as { day: number; month: number; year: number } | null;
      if (needsHijri) {
        let overrideMap;
        try {
          const overrides = await getHijriDateOverrides();
          overrideMap = buildHijriOverrideMap(overrides);
        } catch {
          overrideMap = undefined;
        }
        const h = getHijriDate(now, overrideMap);
        if (h) hijriToday = { day: h.day, month: h.month, year: h.year };
      }

      // 3. Winnaar kiezen
      const ctx: SeriesContext = { todayRow, now, hijriToday };
      const winner = pickActiveSeries(candidates, ctx);
      if (!winner) return null;

      // 4. Items van de winnende serie ophalen
      const itemsResp = await directusServer.request(
        readItems("hadieth_series_items", {
          filter: {
            status: { _eq: "published" },
            active: { _eq: true },
            series: { _eq: winner.id },
          } as never,
          fields: SERIES_ITEM_FIELDS,
          sort:   ["sort", "id"],
          limit:  -1,
        }),
      );
      const items = (itemsResp as unknown as HadiethSeriesItem[]) ?? [];

      // 5. Item van vandaag — geen items = geen slide
      const item = pickSeriesItemForToday(items, now);
      if (!item) return null;
      if (!item.translation_nl || item.translation_nl.trim() === "") return null;

      return { series: winner, item };
    },
    "getTvHadiethSeries",
  );
}
