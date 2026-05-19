// lib/hijri.ts
//
// Hijri-datum berekening via native Intl.DateTimeFormat met
// `islamic-umalqura` calendar. Geen externe dependency.
//
// Beheerder kan handmatige overrides invoeren in Directus
// (`hijri_date_overrides` collectie) — zo kan bv. de start van Ramadan
// lokaal afwijken van de Saoedische berekening.

import type { HijriDateOverride } from "@/types/directus";

// Nederlandse + transliteratie-namen voor Hijri-maanden.
// Directus admin krijgt zo nette weergave; Arabische namen alleen tonen
// op pagina's die expliciet Arabisch ondersteunen.
const HIJRI_MONTHS_NL: Record<number, { nl: string; ar: string }> = {
  1:  { nl: "Moeharram",        ar: "محرم"          },
  2:  { nl: "Safar",            ar: "صفر"           },
  3:  { nl: "Rabi' al-Awwal",   ar: "ربيع الأول"     },
  4:  { nl: "Rabi' ath-Thaani", ar: "ربيع الآخر"     },
  5:  { nl: "Joemaada al-Oela", ar: "جمادى الأولى"   },
  6:  { nl: "Joemaada ath-Thaaniya", ar: "جمادى الآخرة" },
  7:  { nl: "Rajjab",           ar: "رجب"           },
  8:  { nl: "Sha'baan",         ar: "شعبان"         },
  9:  { nl: "Ramadan",          ar: "رمضان"         },
  10: { nl: "Shawwaal",         ar: "شوال"          },
  11: { nl: "Dhoel-Qi'dah",     ar: "ذو القعدة"      },
  12: { nl: "Dhoel-Hijjah",     ar: "ذو الحجة"       },
};

export interface HijriDate {
  day:        number;
  month:      number;            // 1..12
  year:       number;
  monthNameNl: string;
  monthNameAr: string;
  /** True als deze datum uit een handmatige override komt. */
  isOverride: boolean;
}

// ─── Hijri-conversie via native Intl ─────────────────────────
// Geen seizoenscaching nodig — Intl is snel genoeg. We bouwen de output
// uit `formatToParts` zodat we day/month/year apart hebben.
function computeHijriFromIntl(date: Date): { day: number; month: number; year: number } | null {
  try {
    // 'en' locale geeft Engelse maandnamen — we mappen die zelf naar NL.
    // Maar voor day/month/year hebben we het type+value uit formatToParts nodig.
    // 'numberingSystem: latn' zorgt voor Westerse cijfers.
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      day:   "numeric",
      month: "numeric",
      year:  "numeric",
    });
    const parts = fmt.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    const day   = parseInt(map.day,   10);
    const month = parseInt(map.month, 10);
    const year  = parseInt(map.year,  10);
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
      return null;
    }
    return { day, month, year };
  } catch {
    return null;
  }
}

/**
 * Converteer YYYY-MM-DD (gregoriaans) naar een YYYY-MM-DD canonieke
 * vorm voor override-lookup. Accepteert ook al gepersisteerde datum-strings
 * in afwijkende formaten (probeer eerst native Date te parsen).
 */
