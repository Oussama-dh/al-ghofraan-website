// lib/prayerTimes.ts
// Verwerking van gebedstijden-CSV.
//
// Verwacht CSV-format:
//   datum,Fajr,Shoeroeq,Dhoehr,Asr,Maghrib,Ishaa
//   2026-01-01,07:06,08:51,12:47,14:26,16:42,18:27
//
// Datum is bij voorkeur ISO (YYYY-MM-DD), maar de parser herkent ook
// dd-mm-jjjj en dd/mm/jjjj voor backwards compat met oudere CSV's.
//
// Headers worden hoofdletter-ongevoelig gematcht en de oude spelling
// (shuruq/dhuhr/isha) wordt nog steeds geaccepteerd als alias zodat
// bestaande Directus-uploads blijven werken tijdens de overgang.

import Papa from "papaparse";
import type { PrayerTimeRow } from "@/types/directus";

// Aliases per veld — eerste match wint. Hoofdletter-ongevoelig.
const COLUMN_ALIASES: Partial<Record<keyof PrayerTimeRow, string[]>> = {
  datum:    ["datum", "date", "day"],
  dag:      ["dag", "weekdag", "weekday"],
  fajr:     ["fajr", "fadjr", "subh", "ochtend"],
  shoeroeq: ["shoeroeq", "shoeroek", "shuruq", "zonsopgang", "sunrise"],
  dhoehr:   ["dhoehr", "dhuhr", "dhohr", "middag", "noon"],
  asr:      ["asr", "middaggebed", "afternoon"],
  maghrib:  ["maghrib", "zonsondergang", "sunset", "avond"],
  ishaa:    ["ishaa", "isha", "isha'a", "nacht", "night"],
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
    header:          true,
    skipEmptyLines:  true,
    transformHeader: (h) => h.trim(),
    transform:       (v) => v.trim(),
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
      datum:    colMap.datum    ? row[colMap.datum]    ?? "" : "",
      dag:      colMap.dag      ? row[colMap.dag]      : undefined,
      fajr:     colMap.fajr     ? row[colMap.fajr]     ?? "" : "",
      shoeroeq: colMap.shoeroeq ? row[colMap.shoeroeq] ?? "" : "",
      dhoehr:   colMap.dhoehr   ? row[colMap.dhoehr]   ?? "" : "",
      asr:      colMap.asr      ? row[colMap.asr]      ?? "" : "",
      maghrib:  colMap.maghrib  ? row[colMap.maghrib]  ?? "" : "",
      ishaa:    colMap.ishaa    ? row[colMap.ishaa]    ?? "" : "",
    }));
}

// ─────────────────────────────────────────────────────────────
// Datum-helpers
// ─────────────────────────────────────────────────────────────
//
// Een rij-datum kan in 3 formaten staan:
//   - ISO        : 2026-01-15
//   - dd-mm-jjjj : 15-01-2026
//   - dd/mm/jjjj : 15/01/2026
//
// We bepalen jaar+maand+dag uit elk van deze.

interface ParsedDate {
  year:  number;
  month: number; // 1-12
  day:   number; // 1-31
}

export interface AmsterdamDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function getAmsterdamDateParts(now: Date = new Date()): AmsterdamDateParts {
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
  };
}

export function getTodayIsoInAmsterdam(now: Date = new Date()): string {
  const p = getAmsterdamDateParts(now);
  const mm = String(p.month).padStart(2, "0");
  const dd = String(p.day).padStart(2, "0");
  return `${p.year}-${mm}-${dd}`;
}

export function getAmsterdamMinutes(now: Date = new Date()): number {
  const p = getAmsterdamDateParts(now);
  return p.hour * 60 + p.minute;
}

export function parseRowDate(d: string): ParsedDate | null {
  if (!d) return null;

  // ISO: YYYY-MM-DD
  let m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };

  // dd-mm-yyyy
  m = d.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return { year: +m[3], month: +m[2], day: +m[1] };

  // dd/mm/yyyy
  m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return { year: +m[3], month: +m[2], day: +m[1] };

  return null;
}

// Haal de tijden van vandaag op
export function getTodaysPrayerTimes(
  rows: PrayerTimeRow[],
  now: Date = new Date()
): PrayerTimeRow | null {
  const todayIso = getTodayIsoInAmsterdam(now);

  return (
    rows.find((row) => {
      const parsed = parseRowDate(row.datum);
      if (!parsed) return false;

      const mm = String(parsed.month).padStart(2, "0");
      const dd = String(parsed.day).padStart(2, "0");
      const rowIso = `${parsed.year}-${mm}-${dd}`;

      return rowIso === todayIso;
    }) || null
  );
}

// Haal de tijden van een specifieke maand op (default: huidige maand/jaar)
export function getMonthRows(
  rows: PrayerTimeRow[],
  year?: number,
  month?: number
): PrayerTimeRow[] {
  const now    = new Date();
  const targetY = year  ?? now.getFullYear();
  const targetM = month ?? now.getMonth() + 1;

  return rows
    .filter((row) => {
      const p = parseRowDate(row.datum);
      return p && p.year === targetY && p.month === targetM;
    })
    .sort((a, b) => {
      const pa = parseRowDate(a.datum);
      const pb = parseRowDate(b.datum);
      if (!pa || !pb) return 0;
      return pa.day - pb.day;
    });
}

