// components/ui/PrayerTimesOverview.tsx
"use client";

import { useMemo, useState } from "react";
import PrayerTimesTable      from "@/components/ui/PrayerTimesTable";
import { parseRowDate, getMonthRows } from "@/lib/prayerTimes";
import type { PrayerTimeRow } from "@/types/directus";
import { cn }                from "@/lib/utils";

interface PrayerTimesOverviewProps {
  rows: PrayerTimeRow[];
}

const MAANDEN = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

export default function PrayerTimesOverview({ rows }: PrayerTimesOverviewProps) {
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

      {/* Tabel met aparte Dag-kolom */}
      {filteredRows.length > 0 ? (
        <PrayerTimesTable
          rows={filteredRows}
          todayDatum={todayDatum}
          shortDateOnly
          showDayColumn
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
