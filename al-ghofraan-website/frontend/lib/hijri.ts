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
  7:  { nl: "Radjab",           ar: "رجب"           },
  8:  { nl: "Sha'baan",         ar: "شعبان"         },
  9:  { nl: "Ramadan",          ar: "رمضان"         },
  10: { nl: "Shawwaal",         ar: "شوال"          },
  11: { nl: "Dhul-Qi'dah",      ar: "ذو القعدة"      },
  12: { nl: "Dhul-Hijjah",      ar: "ذو الحجة"       },
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
 * Format een HijriDate als korte Nederlandse string: "21 Dhul-Qi'dah 1447"
 */
export function formatHijriShortNl(h: HijriDate): string {
  return `${h.day} ${h.monthNameNl} ${h.year}`;
}
