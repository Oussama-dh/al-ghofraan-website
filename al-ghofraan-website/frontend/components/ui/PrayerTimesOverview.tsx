// components/ui/PrayerTimesOverview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import HijriPrayerTimesTable from "@/components/ui/HijriPrayerTimesTable";
import PrayerTimesTable from "@/components/ui/PrayerTimesTable";
import {
  parseRowDate,
  getMonthRows,
  getAvailableYears,
} from "@/lib/prayerTimes";
import {
  buildHijriOverrideMap,
  listGregorianDatesInHijriMonth,
  listAvailableHijriMonthsForRange,
  listHijriMonths,
  getHijriDate,
  formatHijriShortNl,
} from "@/lib/hijri";
import { buildHighlightMap } from "@/lib/highlights";
import type {
  PrayerTimeRow,
  HijriDateOverride,
  PrayerCalendarHighlight,
} from "@/types/directus";
import { cn } from "@/lib/utils";

interface PrayerTimesOverviewProps {
  rows: PrayerTimeRow[];
  /**
   * Optionele Hijri-overrides uit Directus. Bepalen welke Hijri-maand een
   * gregoriaanse datum hoort, en daarmee ook welke dag in welke maand
   * verschijnt. Voor stabiel gedrag past de override pas toe als de admin
   * 'm publiceert; rond de override-datum zal de aangrenzende dag dus
   * effectief opschuiven.
   */
  hijriOverrides?: HijriDateOverride[];
  /**
   * Delivery 21 — Kalender-highlights (Eid, Ramadan, eigen events). Worden
   * intern omgezet naar een Map<isoDate, highlights[]> en doorgegeven aan
   * beide tabellen.
   */
  highlights?: PrayerCalendarHighlight[];
}

type CalendarMode = "hijri" | "gregorian";

const ALL_HIJRI_MONTHS = listHijriMonths();

const NL_MONTH_NAMES = [
  "januari", "februari", "maart", "april",
  "mei", "juni", "juli", "augustus",
  "september", "oktober", "november", "december",
];