function toGregorianKey(date: Date): string {
  // Gebruik UTC om onverwachte tijdzone-shifts te voorkomen — onze datum is
  // bedoeld als kalenderdatum (geen tijdcomponent).
  const y  = date.getUTCFullYear();
  const m  = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d  = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Bouw een Map van gregorian_date → override voor snelle lookup.
 * Filtert direct op `active = true`.
 */
export function buildHijriOverrideMap(
  overrides: HijriDateOverride[],
): Map<string, HijriDateOverride> {
  const map = new Map<string, HijriDateOverride>();
  for (const o of overrides) {
    if (!o.active) continue;
    if (!o.gregorian_date) continue;
    // Normaliseer naar YYYY-MM-DD: Directus geeft 'date' soms als full ISO terug
    const key = String(o.gregorian_date).slice(0, 10);
    if (key.length === 10) {
      map.set(key, o);
    }
  }
  return map;
}

/**
 * Geef de Hijri-datum voor een gegeven gregoriaanse datum.
 * Eerst override checken, anders Intl-berekening.
 *
 * @param date         JS Date — alleen jaar/maand/dag wordt gebruikt (UTC).
 * @param overrideMap  Map gebouwd via `buildHijriOverrideMap`.
 *                     Mag undefined zijn (geen overrides).
 */
export function getHijriDate(
  date: Date,
  overrideMap?: Map<string, HijriDateOverride>,
): HijriDate | null {
  // 1. Override?
  if (overrideMap && overrideMap.size > 0) {
    const key = toGregorianKey(date);
    const ov  = overrideMap.get(key);
    if (ov && Number.isFinite(ov.hijri_day) && Number.isFinite(ov.hijri_month) && Number.isFinite(ov.hijri_year)) {
      const m = HIJRI_MONTHS_NL[ov.hijri_month] ?? HIJRI_MONTHS_NL[1];
      return {
        day:        ov.hijri_day,
        month:      ov.hijri_month,
        year:       ov.hijri_year,
        monthNameNl: m.nl,
        monthNameAr: m.ar,
        isOverride: true,
      };
    }
  }

  // 2. Native Intl-berekening
  const computed = computeHijriFromIntl(date);
  if (!computed) return null;

  const m = HIJRI_MONTHS_NL[computed.month] ?? HIJRI_MONTHS_NL[1];
  return {
    day:        computed.day,
    month:      computed.month,
    year:       computed.year,
    monthNameNl: m.nl,
    monthNameAr: m.ar,
    isOverride: false,
  };
}

/**
 * Helper: parse een "datum"-veld zoals het in onze CSV-rijen staat.
 * Onze CSV gebruikt diverse formaten — we gebruiken `parseRowDate` voor
 * de officiële parsing, maar deze helper accepteert alleen YYYY-MM-DD.
 *
 * Returns null als ongeldig.
 */
export function parseGregorianDate(input: string): Date | null {
  // Eerst proberen YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
  }
  // Dan DD-MM-YYYY
  const dmyMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(input);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
  }
  // Tot slot: probeer native parser (laatste redmiddel)
  const t = Date.parse(input);
  if (Number.isFinite(t)) return new Date(t);
  return null;
}

/**
 * Format een HijriDate als korte Nederlandse string: "21 Dhoel-Qi'dah 1447"
 */
export function formatHijriShortNl(h: HijriDate): string {
  return `${h.day} ${h.monthNameNl} ${h.year}`;
}

/**
 * Geef de Nederlandse + Arabische naam van een Hijri-maand op basis van
 * het maand-getal (1..12). Voor selector-dropdowns.
 */
export function getHijriMonthNames(month: number): { nl: string; ar: string } | null {
  const m = HIJRI_MONTHS_NL[month];
  return m ? { ...m } : null;
}

/**
 * Lijst van alle Hijri-maanden 1..12 met namen — handig voor dropdown.
 */
export function listHijriMonths(): Array<{ month: number; nl: string; ar: string }> {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    ...HIJRI_MONTHS_NL[i + 1],
  }));
}

/**
 * Bepaal alle gregoriaanse datums die in een gegeven Hijri-maand vallen.
 *
 * Strategie: er is geen directe Hijri→Gregorian conversie in native Intl,
 * dus we doorlopen een ruime gregoriaanse range (35 dagen rondom de
 * verwachte centrum-datum), berekenen voor elk de Hijri-equivalent, en
 * houden alleen de dagen die matchen op `(hijriYear, hijriMonth)`.
 *
 * Dit is robuust voor:
 *   - 29- vs 30-daagse Hijri-maanden (zit automatisch goed)
 *   - Overrides (worden via `getHijriDate` toegepast — als een override
 *     een dag van maand X naar maand Y schuift, valt die dag in maand Y)
 *
 * Performance: ~35 Intl-aanroepen per uitvoering. Verwaarloosbaar
 * (op een moderne CPU < 1ms).
 *
 * @returns Array van objecten met `gregorian` (Date in UTC) en `hijri`
 *          (HijriDate). Gesorteerd op gregoriaanse datum.
 *
 * Rondom anker-aanpak: Umm al-Qura jaar 1 begint op 16 juli 622 CE
 * (16-jul-622 = 1 Moeharram 1 AH). Hijri-jaar duurt ~354.367 dagen.
 * We schatten het centrum als 622 + (hijriYear-1) * 354.367 + (hijriMonth-1) * 29.5
 * dagen na het anker. Daarna 25 dagen ervoor en 25 erna scannen.
 */
