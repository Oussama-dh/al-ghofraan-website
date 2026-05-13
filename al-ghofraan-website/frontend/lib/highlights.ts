// lib/highlights.ts
//
// Delivery 21 — Helpers voor `prayer_calendar_highlights`.
//
// Public API:
//   - normalizeToIsoDate(input)          → "YYYY-MM-DD" | null
//   - buildHighlightMap(highlights)      → Map<isoDate, PrayerCalendarHighlight[]>
//   - getHighlightStyles(highlight)      → { rowAccentClass, badgeClass, badgeStyle }
//   - getHighlightIcon(highlight)        → LucideIcon
//   - HIGHLIGHT_ICON_WHITELIST            → string[]
//
// Design-keuzes
// -------------
//
// 1. Kleurpalet — geen Tailwind "amber/indigo/rose"-tinten. De codebase
//    gebruikt een CSS-variabelen-systeem (sand/taupe/slate-mosque/ink) dat
//    automatisch dark-mode-aware is via `.dark`-overrides in globals.css.
//    Vreemde absolute kleur-tinten zouden in dark mode er lelijk uitzien.
//    Daarom: alle types gebruiken slate-mosque/taupe/sand met verschillende
//    opacity-tinten. Iconen geven het primaire onderscheid.
//
// 2. Geldigheid-validatie voor overrides:
//      - `color`: alleen HEX `#RRGGBB` geaccepteerd; alles anders → fallback
//        op type-default. Geen RGB(A)/HSL/named-colors — eenvoud + minder
//        kans op slechte contrasten.
//      - `icon`: alleen icons in HIGHLIGHT_ICON_WHITELIST. Buiten de
//        whitelist → fallback. Whitelist beperkt import-bloat en garandeert
//        dat alle iconen ook daadwerkelijk in lucide-react bestaan.

import {
  Sparkles,
  Moon,
  Star,
  Calendar,
  Info,
  Sun,
  Heart,
  Flag,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import type { PrayerCalendarHighlight, PrayerCalendarHighlightType } from "@/types/directus";

// ─── Type-defaults ────────────────────────────────────────────
//
// Voor elk type een set CSS-klassen (puur palet-based) en een default icoon.
// De `badgeClass` is bedoeld voor een kleine inline badge in de tabelcel.
// De `rowAccentClass` is een linker-rand op de hele rij — bewust neutraal
// (één tint voor alle types) om de tabel rustig te houden. Type-differentiatie
// zit in de badge zelf.

type TypeStyle = {
  badgeClass:    string;
  defaultIcon:   LucideIcon;
};

const TYPE_STYLES: Record<PrayerCalendarHighlightType, TypeStyle> = {
  eid: {
    badgeClass:  "bg-slate-mosque/15 text-slate-mosque border border-slate-mosque/25",
    defaultIcon: Sparkles,
  },
  ramadan: {
    badgeClass:  "bg-slate-mosque/10 text-slate-mosque border border-slate-mosque/20",
    defaultIcon: Moon,
  },
  special: {
    badgeClass:  "bg-taupe/15 text-taupe-dark border border-taupe/25",
    defaultIcon: Star,
  },
  event: {
    badgeClass:  "bg-taupe/10 text-taupe-dark border border-taupe/20",
    defaultIcon: Calendar,
  },
  note: {
    badgeClass:  "bg-sand-100 text-taupe border border-sand-200",
    defaultIcon: Info,
  },
};

/**
 * Eén neutrale linker-rand-accent voor alle highlight-rijen. Type-
 * differentiatie zit in de badge; de rij blijft visueel rustig.
 */
const ROW_ACCENT_CLASS = "border-l-4 border-l-slate-mosque/40";

// ─── Icon whitelist ───────────────────────────────────────────
//
// Alleen iconen in deze lijst kunnen via het `icon`-veld worden gebruikt.
// Voor onbekende waarden valt de helper terug op het type-default-icoon.
// De keys zijn de "kebab-case"-namen zoals admin ze zou intypen.

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles:      Sparkles,
  moon:          Moon,
  star:          Star,
  calendar:      Calendar,
  info:          Info,
  sun:           Sun,
  heart:         Heart,
  flag:          Flag,
  "party-popper": PartyPopper,
};

export const HIGHLIGHT_ICON_WHITELIST = Object.keys(ICON_MAP);

// ─── Date normalization ──────────────────────────────────────
//
// Directus levert een `date`-veld als ISO "YYYY-MM-DD" string (of soms
// als volledige timestamp wanneer de SDK het zo serialiseert). Onze
// match-key is altijd de eerste 10 karakters van een ISO datum.
//
// We accepteren ook DD-MM-YYYY en DD/MM/YYYY voor wanneer een CSV-rij
// in dat formaat staat — zo werkt match in beide tabellen consistent.