export default function PrayerTimesOverview({ rows, hijriOverrides, highlights }: PrayerTimesOverviewProps) {
  // ─── Calendar mode toggle ─────────────────────────────────
  // Default = "gregorian" (Gregoriaanse kalender-weergave is de
  // herkenbaarste voor de meeste bezoekers). De toggle hieronder
  // laat de bezoeker omschakelen naar "hijri" voor de Islamitische
  // maand-weergave.
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("gregorian");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  // ─── 1. Override map (één keer bouwen) ────────────────────
  const overrideMap = useMemo(
    () => buildHijriOverrideMap(hijriOverrides ?? []),
    [hijriOverrides],
  );

  // Delivery 21 — Highlights map (ISO-datum → highlights[]). Wordt
  // gedeeld door beide tabellen.
  const highlightsByIso = useMemo(
    () => (mounted ? buildHighlightMap(highlights ?? []) : undefined),
    [highlights, mounted],
  );

  // ─── 2. Bepaal de gregoriaanse range van de CSV ───────────
  const csvRange = useMemo(() => {
    if (rows.length === 0) return null;
    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const row of rows) {
      const p = parseRowDate(row.datum);
      if (!p) continue;
      const ms = Date.UTC(p.year, p.month - 1, p.day);
      if (ms < minMs) minMs = ms;
      if (ms > maxMs) maxMs = ms;
    }
    if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return null;
    return { start: new Date(minMs), end: new Date(maxMs) };
  }, [rows]);

  // ─── 3. HIJRI: beschikbare Hijri-maanden + selectie ──────
  const availableHijriMonths = useMemo(() => {
    if (!csvRange) return [];
    return listAvailableHijriMonthsForRange(csvRange.start, csvRange.end, overrideMap);
  }, [csvRange, overrideMap]);

  const defaultHijriSelection = useMemo(() => {
    const today = new Date();
    const h = getHijriDate(today, overrideMap);
    if (h) {
      const exists = availableHijriMonths.some(
        (m) => m.year === h.year && m.month === h.month,
      );
      if (exists) return { year: h.year, month: h.month };
    }
    if (availableHijriMonths.length > 0) {
      return {
        year: availableHijriMonths[0].year,
        month: availableHijriMonths[0].month,
      };
    }
    return { year: 0, month: 0 };
  }, [availableHijriMonths, overrideMap]);

  const [selectedHijriYear, setSelectedHijriYear] = useState<number>(defaultHijriSelection.year);
  const [selectedHijriMonth, setSelectedHijriMonth] = useState<number>(defaultHijriSelection.month);

  // Beschikbare Hijri-jaren (uniek)
  const availableHijriYears = useMemo(() => {
    const set = new Set<number>();
    for (const m of availableHijriMonths) set.add(m.year);
    return Array.from(set).sort((a, b) => a - b);
  }, [availableHijriMonths]);

  // Beschikbare maanden voor het geselecteerde jaar
  const monthsForSelectedHijriYear = useMemo(() => {
    return availableHijriMonths.filter((m) => m.year === selectedHijriYear);
  }, [availableHijriMonths, selectedHijriYear]);

  // Bij verandering van jaar: zorg dat geselecteerde maand bestaat in dat jaar
  if (
    monthsForSelectedHijriYear.length > 0 &&
    !monthsForSelectedHijriYear.some((m) => m.month === selectedHijriMonth)
  ) {
    setTimeout(() => setSelectedHijriMonth(monthsForSelectedHijriYear[0].month), 0);
  }

  const hijriMonthRows = useMemo(() => {
    if (selectedHijriYear === 0 || selectedHijriMonth === 0) return [];
    return listGregorianDatesInHijriMonth(selectedHijriYear, selectedHijriMonth, overrideMap);
  }, [selectedHijriYear, selectedHijriMonth, overrideMap]);

  // ─── 4. GREGORIAAN: beschikbare jaren/maanden + selectie ─
  const availableGregorianYears = useMemo(() => getAvailableYears(rows), [rows]);

  // Welke maanden komen voor in een bepaald Gregoriaans jaar?
  const monthsByGregorianYear = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const row of rows) {
      const p = parseRowDate(row.datum);
      if (!p) continue;
      if (!map.has(p.year)) map.set(p.year, new Set<number>());
      map.get(p.year)!.add(p.month);
    }
    return map;
  }, [rows]);

  const defaultGregorianSelection = useMemo(() => {
    const today = new Date();
    const ty = today.getFullYear();
    const tm = today.getMonth() + 1;
    if (monthsByGregorianYear.get(ty)?.has(tm)) {
      return { year: ty, month: tm };
    }
    if (availableGregorianYears.length > 0) {
      const y = availableGregorianYears[availableGregorianYears.length - 1];
      const months = Array.from(monthsByGregorianYear.get(y) ?? []).sort((a, b) => a - b);
      return { year: y, month: months[0] ?? 1 };
    }
    return { year: 0, month: 0 };
  }, [availableGregorianYears, monthsByGregorianYear]);

  const [selectedGregYear, setSelectedGregYear] = useState<number>(defaultGregorianSelection.year);
  const [selectedGregMonth, setSelectedGregMonth] = useState<number>(defaultGregorianSelection.month);

  const monthsForSelectedGregYear = useMemo(() => {
    const set = monthsByGregorianYear.get(selectedGregYear);
    if (!set) return [];
    return Array.from(set).sort((a, b) => a - b);
  }, [monthsByGregorianYear, selectedGregYear]);

  // Als de gekozen maand niet bestaat in het gekozen jaar, val terug op de
  // eerste beschikbare maand van dat jaar.
  if (
    monthsForSelectedGregYear.length > 0 &&
    !monthsForSelectedGregYear.includes(selectedGregMonth)
  ) {
    setTimeout(() => setSelectedGregMonth(monthsForSelectedGregYear[0]), 0);
  }

  const gregorianMonthRows = useMemo(() => {
    if (selectedGregYear === 0 || selectedGregMonth === 0) return [];
    return getMonthRows(rows, selectedGregYear, selectedGregMonth);
  }, [rows, selectedGregYear, selectedGregMonth]);

  // Hijri-label per CSV-datum — gebruikt door PrayerTimesTable's hijri-kolom.
  const hijriByDatum = useMemo(() => {
    const out: Record<string, string> = {};
    for (const row of gregorianMonthRows) {
      const p = parseRowDate(row.datum);
      if (!p) continue;
      const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
      const h = getHijriDate(d, overrideMap);
      if (h) out[row.datum] = formatHijriShortNl(h);
    }
    return out;
  }, [gregorianMonthRows, overrideMap]);

  // ─── Vandaag-anker (CSV-datum-string) — voor highlight ───
