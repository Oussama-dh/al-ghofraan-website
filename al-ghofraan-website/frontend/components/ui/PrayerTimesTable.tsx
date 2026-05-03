// components/ui/PrayerTimesTable.tsx

import { cn } from "@/lib/utils";
import type { PrayerTimeRow } from "@/types/directus";

interface PrayerTimesTableProps {
  rows:       PrayerTimeRow[];
  todayDatum?: string;
  className?: string;
}

const GEBEDEN = [
  { key: "fajr",    label: "Fajr",    arabic: "الفجر",    icon: "🌙" },
  { key: "shuruq",  label: "Shuruq",  arabic: "الشروق",   icon: "🌅" },
  { key: "dhuhr",   label: "Dhuhr",   arabic: "الظهر",    icon: "☀️" },
  { key: "asr",     label: "Asr",     arabic: "العصر",    icon: "🌤" },
  { key: "maghrib", label: "Maghrib", arabic: "المغرب",   icon: "🌇" },
  { key: "isha",    label: "Isha",    arabic: "العشاء",   icon: "🌃" },
] as const;

type GebedKey = (typeof GEBEDEN)[number]["key"];

interface TodayCardProps {
  row: PrayerTimeRow;
}

export function TodayPrayerCard({ row }: TodayCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {GEBEDEN.map((gebed) => (
        <div
          key={gebed.key}
          className={cn(
            "rounded-2xl p-4 text-center",
            gebed.key === "fajr" || gebed.key === "isha"
              ? "bg-slate-mosque text-white"
              : "bg-white border border-sand-200"
          )}
        >
          <div className="text-2xl mb-1">{gebed.icon}</div>
          <div
            className={cn(
              "font-arabic text-sm",
              gebed.key === "fajr" || gebed.key === "isha"
                ? "text-sand/80"
                : "text-taupe"
            )}
            lang="ar"
          >
            {gebed.arabic}
          </div>
          <div
            className={cn(
              "font-body text-xs uppercase tracking-widest mb-1",
              gebed.key === "fajr" || gebed.key === "isha"
                ? "text-sand/70"
                : "text-taupe-dark"
            )}
          >
            {gebed.label}
          </div>
          <div
            className={cn(
              "font-body font-semibold text-xl",
              gebed.key === "fajr" || gebed.key === "isha"
                ? "text-white"
                : "text-ink"
            )}
          >
            {row[gebed.key as GebedKey] || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PrayerTimesTable({
  rows,
  todayDatum,
  className,
}: PrayerTimesTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-sm", className)}>
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="bg-slate-mosque text-white">
            <th className="px-4 py-3 text-left font-medium">Datum</th>
            {GEBEDEN.map((g) => (
              <th key={g.key} className="px-3 py-3 text-center font-medium whitespace-nowrap">
                <div>{g.label}</div>
                <div className="font-arabic text-xs opacity-70 font-normal" lang="ar">
                  {g.arabic}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isToday = todayDatum && row.datum === todayDatum;
            return (
              <tr
                key={`${row.datum}-${idx}`}
                className={cn(
                  "border-t border-sand-200 transition-colors",
                  isToday
                    ? "bg-slate-mosque/10 font-semibold"
                    : idx % 2 === 0
                    ? "bg-white"
                    : "bg-sand-50/50",
                  "hover:bg-sand-100"
                )}
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {isToday && (
                    <span className="inline-block bg-slate-mosque text-white text-xs px-2 py-0.5 rounded-full mr-2">
                      Vandaag
                    </span>
                  )}
                  {row.dag && (
                    <span className="text-taupe mr-1">{row.dag}</span>
                  )}
                  {row.datum}
                </td>
                {GEBEDEN.map((g) => (
                  <td key={g.key} className="px-3 py-2.5 text-center tabular-nums">
                    {row[g.key as GebedKey] || "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
