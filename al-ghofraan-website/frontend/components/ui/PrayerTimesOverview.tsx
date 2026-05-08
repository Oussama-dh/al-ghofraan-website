// components/ui/PrayerTimesOverview.tsx
"use client";

import { useMemo, useState } from "react";
import PrayerTimesTable      from "@/components/ui/PrayerTimesTable";
import { parseRowDate, getMonthRows } from "@/lib/prayerTimes";
import {
  buildHijriOverrideMap,
  getHijriDate,
  formatHijriShortNl,
  parseGregorianDate,
} from "@/lib/hijri";
import type { PrayerTimeRow, HijriDateOverride } from "@/types/directus";
import { cn }                from "@/lib/utils";

interface PrayerTimesOverviewProps {
  rows: PrayerTimeRow[];
  /**
   * Optionele Hijri-overrides uit Directus. Wordt naar een Map omgezet en
   * gebruikt om per gregoriaanse datum de Hijri-equivalent te bepalen.
   * Zonder overrides valt alles terug op Umm al-Qura via Intl.
   */
  hijriOverrides?: HijriDateOverride[];
}

const MAANDEN = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

export default function PrayerTimesOverview({ rows, hijriOverrides }: PrayerTimesOverviewProps) {
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const row of rows) {
      const p = parseRowDate(row.datum);
      if (p) set.add(p.year);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [rows]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const defaultYear =
    availableYears.includes(currentYear)
      ? currentYear
      : availableYears[0] ?? currentYear;

  const [selectedYear,  setSelectedYear]  = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  const filteredRows = useMemo(
    () => getMonthRows(rows, selectedYear, selectedMonth),
    [rows, selectedYear, selectedMonth]
  );

  // Hijri-mapping per CSV-rij. Bij een lege overrides-prop is `overrideMap` leeg
  // en valt alles terug op Intl.
  const overrideMap = useMemo(
    () => buildHijriOverrideMap(hijriOverrides ?? []),
    [hijriOverrides],
  );

  const hijriByDatum = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of filteredRows) {
      // `row.datum` kan diverse formaten hebben — we gebruiken parseGregorianDate
      // en daarna parseRowDate als laatste poging zodat we altijd consistent zijn.
      const date =
        parseGregorianDate(row.datum) ||
        (() => {
          const p = parseRowDate(row.datum);
          return p ? new Date(Date.UTC(p.year, p.month - 1, p.day)) : null;
        })();
      if (!date) continue;
      const hijri = getHijriDate(date, overrideMap);
      if (hijri) {
        map[row.datum] = formatHijriShortNl(hijri);
      }
    }
    return map;
  }, [filteredRows, overrideMap]);

  // Hijri-strip: eerste en laatste Hijri-datum van de zichtbare maand.
  // "Maand X loopt grofweg van Y tot Z" — Hijri leidend.
  const hijriRangeLabel = useMemo(() => {
    if (filteredRows.length === 0) return null;
    const firstKey = filteredRows[0].datum;
    const lastKey  = filteredRows[filteredRows.length - 1].datum;
    const first    = hijriByDatum[firstKey];
    const last     = hijriByDatum[lastKey];
    if (!first || !last) return null;
    if (first === last) return first;
    return `${first} — ${last}`;
  }, [filteredRows, hijriByDatum]);

  const todayDatum = useMemo(() => {
    if (selectedYear !== now.getFullYear() || selectedMonth !== now.getMonth() + 1) {
      return undefined;
    }
    const todayY = now.getFullYear();
    const todayM = now.getMonth() + 1;
    const todayD = now.getDate();
    const match = rows.find((row) => {
      const p = parseRowDate(row.datum);
      return p && p.year === todayY && p.month === todayM && p.day === todayD;
    });
    return match?.datum;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, selectedYear, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="month-select" className="block font-body text-xs uppercase tracking-widest text-taupe-dark mb-1.5 font-semibold">
            Maand
          </label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className={cn(
              "w-full bg-white border border-sand-200 rounded-xl px-4 py-3",
              "font-body text-base text-ink",
              "focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-transparent",
              "transition"
            )}
          >
            {MAANDEN.map((label, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {availableYears.length > 1 && (
          <div className="flex-1">
            <label htmlFor="year-select" className="block font-body text-xs uppercase tracking-widest text-taupe-dark mb-1.5 font-semibold">
              Jaar
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={cn(
                "w-full bg-white border border-sand-200 rounded-xl px-4 py-3",
                "font-body text-base text-ink",
                "focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-transparent",
                "transition"
              )}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Hijri-strip — leidend bij maandoverzichten zoals gevraagd */}
      {hijriRangeLabel && (
        <div className="rounded-2xl bg-slate-mosque/5 border border-slate-mosque/15 px-5 py-3 flex items-center justify-between gap-3">
          <span className="font-body text-xs uppercase tracking-widest text-slate-mosque/80 font-semibold">
            Hidjri
          </span>
          <span className="font-display text-base sm:text-lg text-slate-mosque text-right">
            {hijriRangeLabel}
          </span>
        </div>
      )}

      {/* Tabel met aparte Dag-kolom + Hijri-kolom */}
      {filteredRows.length > 0 ? (
        <PrayerTimesTable
          rows={filteredRows}
          todayDatum={todayDatum}
          shortDateOnly
          showDayColumn
          hijriByDatum={hijriByDatum}
        />
      ) : (
        <div className="bg-white border border-sand-200 rounded-2xl p-8 text-center">
          <p className="font-body text-taupe-dark">
            Geen gebedstijden gevonden voor {MAANDEN[selectedMonth - 1]} {selectedYear}.
          </p>
        </div>
      )}

      {/* Mobile hint */}
      <p className="font-body text-xs text-taupe text-center sm:hidden">
        Veeg horizontaal om alle kolommen te zien.
      </p>
    </div>
  );
}