const todayDatum = useMemo(() => {
  if (!mounted) return undefined;

  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth() + 1;
  const todayD = now.getDate();

  const match = rows.find((row) => {
    const p = parseRowDate(row.datum);
    return p && p.year === todayY && p.month === todayM && p.day === todayD;
  });

  return match?.datum;
}, [rows, mounted]);

  // ─── Header-strip (alleen Hijri-mode) ────────────────────
  const hijriHeaderInfo = useMemo(() => {
    if (hijriMonthRows.length === 0) return null;
    const monthMeta = ALL_HIJRI_MONTHS.find((m) => m.month === selectedHijriMonth);
    const monthLabel = monthMeta ? monthMeta.nl : `Maand ${selectedHijriMonth}`;
    const arabicLabel = monthMeta ? monthMeta.ar : "";
    const first = hijriMonthRows[0].gregorian;
    const last = hijriMonthRows[hijriMonthRows.length - 1].gregorian;
    const fmtDate = (d: Date) =>
      `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
    return {
      monthLabel,
      arabicLabel,
      year: selectedHijriYear,
      range: `${fmtDate(first)} t/m ${fmtDate(last)}`,
      days: hijriMonthRows.length,
    };
  }, [hijriMonthRows, selectedHijriMonth, selectedHijriYear]);

  // ─── Render ────────────────────────────────────────────────
  const hasData = availableHijriMonths.length > 0 || availableGregorianYears.length > 0;

  return (
    <div className="space-y-6">
      {/* Calendar-mode toggle — segmented control */}
      {hasData && (
        <div className="flex flex-col gap-2">
          <span className="font-body text-xs uppercase tracking-widest text-taupe-dark font-semibold">
            Kalender
          </span>
          <div
            role="tablist"
            aria-label="Kalenderkeuze"
            className="inline-flex p-1 bg-white border border-sand-200 rounded-xl self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={calendarMode === "hijri"}
              onClick={() => setCalendarMode("hijri")}
              className={cn(
                "px-4 py-2 rounded-lg font-body text-sm transition-colors",
                calendarMode === "hijri"
                  ? "bg-slate-mosque text-white shadow-sm"
                  : "text-taupe-dark hover:bg-sand-50",
              )}
            >
              Hijri kalender
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={calendarMode === "gregorian"}
              onClick={() => setCalendarMode("gregorian")}
              className={cn(
                "px-4 py-2 rounded-lg font-body text-sm transition-colors",
                calendarMode === "gregorian"
                  ? "bg-slate-mosque text-white shadow-sm"
                  : "text-taupe-dark hover:bg-sand-50",
              )}
            >
              Gregoriaanse kalender
            </button>
          </div>
        </div>
      )}

      {/* ─── HIJRI MODE ─────────────────────────────────────── */}
      {calendarMode === "hijri" && (
        <>
          {availableHijriMonths.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label
                  htmlFor="hijri-month-select"
                  className="block font-body text-xs uppercase tracking-widest text-taupe-dark mb-1.5 font-semibold"
                >
                  Hijri kalender
                </label>
                <select
                  id="hijri-month-select"
                  value={selectedHijriMonth}
                  onChange={(e) => setSelectedHijriMonth(Number(e.target.value))}
                  className={cn(
                    "w-full bg-white border border-sand-200 rounded-xl px-4 py-3",
                    "font-body text-base text-ink",
                    "focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-transparent",
                    "transition",
                  )}
                >
                  {monthsForSelectedHijriYear.map((m) => (
                    <option key={m.month} value={m.month}>
                      {m.nl}
                    </option>
                  ))}
                </select>
              </div>

              {availableHijriYears.length > 1 && (
                <div className="flex-1">
                  <label
                    htmlFor="hijri-year-select"
                    className="block font-body text-xs uppercase tracking-widest text-taupe-dark mb-1.5 font-semibold"
                  >
                    Hijri-jaar
                  </label>
                  <select
                    id="hijri-year-select"
                    value={selectedHijriYear}
                    onChange={(e) => setSelectedHijriYear(Number(e.target.value))}
                    className={cn(
                      "w-full bg-white border border-sand-200 rounded-xl px-4 py-3",
                      "font-body text-base text-ink",
                      "focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-transparent",
                      "transition",
                    )}
                  >
                    {availableHijriYears.map((y) => (
                      <option key={y} value={y}>
                        {y} AH
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <p className="font-body text-amber-800 text-sm">
                Er zijn nog geen gebedstijden beschikbaar om weer te geven.
              </p>
            </div>
          )}

          {hijriHeaderInfo && (
            <div className="rounded-2xl bg-slate-mosque/5 border border-slate-mosque/15 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="font-display text-xl text-slate-mosque flex items-baseline gap-3">
                  <span>{hijriHeaderInfo.monthLabel} {hijriHeaderInfo.year}</span>
                  {hijriHeaderInfo.arabicLabel && (
                    <span className="font-arabic text-lg text-slate-mosque/80" lang="ar" dir="rtl">
                      {hijriHeaderInfo.arabicLabel}
                    </span>
                  )}
                </div>
                <div className="font-body text-xs text-taupe-dark/80 mt-1">
                  {hijriHeaderInfo.days} dagen · {hijriHeaderInfo.range}
                </div>
              </div>
            </div>
          )}

          {hijriMonthRows.length > 0 ? (
            <HijriPrayerTimesTable
              hijriRows={hijriMonthRows}
              csvRows={rows}
              todayDatum={todayDatum}
              highlightsByIso={highlightsByIso}
            />
          ) : (
            availableHijriMonths.length > 0 && (
              <div className="bg-white border border-sand-200 rounded-2xl p-8 text-center">
                <p className="font-body text-taupe-dark">
                  Geen gegevens beschikbaar voor deze Hijri-maand.
                </p>
              </div>
            )
          )}

          {hijriMonthRows.some((r) => r.hijri.isOverride) && (
            <p className="font-body text-xs text-taupe-dark/70 text-center">
              * = handmatige Hijri-correctie via beheer (zie CMS).
            </p>
          )}
        </>
      )}

      {/* ─── GREGORIAN MODE ─────────────────────────────────── */}
      {calendarMode === "gregorian" && (
        <>
          {availableGregorianYears.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label
                  htmlFor="greg-month-select"
                  className="block font-body text-xs uppercase tracking-widest text-taupe-dark mb-1.5 font-semibold"
                >
                  Maand
                </label>
                <select
                  id="greg-month-select"
                  value={selectedGregMonth}
                  onChange={(e) => setSelectedGregMonth(Number(e.target.value))}
                  className={cn(
                    "w-full bg-white border border-sand-200 rounded-xl px-4 py-3",
                    "font-body text-base text-ink capitalize",
                    "focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-transparent",
                    "transition",
                  )}
                >
                  {monthsForSelectedGregYear.map((m) => (
                    <option key={m} value={m}>
                      {NL_MONTH_NAMES[m - 1] || `Maand ${m}`}
                    </option>
                  ))}
                </select>
              </div>

              {availableGregorianYears.length > 1 && (
                <div className="flex-1">
                  <label
                    htmlFor="greg-year-select"
                    className="block font-body text-xs uppercase tracking-widest text-taupe-dark mb-1.5 font-semibold"
                  >
                    Jaar
                  </label>
                  <select
                    id="greg-year-select"
                    value={selectedGregYear}
                    onChange={(e) => setSelectedGregYear(Number(e.target.value))}
                    className={cn(
                      "w-full bg-white border border-sand-200 rounded-xl px-4 py-3",
                      "font-body text-base text-ink",
                      "focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-transparent",
                      "transition",
                    )}
                  >
                    {availableGregorianYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <p className="font-body text-amber-800 text-sm">
                Er zijn nog geen gebedstijden beschikbaar om weer te geven.
              </p>
            </div>
          )}

          {gregorianMonthRows.length > 0 ? (
            <PrayerTimesTable
              rows={gregorianMonthRows}
              todayDatum={todayDatum}
              shortDateOnly
              showDayColumn
              hijriByDatum={hijriByDatum}
              highlightsByIso={highlightsByIso}
            />
          ) : (
            availableGregorianYears.length > 0 && (
              <div className="bg-white border border-sand-200 rounded-2xl p-8 text-center">
                <p className="font-body text-taupe-dark">
                  Geen gegevens beschikbaar voor deze maand.
                </p>
              </div>
            )
          )}
        </>
      )}

      {/* Mobile hint — geldt voor beide modi */}
      <p className="font-body text-xs text-taupe text-center sm:hidden">
        Veeg horizontaal om alle kolommen te zien.
      </p>
    </div>
  );
}
