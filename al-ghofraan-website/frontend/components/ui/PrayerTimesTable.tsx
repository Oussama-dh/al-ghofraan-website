// components/ui/PrayerTimesTable.tsx

import { Sunrise, Sun, CloudSun, Sunset, Moon, MoonStar } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrayerTimeRow, PrayerCalendarHighlight } from "@/types/directus";
import { getDayName, formatRowDateShort, formatRowDateLong, parseRowDate } from "@/lib/prayerTimes";
import type { PrayerKey } from "@/lib/prayerTimes";
import { getHighlightStyles, getHighlightIcon } from "@/lib/highlights";

interface PrayerTimesTableProps {
  rows:           PrayerTimeRow[];
  todayDatum?:    string;
  className?:     string;
  /** Korte datum-notatie zonder jaar (bv. "1 mei") voor maandweergave.
   *  Lang formaat (bv. "1 mei 2026") als deze prop niet gezet is. */
  shortDateOnly?: boolean;
  /** Toon een aparte Dag-kolom met Nederlandse weekdag (lowercase) */
  showDayColumn?: boolean;
  /**
   * Mapping van CSV-datum (`row.datum`) naar geformatteerde Hijri-string
   * (bv. "21 Dhoel-Qi'dah 1447"). Als aanwezig en niet-leeg → er verschijnt
   * rechts een Hijri-kolom. Rijen zonder mapping krijgen "—".
   */
  hijriByDatum?:  Record<string, string>;
  /**
   * Delivery 21 — Kalender-highlights gemapt op ISO-datum (YYYY-MM-DD).
   * Wanneer een rij matched: linker-rand-accent + inline badges in de
   * datum-cel. Builder: `buildHighlightMap()` uit `lib/highlights.ts`.
   */
  highlightsByIso?: Map<string, PrayerCalendarHighlight[]>;
}

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

interface TodayCardProps {
  row:           PrayerTimeRow;
  /** Key van het eerstvolgende gebed — wordt blauw uitgelicht. null = geen highlight. */
  nextPrayerKey?: PrayerKey | null;
}

export function TodayPrayerCard({ row, nextPrayerKey }: TodayCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {GEBEDEN.map((gebed) => {
        // Highlight ALLEEN het eerstvolgende gebed — geen hardcoded fajr/ishaa.
        const isNext = nextPrayerKey === gebed.key;
        return (
          <div
            key={gebed.key}
            className={cn(
              "rounded-2xl p-4 text-center transition-colors",
              isNext
                ? "bg-slate-mosque text-white ring-2 ring-slate-mosque/30 ring-offset-2 ring-offset-sand-50"
                : "bg-white border border-sand-200"
            )}
          >
            <div className={cn("flex justify-center mb-1", isNext ? "text-sand/80" : "text-taupe")}>
              <gebed.Icon className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div
              className={cn(
                "font-arabic text-sm",
                isNext ? "text-sand/80" : "text-taupe"
              )}
              lang="ar"
            >
              {gebed.arabic}
            </div>
            <div
              className={cn(
                "font-body text-xs uppercase tracking-widest mb-1",
                isNext ? "text-sand/70" : "text-taupe-dark"
              )}
            >
              {gebed.label}
            </div>
            <div
              className={cn(
                "font-body font-semibold text-xl",
                isNext ? "text-white" : "text-ink"
              )}
            >
              {row[gebed.key as keyof PrayerTimeRow] || "—"}
            </div>
            {isNext && (
              <div className="font-body text-[10px] uppercase tracking-widest text-sand/70 mt-1">
                Volgende
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Format de datum-kolom met Nederlandse maandnaam (delivery 17):
 *   - shortDateOnly=true  → "1 mei"
 *   - shortDateOnly=false → "1 mei 2026"
 *
 *  Bij parsing-fout valt de cel terug op de raw CSV-string zodat de
 *  tabel nooit een lege cel toont. */
function formatDateCell(row: PrayerTimeRow, shortDateOnly: boolean): string {
  return shortDateOnly ? formatRowDateShort(row) : formatRowDateLong(row);
}

export default function PrayerTimesTable({
  rows,
  todayDatum,
  className,
  shortDateOnly = false,
  showDayColumn = false,
  hijriByDatum,
  highlightsByIso,
}: PrayerTimesTableProps) {
  const showHijriColumn = !!hijriByDatum && Object.keys(hijriByDatum).length > 0;
  const hasHighlights   = !!highlightsByIso && highlightsByIso.size > 0;
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-sm", className)}>
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="bg-slate-mosque text-white">
            {showDayColumn && (
              <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Dag</th>
            )}
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Datum</th>
            {GEBEDEN.map((g) => (
              <th key={g.key} className="px-3 py-3 text-center font-medium whitespace-nowrap">
                <div>{g.label}</div>
                <div className="font-arabic text-xs opacity-70 font-normal" lang="ar">
                  {g.arabic}
                </div>
              </th>
            ))}
            {showHijriColumn && (
              <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Hijri</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isToday = todayDatum && row.datum === todayDatum;
            const dayName = showDayColumn ? getDayName(row.datum) : "";
            const hijri   = showHijriColumn ? (hijriByDatum![row.datum] ?? "") : "";

            // Delivery 21 — Match highlight op ISO-datum afgeleid van row.datum.
            // parseRowDate accepteert ISO + DD-MM-YYYY + DD/MM/YYYY; we
            // normaliseren naar ISO voor de map-lookup.
            let highlights: PrayerCalendarHighlight[] | undefined;
            if (hasHighlights) {
              const p = parseRowDate(row.datum);
              if (p) {
                const iso = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
                highlights = highlightsByIso!.get(iso);
              }
            }
            const hasRowHighlight = highlights && highlights.length > 0;

            return (
              <tr
                key={`${row.datum}-${idx}`}
                className={cn(
                  "border-t border-sand-200 transition-colors",
                  isToday ? "bg-slate-mosque/10 font-semibold"
                          : idx % 2 === 0 ? "bg-white" : "bg-sand-50/50",
                  "hover:bg-sand-100",
                  // Highlight-rij accent — linker-rand. Werkt in beide modi
                  // via slate-mosque CSS-variabele.
                  hasRowHighlight && "border-l-4 border-l-slate-mosque/40",
                )}
              >
                {showDayColumn && (
                  <td className="px-4 py-2.5 whitespace-nowrap text-taupe-dark capitalize">
                    {dayName}
                  </td>
                )}
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {formatDateCell(row, shortDateOnly)}
                  {isToday && (
                    <span className="inline-block bg-slate-mosque text-white text-xs px-2 py-0.5 rounded-full ml-2">
                      Vandaag
                    </span>
                  )}
                  {hasRowHighlight && (
                    <span className="inline-flex flex-wrap gap-1 ml-2 align-middle">
                      {highlights!.map((h) => {
                        const styles = getHighlightStyles(h);
                        const Icon   = getHighlightIcon(h);
                        return (
                          <span
                            key={h.id}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              styles.badgeClass,
                            )}
                            style={styles.badgeStyle}
                            title={h.description ? `${h.title} — ${h.description}` : h.title}
                          >
                            <Icon className="w-3 h-3" strokeWidth={2} />
                            {h.title}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </td>
                {GEBEDEN.map((g) => (
                  <td key={g.key} className="px-3 py-2.5 text-center tabular-nums">
                    {row[g.key as keyof PrayerTimeRow] || "—"}
                  </td>
                ))}
                {showHijriColumn && (
                  <td className="px-4 py-2.5 whitespace-nowrap text-right text-taupe-dark text-xs sm:text-sm">
                    {hijri || "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
