// components/sections/sectionStyles.ts
// Helper voor background_variant van page_sections.

import type { SectionBackgroundVariant } from "@/types/directus";

/**
 * Geef de Tailwind-klasse(s) voor een sectie-achtergrond.
 * - default       → bg-sand-50 (warm beige, standaard)
 * - white         → bg-white
 * - sand          → bg-sand
 * - slate-mosque  → bg-slate-mosque + witte tekst (donker)
 */
export function backgroundVariantClass(
  variant?: SectionBackgroundVariant | null
): string {
  switch (variant) {
    case "white":        return "bg-white";
    case "sand":         return "bg-sand";
    case "slate-mosque": return "bg-slate-mosque text-white";
    case "default":
    default:             return "bg-sand-50";
  }
}

/** Tekstkleur-class voor de subtitle, afhankelijk van achtergrond */
export function subtitleClassForVariant(
  variant?: SectionBackgroundVariant | null
): string {
  return variant === "slate-mosque"
    ? "text-sand/80"
    : "text-taupe-dark";
}

/** Geeft true als variant donker is (witte tekst nodig) */
export function isDarkVariant(variant?: SectionBackgroundVariant | null): boolean {
  return variant === "slate-mosque";
}