// Backwards-compatible alias — bestaande pagina's gebruiken deze nog
export function getCurrentMonthRows(rows: PrayerTimeRow[]): PrayerTimeRow[] {
  return getMonthRows(rows);
}

// Haal alle unieke jaren uit de rijen (voor jaarselectie in overzicht)
export function getAvailableYears(rows: PrayerTimeRow[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    const p = parseRowDate(row.datum);
    if (p) years.add(p.year);
  }
  return Array.from(years).sort((a, b) => a - b);
}

// Format een rij-datum als leesbare string (bv. "1 januari")
export function formatRowDate(row: PrayerTimeRow): string {
  const p = parseRowDate(row.datum);
  if (!p) return row.datum;
  const date = new Date(p.year, p.month - 1, p.day);
  return date.toLocaleDateString("nl-NL", {
    day:   "numeric",
    month: "long",
  });
}

// Format een rij-datum als korte string (bv. "01-01")
export function formatRowDateShort(row: PrayerTimeRow): string {
  const p = parseRowDate(row.datum);
  if (!p) return row.datum;
  const dd = String(p.day).padStart(2, "0");
  const mm = String(p.month).padStart(2, "0");
  return `${dd}-${mm}`;
}

// ─────────────────────────────────────────────────────────────
// Eerstvolgende gebed
// ─────────────────────────────────────────────────────────────

/** De zes gebeden in chronologische volgorde van de dag */
const PRAYER_KEYS_IN_ORDER = [
  "fajr",
  "shoeroeq",
  "dhoehr",
  "asr",
  "maghrib",
  "ishaa",
] as const satisfies ReadonlyArray<keyof PrayerTimeRow>;

export type PrayerKey = (typeof PRAYER_KEYS_IN_ORDER)[number];

/** "07:30" → 450 (minuten sinds middernacht). null bij ongeldig formaat. */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = +m[1];
  const min = +m[2];
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Geef de key van het eerstvolgende gebed op basis van huidige tijd.
 * - Als alle gebeden van vandaag al gepasseerd zijn → null
 *   (de aanroeper kan dan kiezen om Fajr van morgen te markeren of niets)
 * - Bij ongeldige tijd-strings in de rij wordt dat gebed overgeslagen
 */
export function getNextPrayerKey(
  row: PrayerTimeRow | null | undefined,
  now: Date = new Date()
): PrayerKey | null {
  if (!row) return null;

const nowMinutes = getAmsterdamMinutes(now);


  for (const key of PRAYER_KEYS_IN_ORDER) {
    const prayerMinutes = timeToMinutes(row[key] as string);
    if (prayerMinutes === null) continue;
    if (prayerMinutes > nowMinutes) return key;
  }

  return null; // Alle gebeden van vandaag zijn voorbij
}

// ─────────────────────────────────────────────────────────────
// Dagnaam (Nederlandse, lowercase)
// ─────────────────────────────────────────────────────────────

const NL_WEEKDAYS = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
] as const;

/** Bereken Nederlandse dagnaam uit een ISO-datum (YYYY-MM-DD of dd-mm-yyyy). */
export function getDayName(datum: string): string {
  const p = parseRowDate(datum);
  if (!p) return "";
  const date = new Date(p.year, p.month - 1, p.day);
  return NL_WEEKDAYS[date.getDay()];
}

// ─────────────────────────────────────────────────────────────
// Header-titel formatter
// ─────────────────────────────────────────────────────────────

/**
 * Formatteer de subtitel voor de gebedstijden-header.
 * Voorkomt dubbele jaartallen zoals "Gebedstijden 2026 — 2026".
 *
 * Voorbeelden:
 *   formatPrayerFileTitle("Gebedstijden 2026", 2026) → "Gebedstijden 2026"
 *   formatPrayerFileTitle("Gebedstijden", 2026)      → "Gebedstijden — 2026"
 *   formatPrayerFileTitle("", 2026)                  → "Gebedstijden 2026"
 *   formatPrayerFileTitle("Gebedstijden 2026", null) → "Gebedstijden 2026"
 *   formatPrayerFileTitle(null, null)                → "Gebedstijden"
 */
export function formatPrayerFileTitle(
  title?: string | null,
  year?: number | null
): string {
  const cleanTitle = (title || "").trim();
  const yearStr    = year ? String(year) : "";

  // Geen title én geen jaar → generieke fallback
  if (!cleanTitle && !yearStr) return "Gebedstijden";

  // Geen title maar wel jaar → "Gebedstijden {jaar}"
  if (!cleanTitle && yearStr) return `Gebedstijden ${yearStr}`;

  // Wel title maar geen jaar → title als-is
  if (cleanTitle && !yearStr) return cleanTitle;

  // Beide aanwezig: voeg jaar alleen toe als 'ie nog niet in title staat
  if (cleanTitle.includes(yearStr)) return cleanTitle;
  return `${cleanTitle} — ${yearStr}`;
}
