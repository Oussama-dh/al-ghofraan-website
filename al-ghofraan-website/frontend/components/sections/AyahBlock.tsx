// components/sections/AyahBlock.tsx
//
// Klein presentatie-component voor een ayah-blok: Arabische tekst,
// optionele Nederlandse vertaling, optionele bronvermelding.
//
// Wordt gebruikt op:
//   - homepage    (boven body)        — voedt zich uit home_ayah_*
//   - doneren     (boven donatieform) — voedt zich uit donation_ayah_*
//
// Server-component (geen client state). Renderkeuze:
//   - Toont niets als `enabled` false is of arabic ontbreekt.
//   - Translation + reference zijn elk optioneel; layout past zich
//     aan als één van beide leeg is.
//
// Styling: zelfde toon als het bestaande hardcoded blok op /doneren
// — gecentreerde tekst, font-arabic voor het vers, taupe voor
// vertaling, italic voor reference.

import { cn } from "@/lib/utils";

interface AyahBlockProps {
  enabled?:     boolean | null;
  arabic?:      string  | null;
  translation?: string  | null;
  reference?:   string  | null;
  /** Optionele extra wrapper-class voor layout (margin etc.) */
  className?:   string;
}

export default function AyahBlock({
  enabled,
  arabic,
  translation,
  reference,
  className,
}: AyahBlockProps) {
  const arabicTrim      = (arabic      ?? "").trim();
  const translationTrim = (translation ?? "").trim();
  const referenceTrim   = (reference   ?? "").trim();

  // Toon alleen als beheerder dit blok aan heeft staan EN er
  // minstens een Arabische tekst is om te tonen. Vertaling +
  // referentie zijn optioneel.
  if (!enabled || !arabicTrim) return null;

  return (
    <div className={cn("text-center", className)}>
      <div
        className="font-arabic text-2xl text-taupe mb-3 leading-relaxed"
        lang="ar"
        dir="rtl"
      >
        {arabicTrim}
      </div>
      {(translationTrim || referenceTrim) && (
        <p className="font-body text-xs text-taupe-dark mb-4 italic">
          {translationTrim && (
            <>
              &ldquo;{translationTrim}&rdquo;
              {referenceTrim && " — "}
            </>
          )}
          {referenceTrim}
        </p>
      )}
    </div>
  );
}
