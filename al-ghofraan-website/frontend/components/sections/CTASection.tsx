// components/sections/CTASection.tsx

import Button      from "@/components/ui/Button";
import Container   from "@/components/ui/Container";

interface CTASectionProps {
  title:       string;
  subtitle?:   string;
  /**
   * Beide knoppen zijn optioneel — als geen primaryCta is doorgegeven,
   * wordt geen primaire knop gerenderd. Voor backward-compat met de
   * homepage-fallback (waar deze altijd is gevuld) verandert er niets.
   * Toegevoegd voor Delivery A: beheerbare homepage_cta_* via Directus
   * waar de beheerder primary/secondary leeg mag laten.
   */
  primaryCta?:  { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export default function CTASection({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: CTASectionProps) {
  return (
    <section className="bg-slate-mosque py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 pattern-overlay opacity-50" />

      <Container className="relative z-10 text-center">
        <p
          className="font-arabic text-2xl text-taupe-light mb-4"
          lang="ar"
        >
          ﴿ وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ ﴾
        </p>

        <h2 className="font-display text-3xl sm:text-4xl text-white mb-4 text-balance">
          {title}
        </h2>

        {subtitle && (
          <p className="font-body text-sand/70 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            {subtitle}
          </p>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          {primaryCta && (
            <Button href={primaryCta.href} size="lg"
              className="bg-taupe hover:bg-taupe-dark text-white">
              {primaryCta.label}
            </Button>
          )}
          {secondaryCta && (
            <Button
              href={secondaryCta.href}
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white hover:text-slate-mosque"
            >
              {secondaryCta.label}
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}