const UMM_AL_QURA_EPOCH_UTC = Date.UTC(622, 6, 16); // 16 juli 622 CE = 1 Moeharram 1 AH (epoch milliseconds)
const DAY_MS                = 86_400_000;
const HIJRI_YEAR_AVG_DAYS   = 354.367;
const HIJRI_MONTH_AVG_DAYS  = 29.530589;

export interface HijriMonthRow {
  gregorian: Date;     // UTC-anker — alleen jaar/maand/dag relevant
  hijri:     HijriDate;
}

export function listGregorianDatesInHijriMonth(
  hijriYear:    number,
  hijriMonth:   number,
  overrideMap?: Map<string, HijriDateOverride>,
): HijriMonthRow[] {
  if (hijriMonth < 1 || hijriMonth > 12) return [];
  if (!Number.isFinite(hijriYear) || hijriYear < 1) return [];

  // Geschatte gregoriaanse centrum-datum voor dag ~15 van de Hijri-maand.
  const estimatedCenterMs =
    UMM_AL_QURA_EPOCH_UTC +
    Math.round(((hijriYear - 1) * HIJRI_YEAR_AVG_DAYS + (hijriMonth - 1) * HIJRI_MONTH_AVG_DAYS + 14) * DAY_MS);

  // Scan een ruime range van 25 dagen ervoor en 25 dagen erna (51 dagen totaal).
  // Een Hijri-maand is 29-30 dagen, dus dit dekt ruim alle randgevallen waar
  // de schatting iets afwijkt (kan tot ~3 dagen drift zijn over millennia).
  const SCAN_RANGE = 25;
  const rows: HijriMonthRow[] = [];

  for (let offset = -SCAN_RANGE; offset <= SCAN_RANGE; offset++) {
    const date  = new Date(estimatedCenterMs + offset * DAY_MS);
    const hijri = getHijriDate(date, overrideMap);
    if (!hijri) continue;
    if (hijri.year === hijriYear && hijri.month === hijriMonth) {
      rows.push({ gregorian: date, hijri });
    }
  }

  // Sorteer op gregoriaanse datum (oudste eerst). De maand kan 29 of 30
  // dagen lang zijn — beide zijn correct.
  rows.sort((a, b) => a.gregorian.getTime() - b.gregorian.getTime());
  return rows;
}

/**
 * Welke Hijri-(jaar, maand) combinaties dekken de gegeven gregoriaanse
 * datum-range? Gebruikt om de selector-opties te bouwen op basis van
 * beschikbare CSV-rijen.
 *
 * Voorbeeld: CSV bevat 1-1-2026 t/m 31-12-2026 → Hijri-maanden Jumada al-Akhirah 1447 t/m Joemaada al-Oela 1448.
 */
export function listAvailableHijriMonthsForRange(
  startDate:    Date,
  endDate:      Date,
  overrideMap?: Map<string, HijriDateOverride>,
): Array<{ year: number; month: number; nl: string; ar: string }> {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return [];
  if (startDate.getTime() > endDate.getTime()) return [];

  const seen = new Map<string, { year: number; month: number; nl: string; ar: string }>();

  // Itereer per dag van start t/m end. Voor jaarlijkse CSV is dat 365 iteraties —
  // verwaarloosbaar. Voor multi-jaar CSV's nog steeds OK.
  const startMs = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const endMs   = Date.UTC(endDate.getUTCFullYear(),   endDate.getUTCMonth(),   endDate.getUTCDate());

  for (let ms = startMs; ms <= endMs; ms += DAY_MS) {
    const h = getHijriDate(new Date(ms), overrideMap);
    if (!h) continue;
    const key = `${h.year}-${h.month}`;
    if (!seen.has(key)) {
      seen.set(key, {
        year:  h.year,
        month: h.month,
        nl:    h.monthNameNl,
        ar:    h.monthNameAr,
      });
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );
}
