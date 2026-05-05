// lib/prayerTimes.ts
// Verwerking van gebedstijden-CSV

import Papa from "papaparse";
import type { PrayerTimeRow } from "@/types/directus";

// Mogelijk gebruikte kolomnamen in CSV (hoofdletterongevoelig)
const COLUMN_ALIASES: Partial<Record<keyof PrayerTimeRow, string[]>> = {
  datum: ["datum", "date", "dag", "day"],
  dag: ["dag", "day", "weekdag", "weekday"],
  fajr: ["fajr", "fadjr", "subh", "ochtend"],
  shuruq: ["shuruq", "zonsopgang", "sunrise", "shoeroek"],
  dhuhr: ["dhuhr", "dhohr", "middag", "noon"],
  asr: ["asr", "middaggebed", "afternoon"],
  maghrib: ["maghrib", "zonsondergang", "sunset", "avond"],
  isha: ["isha", "isha'a", "nacht", "night"],
};

function findColumn(headers: string[], aliases: string[]): string | undefined {
  const normalized = headers.map((h) => h.toLowerCase().trim());

  for (const alias of aliases) {
    const idx = normalized.indexOf(alias.toLowerCase());
    if (idx !== -1) return headers[idx];
  }

  return undefined;
}

export function parsePrayerTimesCSV(csvText: string): PrayerTimeRow[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  if (result.errors.length > 0) {
    console.warn("CSV parse waarschuwingen:", result.errors);
  }

  const headers = result.meta.fields || [];

  const colMap = {} as Record<keyof PrayerTimeRow, string | undefined>;

  for (const key of Object.keys(COLUMN_ALIASES) as Array<keyof PrayerTimeRow>) {
    colMap[key] = findColumn(headers, COLUMN_ALIASES[key] ?? []);
  }

  return result.data
    .filter((row) => {
      const datum = colMap.datum ? row[colMap.datum] : undefined;
      return Boolean(datum && datum.length > 0);
    })
    .map((row) => ({
      datum: colMap.datum ? row[colMap.datum] ?? "" : "",
      dag: colMap.dag ? row[colMap.dag] ?? "" : undefined,
      fajr: colMap.fajr ? row[colMap.fajr] ?? "" : "",
      shuruq: colMap.shuruq ? row[colMap.shuruq] ?? "" : "",
      dhuhr: colMap.dhuhr ? row[colMap.dhuhr] ?? "" : "",
      asr: colMap.asr ? row[colMap.asr] ?? "" : "",
      maghrib: colMap.maghrib ? row[colMap.maghrib] ?? "" : "",
      isha: colMap.isha ? row[colMap.isha] ?? "" : "",
    }));
}

// Haal vandaag's gebedstijden op
export function getTodaysPrayerTimes(
  rows: PrayerTimeRow[]
): PrayerTimeRow | null {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  return (
    rows.find((row) => {
const d = row.datum ?? "";

      return (
        d.startsWith(`${dd}-${mm}`) ||
        d.startsWith(`${dd}/${mm}`) ||
        d.startsWith(`${yyyy}-${mm}-${dd}`)
      );
    }) || null
  );
}

// Haal de tijden van de huidige maand op
export function getCurrentMonthRows(rows: PrayerTimeRow[]): PrayerTimeRow[] {
  const mm = String(new Date().getMonth() + 1).padStart(2, "0");

  return rows.filter((row) => {
const d = row.datum ?? "";
    return (
      d.includes(`-${mm}-`) ||
      d.includes(`/${mm}/`) ||
      d.startsWith(`${mm}-`) ||
      d.startsWith(`${mm}/`) ||
      d.match(new RegExp(`^\\d{2}-${mm}`)) ||
      d.match(new RegExp(`^\\d{2}/${mm}`))
    );
  });
}