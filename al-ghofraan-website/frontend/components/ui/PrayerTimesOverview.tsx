// components/ui/PrayerTimesOverview.tsx
"use client";

import { useMemo, useState } from "react";
import HijriPrayerTimesTable from "@/components/ui/HijriPrayerTimesTable";
import { parseRowDate }     from "@/lib/prayerTimes";
import {
  buildHijriOverrideMap,
  listGregorianDatesInHijriMonth,
  listAvailableHijriMonthsForRange,
  listHijriMonths,
  getHijriDate,
} from "@/lib/hijri";
import type { PrayerTimeRow, HijriDateOverride } from "@/types/directus";
import { cn }               from "@/lib/utils";

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
}

const ALL_HIJRI_MONTHS = listHijriMonths();

export default function PrayerTimesOverview({ rows, hijriOverrides }: PrayerTimesOverviewProps) {
  // ─── 1. Override map (één keer bouwen) ────────────────────
  const overrideMap = useMemo(
    () => buildHijriOverrideMap(hijriOverrides ?? []),
    [hijriOverrides],
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

  // ─── 3. Beschikbare Hijri-maanden (uit CSV-range) ─────────
  const availableHijriMonths = useMemo(() => {
    if (!csvRange) return [];
    return listAvailableHijriMonthsForRange(csvRange.start, csvRange.end, overrideMap);
  }, [csvRange, overrideMap]);

  // ─── 4. Default selectie: huidige Hijri-maand ─────────────
  const defaultSelection = useMemo(() => {
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
        year:  availableHijriMonths[0].year,
        month: availableHijriMonths[0].month,
      };
    }
    return { year: 0, month: 0 };
  }, [availableHijriMonths, overrideMap]);

  const [selectedYear,  setSelectedYear]  = useState<number>(defaultSelection.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultSelection.month);

  // Beschikbare Hijri-jaren (uniek)
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const m of availableHijriMonths) set.add(m.year);
    return Array.from(set).sort((a, b) => a - b);
  }, [availableHijriMonths]);

  // Beschikbare maanden voor het geselecteerde jaar
  const monthsForSelectedYear = useMemo(() => {
    return availableHijriMonths.filter((m) => m.year === selectedYear);
  }, [availableHijriMonths, selectedYear]);

  // Bij verandering van jaar: zorg dat geselecteerde maand bestaat in dat jaar
  if (
    monthsForSelectedYear.length > 0 &&
    !monthsForSelectedYear.some((m) => m.month === selectedMonth)
  ) {
    setTimeout(() => setSelectedMonth(monthsForSelectedYear[0].month), 0);
  }

  // ─── 5. Hijri-maand-rijen voor de tabel ───────────────────
  const hijriMonthRows = useMemo(() => {
    if (selectedYear === 0 || selectedMonth === 0) return [];
    return listGregorianDatesInHijriMonth(selectedYear, selectedMonth, overrideMap);
  }, [selectedYear, selectedMonth, overrideMap]);

  // Vandaag-anker (CSV-datum-string) — voor highlight
  const todayDatum = useMemo(() => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth() + 1;
    const todayD = now.getDate();
    const match = rows.find((row) => {
      const p = parseRowDate(row.datum);
      return p && p.year === todayY && p.month === todayM && p.day === todayD;
    });
    return match?.datum;
  }, [rows]);

  // Header-strip: "Maand jaar — gregoriaanse range"
  const headerInfo = useMemo(() => {
    if (hijriMonthRows.length === 0) return null;
    const monthMeta = ALL_HIJRI_MONTHS.find((m) => m.month === selectedMonth);
    const monthLabel = monthMeta ? monthMeta.nl : `Maand ${selectedMonth}`;
    const arabicLabel = monthMeta ? monthMeta.ar : "";
    const first = hijriMonthRows[0].gregorian;
    const last  = hijriMonthRows[hijriMonthRows.length - 1].gregorian;
    const fmtDate = (d: Date) =>
      `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
    return {
      monthLabel,
      arabicLabel,
      year:  selectedYear,
      range: `${fmtDate(first)} t/m ${fmtDate(last)}`,
      days:  hijriMonthRows.length,
    };
  }, [hijriMonthRows, selectedMonth, selectedYear]);

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Selectors — Hijri-maand + Hijri-jaar */}
      {availableHijriMonths.length > 0 ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label
              htmlFor="hijri-month-select"
              className="block font-body text-xs uppercase tracking-widest text-taupe-dark mb-1.5 font-semibold"
            >
              Islamitische maand
            </label>
            <select
              id="hijri-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className={cn(
                "w-full bg-white border border-sand-200 rounded-xl px-4 py-3",
                "font-body text-base text-ink",
                "focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-transparent",
                "transition",
              )}
            >
              {monthsForSelectedYear.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.nl}
                </option>
              ))}
            </select>
          </div>

          {availableYears.length > 1 && (
            <div className="flex-1">
              <label
                htmlFor="hijri-year-select"
                className="block font-body text-xs uppercase tracking-widest text-taupe-dark mb-1.5 font-semibold"
              >
                Hijri-jaar
              </label>
              <select
                id="hijri-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={cn(
                  "w-full bg-white border border-sand-200 rounded-xl px-4 py-3",
                  "font-body text-base text-ink",
                  "focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-transparent",
                  "transition",
                )}
              >
                {availableYears.map((y) => (
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

      {/* Header-strip: leidende Hijri-maand + Gregoriaanse range */}
      {headerInfo && (
        <div className="rounded-2xl bg-slate-mosque/5 border border-slate-mosque/15 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="font-display text-xl text-slate-mosque flex items-baseline gap-3">
              <span>{headerInfo.monthLabel} {headerInfo.year}</span>
              {headerInfo.arabicLabel && (
                <span className="font-arabic text-lg text-slate-mosque/80" lang="ar" dir="rtl">
                  {headerInfo.arabicLabel}
                </span>
              )}
            </div>
            <div className="font-body text-xs text-taupe-dark/80 mt-1">
              {headerInfo.days} dagen · {headerInfo.range}
            </div>
          </div>
        </div>
      )}

      {/* Tabel */}
      {hijriMonthRows.length > 0 ? (
        <HijriPrayerTimesTable
          hijriRows={hijriMonthRows}
          csvRows={rows}
          todayDatum={todayDatum}
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

      {/* Mobile hint */}
      <p className="font-body text-xs text-taupe text-center sm:hidden">
        Veeg horizontaal om alle kolommen te zien.
      </p>

      {/* Voetnoot bij overrides */}
      {hijriMonthRows.some((r) => r.hijri.isOverride) && (
        <p className="font-body text-xs text-taupe-dark/70 text-center">
          * = handmatige Hijri-correctie via beheer (zie CMS).
        </p>
      )}
    </div>
  );
}
