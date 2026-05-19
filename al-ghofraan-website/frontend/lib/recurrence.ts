// lib/recurrence.ts
//
// Pure helpers voor terugkerende activiteiten. Geen dependencies.
//
// Filosofie:
//   - Eén activity-record = hoofdrecord. Frontend genereert occurrences
//     runtime (geen DB-bloat, geen sync-issues).
//   - Weekly = elke N weken op dezelfde weekdag als start_date (of een
//     andere weekdag als recurrence_weekday is gezet).
//   - Monthly = elke N maanden op dezelfde dag-van-de-maand als start_date.
//     Edge case: 31 januari + 1 maand → laatste dag van februari.
//   - Hard cap: max 50 occurrences. Voorkomt runaway als beheerder een
//     decennium-lange until-datum invoert.
//   - Default until-fallback: 6 maanden vooruit als beheerder `recurrence_until`
//     leeg laat.
//
// Wat deze module NIET doet (bewust uit MVP-scope):
//   - Uitzonderingsdagen (EXDATE-equivalent).
//   - Maandelijks-op-relatieve-weekdag (bv. "3e dinsdag").
//   - Tijdzone-conversies. Timestamps blijven in dezelfde tijdzone als
//     het opgeslagen start_date (Directus levert ze als ISO UTC).

import type { Activity } from "@/types/directus";

// ─── Constants ─────────────────────────────────────────────

const MAX_OCCURRENCES = 50;
const FALLBACK_UNTIL_MONTHS = 6;
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 uur

const WEEKDAY_INDEX: Record<NonNullable<Activity["recurrence_weekday"]>, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

// ─── Public types ──────────────────────────────────────────

/**
 * Eén concrete instantie van een terugkerende activiteit.
 * Niet gepersisteerd — alleen runtime.
 */
export interface ActivityOccurrence {
  /** ISO timestamp van de start van deze occurrence. */
  start: string;
  /** ISO timestamp van het einde (start + duration uit hoofdrecord, of start + 2h fallback). */
  end: string;
  /** Mensleesbaar Nederlands label, bv. "Vrijdag 22 mei 2026 — 19:00". */
  label: string;
  /** 0-based index in de serie (0 = eerste occurrence, 1 = tweede, …). Voor diagnostiek/keys. */
  index: number;
}

export interface GenerateOptions {
  /**
   * Begin van het venster. Alleen occurrences met start >= from worden
   * geretourneerd. Default: now.
   */
  from?: Date;
  /**
   * Max aantal occurrences om terug te geven (na from-filter). Default: 50.
   * Onafhankelijke hard cap: MAX_OCCURRENCES tijdens generatie.
   */
  limit?: number;
}

// ─── Pure helpers ──────────────────────────────────────────

/**
 * True wanneer de activiteit als terugkerend is ingesteld én een
 * geldige recurrence_type heeft. Tolerant voor null/undefined.
 */
export function isRecurringActivity(activity: Pick<Activity, "is_recurring" | "recurrence_type"> | null | undefined): boolean {
  if (!activity) return false;
  if (activity.is_recurring !== true) return false;
  const t = activity.recurrence_type;
  return t === "weekly" || t === "monthly";
}

/**
 * Genereert alle occurrences in de toekomst (of vanaf opts.from).
 * Voor niet-recurring activiteiten: geeft een array van lengte 0 of 1
 * terug (1 als start_date in de toekomst ligt, anders 0).
 *
 * Veiligheid:
 *   - Ongeldige start_date → []
 *   - Ongeldige recurrence_interval (<1 of NaN) → behandeld als 1
 *   - until-datum vóór start_date → []
 *   - Hard cap MAX_OCCURRENCES tijdens loop
 */
export function generateActivityOccurrences(
  activity: Pick<
    Activity,
    | "start_date" | "end_date"
    | "is_recurring" | "recurrence_type"
    | "recurrence_interval" | "recurrence_until" | "recurrence_weekday"
  >,
  options: GenerateOptions = {},
): ActivityOccurrence[] {
  const from  = options.from  ?? new Date();
  const limit = options.limit ?? MAX_OCCURRENCES;

  const startDate = parseDate(activity.start_date);
  if (!startDate) return [];

  // Duration uit hoofdrecord, met 2u fallback.
  const endDate = parseDate(activity.end_date);
  const durationMs =
    endDate && endDate.getTime() > startDate.getTime()
      ? endDate.getTime() - startDate.getTime()
      : DEFAULT_DURATION_MS;

  // Niet-recurring → maximaal 1 occurrence terug.
  if (!isRecurringActivity(activity)) {
    if (startDate < from) return [];
    return [makeOccurrence(startDate, durationMs, 0)];
  }

  // Recurring — bepaal interval + until.
  const intervalRaw = Number(activity.recurrence_interval);
  const interval =
    Number.isFinite(intervalRaw) && intervalRaw >= 1 ? Math.floor(intervalRaw) : 1;

  const untilDate = resolveUntil(activity.recurrence_until, startDate);
  if (untilDate < startDate) return [];

  // Eerste candidate. Bij weekly + recurrence_weekday override schuiven
  // we de start naar de eerstvolgende doel-weekdag op-of-na startDate.
  let cursor = new Date(startDate);
  if (activity.recurrence_type === "weekly" && activity.recurrence_weekday) {
    const target = WEEKDAY_INDEX[activity.recurrence_weekday];
    if (typeof target === "number") {
      const diff = (target - cursor.getDay() + 7) % 7;
      if (diff > 0) cursor.setDate(cursor.getDate() + diff);
    }
  }

  const occurrences: ActivityOccurrence[] = [];
  let index = 0;
  // Tweede sentinel naast MAX_OCCURRENCES — als de cursor onverwacht
  // niet vooruit zou bewegen, voorkomt iteration cap een hang.
  for (let i = 0; i < MAX_OCCURRENCES * 2 && index < MAX_OCCURRENCES; i++) {
    if (cursor > untilDate) break;

    if (cursor >= from) {
      occurrences.push(makeOccurrence(cursor, durationMs, index));
      if (occurrences.length >= limit) break;
    }

    index++;
    cursor = advance(cursor, activity.recurrence_type as "weekly" | "monthly", interval);
  }

  return occurrences;
}

