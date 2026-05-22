// components/sections/CTASection.tsx

import Button      from "@/components/ui/Button";
import Container   from "@/components/ui/Container";
import TrackedLink from "@/components/analytics/TrackedLink";
import type { AnalyticsEventName, AnalyticsEventParams } from "@/lib/analytics";

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

// Mapt knop-href naar het juiste GA4-event. Houdt CTASection
// privacy-safe: alleen button_label + source worden meegestuurd, géén
// vrije tekst uit Directus.
function eventForHref(href: string): AnalyticsEventName | null {
  if (href === "/doneren")                                    return "donate_click";
  if (href === "/contact")                                    return "contact_click";
  if (href === "/agenda" || href.startsWith("/agenda/"))      return "agenda_click";
  return null;
}

export default function CTASection({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: CTASectionProps) {
  const primaryEvent   = primaryCta   ? eventForHref(primaryCta.href)   : null;
  const secondaryEvent = secondaryCta ? eventForHref(secondaryCta.href) : null;
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
            primaryEvent ? (
              <TrackedLink
                href={primaryCta.href}
                event={primaryEvent}
                params={
                  {
                    source:       "homepage_cta",
                    button_label: primaryCta.label,
                  } as AnalyticsEventParams
                }
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-taupe hover:bg-taupe-dark text-white font-body font-medium text-base shadow-sm hover:shadow-md transition-all"
              >
                {primaryCta.label}
              </TrackedLink>
            ) : (
              <Button href={primaryCta.href} size="lg"
                className="bg-taupe hover:bg-taupe-dark text-white">
                {primaryCta.label}
              </Button>
            )
          )}
          {secondaryCta && (
            secondaryEvent ? (
              <TrackedLink
                href={secondaryCta.href}
                event={secondaryEvent}
                params={
                  {
                    source:       "homepage_cta",
                    button_label: secondaryCta.label,
                  } as AnalyticsEventParams
                }
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/30 text-white hover:bg-white hover:text-slate-mosque font-body font-medium text-base transition-all"
              >
                {secondaryCta.label}
              </TrackedLink>
            ) : (
              <Button
                href={secondaryCta.href}
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white hover:text-slate-mosque"
              >
                {secondaryCta.label}
              </Button>
            )
          )}
        </div>
      </Container>
    </section>
  );
}
