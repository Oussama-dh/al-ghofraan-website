// components/sections/HeroSection.tsx

import Button from "@/components/ui/Button";

interface HeroSectionProps {
  title?:    string;
  subtitle?: string;
  intro?:    string;
}

export default function HeroSection({
  title    = "Kennis, geloof en gemeenschap",
  subtitle = "DawahCommissie · Moskee Al-Ghofraan",
  intro    = "De DawahCommissie van moskee Al-Ghofraan organiseert lezingen, activiteiten en programma's om de moslimgemeenschap te verbinden, te versterken en te inspireren.",
}: HeroSectionProps) {
  // Splits titel om de laatste 1-2 woorden visueel uit te lichten
  const titleParts = splitTitleForAccent(title);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-slate-mosque">
      <div className="absolute inset-0 pattern-overlay opacity-100" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-mosque via-slate-mosque/95 to-slate-dark/90" />

      {/* Decoratieve geometrie */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
        <svg viewBox="0 0 400 600" fill="none" className="h-full w-full">
          <polygon points="400,0 400,600 100,600 0,300" fill="#a99d85" />
          <polygon points="400,0 400,400 200,400 150,200" fill="#ece5df" opacity="0.5" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-2xl">
          <p className="font-arabic text-3xl text-taupe mb-4 animate-fade-in" lang="ar">
            بسم الله الرحمن الرحيم
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

      {/* Wave-overgang */}
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
