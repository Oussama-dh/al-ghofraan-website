// components/sections/HeroSection.tsx
//
// Homepage hero. Delivery 16 wijzigingen:
//   - `pattern-overlay` (plusjes) verwijderd.
//   - Decoratieve SVG-driehoeken verwijderd.
//   - Optionele `backgroundImage` toegevoegd (komt uit page_content.hero_background_image
//     voor slug "home"). Met image: image-cover + bg-black/40 overlay.
//     Zonder image: huidige slate-mosque kleur + gradient (ongewijzigd).
//   - Gradient, wave-overgang, Bismillah en animaties bewust BEHOUDEN —
//     dat zijn sfeer/kleur-elementen, geen drukke decoratie.

import Button             from "@/components/ui/Button";
import { getAssetUrl }    from "@/lib/directus";

interface HeroSectionProps {
  title?:    string;
  subtitle?: string;
  intro?:    string;
  /** Arabische tekst boven de titel. Default: Bismillah. */
  arabic?:   string;
  /** Optionele achtergrondafbeelding (uuid uit directus_files). */
  backgroundImage?: string | { id?: string } | null;
}

export default function HeroSection({
  title    = "Kennis, geloof en gemeenschap",
  subtitle = "DawahCommissie · Moskee Al-Ghofraan",
  intro    = "De DawahCommissie van moskee Al-Ghofraan organiseert lezingen, activiteiten en programma's om de moslimgemeenschap te verbinden, te versterken en te inspireren.",
  arabic   = "بسم الله الرحمن الرحيم",
  backgroundImage,
}: HeroSectionProps) {
  // Splits titel om de laatste 1-2 woorden visueel uit te lichten
  const titleParts = splitTitleForAccent(title);

  const imageUrl = getAssetUrl(backgroundImage as never);
  const hasImage = imageUrl.length > 0;

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-mosque">
      {/* Achtergrondafbeelding — alleen als ingesteld. Komt onder de gradient. */}
      {hasImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        </>
      )}

      {/* Gradient — behouden voor kleurdiepte. Bij image wordt deze als
          subtiele overlay nóg eens over de bg-black/40 gelegd; bij geen image
          is dit hét visuele effect over de slate-mosque kleur. */}
      {!hasImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-mosque via-slate-mosque/95 to-slate-dark/90" />
      )}

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-2xl">
          <p className="font-arabic text-3xl text-taupe mb-4 animate-fade-in" lang="ar">
            {arabic}
          </p>

          <div className="flex items-center gap-3 mb-6 animate-fade-in animation-delay-100">
            <span className="block h-px w-10 bg-taupe/60" />
            <span className="font-body text-xs uppercase tracking-[0.25em] text-taupe/80">
              {subtitle}
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight text-balance mb-6 animate-slide-up animation-delay-200">
            {titleParts.head}
            {titleParts.accent && (
              <>
                {" "}
                <span className="text-taupe-light">{titleParts.accent}</span>
              </>
            )}
          </h1>

          <p className="font-body text-lg text-sand/80 leading-relaxed mb-8 max-w-xl animate-slide-up animation-delay-300">
            {intro}
          </p>

          <div className="flex flex-wrap gap-4 animate-slide-up animation-delay-400">
            <Button href="/agenda" size="lg">
              Bekijk de agenda
            </Button>
            <Button
              href="/dawahcommissie"
              variant="outline"
              size="lg"
              className="border-white/40 text-white hover:bg-white hover:text-slate-mosque"
            >
              Over ons
            </Button>
          </div>
        </div>
      </div>

      {/* Wave-overgang — behouden voor natuurlijke overgang naar de body. */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" className="w-full">
          <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="#f9f7f5" />
        </svg>
      </div>
    </section>
  );
}

// Splits een titel: laatste woord (of twee) wordt accent
function splitTitleForAccent(title: string): { head: string; accent: string } {
  const words = title.trim().split(/\s+/);
  if (words.length <= 2) return { head: title, accent: "" };
  // accent = laatste woord
  return {
    head:   words.slice(0, -1).join(" "),
    accent: words[words.length - 1],
  };
}
