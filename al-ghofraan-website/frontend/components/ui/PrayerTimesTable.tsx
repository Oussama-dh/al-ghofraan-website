// components/ui/PrayerTimesTable.tsx

import { Sunrise, Sun, CloudSun, Sunset, Moon, MoonStar } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrayerTimeRow } from "@/types/directus";

interface PrayerTimesTableProps {
  rows:        PrayerTimeRow[];
  todayDatum?: string;
  className?:  string;
}

const GEBEDEN: ReadonlyArray<{
  key:    keyof PrayerTimeRow;
  label:  string;
  arabic: string;
  Icon:   LucideIcon;
}> = [
  { key: "fajr",    label: "Fajr",    arabic: "الفجر",  Icon: MoonStar },
  { key: "shuruq",  label: "Shuruq",  arabic: "الشروق", Icon: Sunrise  },
  { key: "dhuhr",   label: "Dhuhr",   arabic: "الظهر",  Icon: Sun      },
  { key: "asr",     label: "Asr",     arabic: "العصر",  Icon: CloudSun },
  { key: "maghrib", label: "Maghrib", arabic: "المغرب", Icon: Sunset   },
  { key: "isha",    label: "Isha",    arabic: "العشاء", Icon: Moon     },
];

interface TodayCardProps {
  row: PrayerTimeRow;
}

export function TodayPrayerCard({ row }: TodayCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {GEBEDEN.map((gebed) => {
        const dark = gebed.key === "fajr" || gebed.key === "isha";
        return (
          <div
            key={gebed.key}
            className={cn(
              "rounded-2xl p-4 text-center",
              dark ? "bg-slate-mosque text-white" : "bg-white border border-sand-200"
            )}
          >
            <div className={cn("flex justify-center mb-1", dark ? "text-sand/80" : "text-taupe")}>
              <gebed.Icon className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div
              className={cn(
                "font-arabic text-sm",
                dark ? "text-sand/80" : "text-taupe"
              )}
              lang="ar"
            >
              {gebed.arabic}
            </div>
            <div
              className={cn(
                "font-body text-xs uppercase tracking-widest mb-1",
                dark ? "text-sand/70" : "text-taupe-dark"
              )}
            >
              {gebed.label}
            </div>
            <div
              className={cn(
                "font-body font-semibold text-xl",
                dark ? "text-white" : "text-ink"
              )}
            >
              {row[gebed.key as keyof PrayerTimeRow] || "—"}
            </div>
          </div>
        );
      })}
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
                  isToday ? "bg-slate-mosque/10 font-semibold"
                          : idx % 2 === 0 ? "bg-white" : "bg-sand-50/50",
                  "hover:bg-sand-100"
                )}
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {isToday && (
                    <span className="inline-block bg-slate-mosque text-white text-xs px-2 py-0.5 rounded-full mr-2">
                      Vandaag
                    </span>
                  )}
                  {row.dag && <span className="text-taupe mr-1">{row.dag}</span>}
                  {row.datum}
                </td>
                {GEBEDEN.map((g) => (
                  <td key={g.key} className="px-3 py-2.5 text-center tabular-nums">
                    {row[g.key as keyof PrayerTimeRow] || "—"}
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
