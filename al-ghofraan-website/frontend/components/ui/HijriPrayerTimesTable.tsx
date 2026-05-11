// components/ui/HijriPrayerTimesTable.tsx
//
// Tabel die rij-voor-rij **per Hijri-dag** rendert, in de gekozen Hijri-maand.
// Elke rij bevat:
//   - Hijri dag
//   - Gregoriaanse datum (klein eronder)
//   - Nederlandse weekdag
//   - 6 gebedstijden
//
// Wordt gebruikt door /gebedstijden/overzicht zodra de Hijri-modus actief is.
// De bestaande `PrayerTimesTable` blijft de Gregorian-modus afhandelen
// (vandaag-card + maandweergave op /gebedstijden).

import { Sunrise, Sun, CloudSun, Sunset, Moon, MoonStar } from "lucide-react";
import type { LucideIcon }    from "lucide-react";
import { cn }                  from "@/lib/utils";
import type { PrayerTimeRow }  from "@/types/directus";
import type { PrayerKey }      from "@/lib/prayerTimes";
import type { HijriMonthRow }  from "@/lib/hijri";

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

interface HijriPrayerTimesTableProps {
  /** Hijri-maand-rijen (uit `listGregorianDatesInHijriMonth`). */
  hijriRows: HijriMonthRow[];
  /**
   * Kaart van CSV-`row.datum` (de string zoals in CSV staat) naar de
   * volledige PrayerTimeRow. We koppelen de Hijri-rijen aan deze CSV-rijen
   * via gregoriaanse datum-vergelijking.
   */
  csvRows: PrayerTimeRow[];
  /** "Datum"-string van vandaag (CSV-rij) — voor highlight. */
  todayDatum?: string;
  className?:  string;
}

/**
 * Vergelijk gregoriaanse datum (UTC anker) met de "datum"-string uit een
 * CSV-rij. We accepteren YYYY-MM-DD, DD-MM-YYYY en DD/MM/YYYY.
 */
function csvRowMatchesGregorian(csvDatum: string, gregorian: Date): boolean {
  const y = gregorian.getUTCFullYear();
  const m = gregorian.getUTCMonth() + 1;
  const d = gregorian.getUTCDate();

  // ISO YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(csvDatum);
  if (iso) {
    return parseInt(iso[1], 10) === y &&
           parseInt(iso[2], 10) === m &&
           parseInt(iso[3], 10) === d;
  }
  // DD-MM-YYYY of DD/MM/YYYY
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(csvDatum);
  if (dmy) {
    return parseInt(dmy[1], 10) === d &&
           parseInt(dmy[2], 10) === m &&
           parseInt(dmy[3], 10) === y;
  }
  return false;
}

export default function HijriPrayerTimesTable({
  hijriRows,
  csvRows,
  todayDatum,
  className,
}: HijriPrayerTimesTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-sm", className)}>
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="bg-slate-mosque text-white">
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Hidjri</th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Gregor.</th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Dag</th>
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
          {hijriRows.map(({ hijri, gregorian }, idx) => {
            // Match CSV-rij op gregoriaanse datum.
            const csvRow = csvRows.find((r) => csvRowMatchesGregorian(r.datum, gregorian));

            // Highlight de "vandaag"-rij: zelfde CSV-datum als todayDatum.
            const isToday = !!csvRow && !!todayDatum && csvRow.datum === todayDatum;

            // Format gregoriaanse datum als dd-mm
            const dd = String(gregorian.getUTCDate()).padStart(2, "0");
            const mm = String(gregorian.getUTCMonth() + 1).padStart(2, "0");
            const gregLabel = `${dd}-${mm}`;

            // Weekdag (NL, lowercase). gregorian is UTC midnight — `getUTCDay`
            // geeft een consistente dag onafhankelijk van browser-tz.
            const weekday = NL_WEEKDAYS[gregorian.getUTCDay()];

            // Hijri dag — toon óók kort de maand-afkorting voor leesbaarheid
            // wanneer de tabel los wordt gekopieerd. Hier 2 cijfers + de
            // monthName komt al in de strip bovenaan, dus alleen het dagnummer.
            return (
              <tr
                key={`${hijri.year}-${hijri.month}-${hijri.day}`}
                className={cn(
                  "border-t border-sand-200 transition-colors",
                  isToday
                    ? "bg-slate-mosque/10 font-semibold"
                    : idx % 2 === 0
                      ? "bg-white"
                      : "bg-sand-50/50",
                  "hover:bg-sand-100",
                )}
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="font-display text-base text-slate-mosque">
                    {hijri.day}
                  </span>
                  {hijri.isOverride && (
                    <span
                      title="Handmatige override"
                      className="ml-1.5 inline-block text-amber-600 text-[10px] uppercase tracking-wider"
                    >
                      *
                    </span>
                  )}
                  {isToday && (
                    <span className="inline-block bg-slate-mosque text-white text-xs px-2 py-0.5 rounded-full ml-2">
                      Vandaag
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-taupe-dark tabular-nums">
                  {gregLabel}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-taupe-dark capitalize">
                  {weekday}
                </td>
                {GEBEDEN.map((g) => (
                  <td key={g.key} className="px-3 py-2.5 text-center tabular-nums">
                    {csvRow ? (csvRow[g.key as keyof PrayerTimeRow] || "—") : "—"}
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