/**
 * Eerstvolgende occurrence (of null als geen). Handig voor cards/lijsten
 * die alleen het "next up"-moment willen tonen.
 */
export function getNextActivityOccurrence(
  activity: Pick<
    Activity,
    | "start_date" | "end_date"
    | "is_recurring" | "recurrence_type"
    | "recurrence_interval" | "recurrence_until" | "recurrence_weekday"
  >,
  from: Date = new Date(),
): ActivityOccurrence | null {
  const [first] = generateActivityOccurrences(activity, { from, limit: 1 });
  return first ?? null;
}

/**
 * Mensleesbaar label voor weergave op cards/badges.
 * Voorbeelden:
 *   - "Wekelijks"          (interval 1, weekly)
 *   - "Elke 2 weken"       (interval 2, weekly)
 *   - "Maandelijks"        (interval 1, monthly)
 *   - "Elke 3 maanden"     (interval 3, monthly)
 *   - ""                   (niet-recurring)
 */
export function describeRecurrence(
  activity: Pick<Activity, "is_recurring" | "recurrence_type" | "recurrence_interval"> | null | undefined,
): string {
  if (!isRecurringActivity(activity)) return "";
  const intervalRaw = Number(activity?.recurrence_interval);
  const interval =
    Number.isFinite(intervalRaw) && intervalRaw >= 1 ? Math.floor(intervalRaw) : 1;
  if (activity?.recurrence_type === "weekly") {
    return interval === 1 ? "Wekelijks" : `Elke ${interval} weken`;
  }
  if (activity?.recurrence_type === "monthly") {
    return interval === 1 ? "Maandelijks" : `Elke ${interval} maanden`;
  }
  return "";
}

// ─── Internals ─────────────────────────────────────────────

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Resolve until-datum: parsed of fallback (6 maanden na start).
 * Until-datum interpreteren we als "tot en met die dag, einde van de dag"
 * zodat een occurrence ON die datum nog wordt gegenereerd. Daarom 23:59:59.
 */
function resolveUntil(rawUntil: string | null | undefined, fallbackFrom: Date): Date {
  const parsed = parseDate(rawUntil);
  if (parsed) {
    parsed.setHours(23, 59, 59, 999);
    return parsed;
  }
  const fb = new Date(fallbackFrom);
  fb.setMonth(fb.getMonth() + FALLBACK_UNTIL_MONTHS);
  fb.setHours(23, 59, 59, 999);
  return fb;
}

/**
 * Voortgang van de cursor één stap. Weekly = + 7 dagen × interval.
 * Monthly = + N maanden, met "clip to last day" edge-case voor 31-jan etc.
 */
function advance(cursor: Date, type: "weekly" | "monthly", interval: number): Date {
  const next = new Date(cursor);
  if (type === "weekly") {
    next.setDate(next.getDate() + 7 * interval);
    return next;
  }
  // Monthly. Bewaar de originele dag-van-de-maand, klem naar laatste
  // dag als de doelmaand minder dagen heeft.
  const targetDay = cursor.getDate();
  next.setDate(1); // voorkom overflow naar volgende maand bij setMonth
  next.setMonth(next.getMonth() + interval);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(targetDay, lastDay));
  return next;
}

/**
 * Maakt een ActivityOccurrence-object met label.
 */
function makeOccurrence(start: Date, durationMs: number, index: number): ActivityOccurrence {
  const end = new Date(start.getTime() + durationMs);
  return {
    start: start.toISOString(),
    end:   end.toISOString(),
    label: formatLabel(start),
    index,
  };
}

/**
 * Nederlandse datum-tijd label. Server- en client-safe (geen Intl
 * locale-tricks die op verschillende runtimes anders kunnen renderen).
 * Voorbeeld: "Vrijdag 22 mei 2026 — 19:00".
 *
 * Bewust geen formatDate uit lib/utils gebruikt om deze module
 * dependency-vrij te houden voor gebruik vanuit `app/api/*` routes.
 */
const WEEKDAY_NL = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const MONTH_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function formatLabel(d: Date): string {
  const wd  = WEEKDAY_NL[d.getDay()];
  const day = d.getDate();
  const mo  = MONTH_NL[d.getMonth()];
  const yr  = d.getFullYear();
  const hh  = String(d.getHours()).padStart(2, "0");
  const mm  = String(d.getMinutes()).padStart(2, "0");
  return `${wd} ${day} ${mo} ${yr} — ${hh}:${mm}`;
}