/**
 * Normaliseer een datum-input naar ISO "YYYY-MM-DD".
 * Retourneert null wanneer geen herkend formaat.
 */
export function normalizeToIsoDate(input: string | Date | null | undefined): string | null {
  if (input == null) return null;

  // Date object — UTC componenten gebruiken zodat tz-shift geen
  // off-by-one geeft.
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    const y = input.getUTCFullYear();
    const m = String(input.getUTCMonth() + 1).padStart(2, "0");
    const d = String(input.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // ISO of timestamp — neem de eerste 10 karakters (datum-deel).
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // DD-MM-YYYY of DD/MM/YYYY
  const dmyMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(trimmed);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, "0");
    const mm = dmyMatch[2].padStart(2, "0");
    const yy = dmyMatch[3];
    return `${yy}-${mm}-${dd}`;
  }

  return null;
}

// ─── Map-builder ─────────────────────────────────────────────

/**
 * Bouw een Map<isoDate, highlights[]> uit een lijst highlights.
 * Filtert direct op `status=published` en `show_on_calendar=true`.
 * Sorteert per dag op `sort` ascending (null/undefined = 0), zodat
 * meerdere highlights op één dag in een consistente volgorde renderen.
 */
export function buildHighlightMap(
  highlights: PrayerCalendarHighlight[] | undefined | null,
): Map<string, PrayerCalendarHighlight[]> {
  const map = new Map<string, PrayerCalendarHighlight[]>();
  if (!Array.isArray(highlights)) return map;

  for (const h of highlights) {
    if (!h) continue;
    if (h.status !== "published") continue;
    if (h.show_on_calendar !== true) continue;
    const iso = normalizeToIsoDate(h.gregorian_date);
    if (!iso) continue;

    const list = map.get(iso);
    if (list) {
      list.push(h);
    } else {
      map.set(iso, [h]);
    }
  }

  // Sorteer per dag op `sort` (null/undefined = 0).
for (const list of Array.from(map.values())) {
  list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

  return map;
}

// ─── Styling per highlight ───────────────────────────────────

/**
 * Valideer een HEX-color string. Accepteert alleen `#RRGGBB` (6 hex digits).
 */
function isValidHexColor(input: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(input);
}

/**
 * Bepaal welk type-bucket te gebruiken — fallback op `event` voor onbekend
 * (defensief: oude records of admin die handmatig een type heeft ingevoerd
 * dat niet in de huidige whitelist staat).
 */
function resolveType(input: unknown): PrayerCalendarHighlightType {
  if (
    input === "eid"     ||
    input === "ramadan" ||
    input === "special" ||
    input === "event"   ||
    input === "note"
  ) {
    return input;
  }
  return "event";
}

export interface HighlightStyles {
  /** Tailwind klassen voor de tabel-rij (linker-rand-accent). */
  rowAccentClass: string;
  /** Tailwind klassen voor de inline badge. */
  badgeClass:     string;
  /** Inline style — alleen gevuld wanneer een geldige `color`-override actief is. */
  badgeStyle?:    React.CSSProperties;
}

export function getHighlightStyles(highlight: PrayerCalendarHighlight): HighlightStyles {
  const type    = resolveType(highlight.type);
  const baseRow = ROW_ACCENT_CLASS;
  const baseBadge = TYPE_STYLES[type].badgeClass;

  // Color-override: alleen wanneer geldig HEX. Tekstkleur forceren we
  // op wit voor maximaal contrast op een custom background — admin
  // wordt aangeraden bij heel lichte kleuren liever het type-default
  // te gebruiken (zie field-note in seed).
  const colorOverride = typeof highlight.color === "string" ? highlight.color.trim() : "";
  if (colorOverride && isValidHexColor(colorOverride)) {
    return {
      rowAccentClass: baseRow,
      // Houden we een neutrale ring/border zodat de badge in beide modi
      // niet flikkert. Tailwind klassen zonder kleur-bg, kleur via inline.
      badgeClass:     "border border-black/10 text-white",
      badgeStyle:     { backgroundColor: colorOverride },
    };
  }

  return {
    rowAccentClass: baseRow,
    badgeClass:     baseBadge,
  };
}

/**
 * Resolve het icoon voor een highlight. Probeert de `icon`-override
 * uit de whitelist; valt anders terug op het type-default-icoon.
 */
export function getHighlightIcon(highlight: PrayerCalendarHighlight): LucideIcon {
  const iconOverride = typeof highlight.icon === "string" ? highlight.icon.trim().toLowerCase() : "";
  if (iconOverride && Object.prototype.hasOwnProperty.call(ICON_MAP, iconOverride)) {
    return ICON_MAP[iconOverride];
  }
  return TYPE_STYLES[resolveType(highlight.type)].defaultIcon;
}
