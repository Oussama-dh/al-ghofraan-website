// components/sections/types/CtaSection.tsx
//
// CTA-banner met titel, intro en 1-2 knoppen. Donkerblauwe achtergrond met
// patroon-overlay, ongeacht background_variant (daar wijken we van af zodat
// CTA visueel altijd opvalt).

import Container from "@/components/ui/Container";
import Button    from "@/components/ui/Button";
import { Icon }  from "@/lib/icons";
import type { PageSection, PageSectionItem } from "@/types/directus";

type SectionWithItems = PageSection & { items: PageSectionItem[] };

export default function CtaSection({ section }: { section: SectionWithItems }) {
  const {
    eyebrow_ar,
    title,
    intro,
    icon,
    primary_cta_label,
    primary_cta_href,
    secondary_cta_label,
    secondary_cta_href,
    button_text,
    button_url,
    secondary_button_text,
    secondary_button_url,
  } = section;

  // Vallen terug op button_text/url als de cta-specifieke velden niet zijn ingevuld.
  // Zo werkt CTA óók als de redacteur alleen de algemene knop-velden gebruikt.
  const primaryLabel = primary_cta_label   || button_text          || "";
  const primaryHref  = primary_cta_href    || button_url           || "";
  const secLabel     = secondary_cta_label || secondary_button_text || "";
  const secHref      = secondary_cta_href  || secondary_button_url  || "";

  return (
    <section className="bg-slate-mosque py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 pattern-overlay opacity-50" />

      <Container className="relative z-10 text-center">
        {icon && (
          <div className="flex justify-center mb-4">
            <span className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-taupe-light">
              <Icon name={icon} className="w-7 h-7" strokeWidth={1.75} />
            </span>
          </div>
        )}

        {eyebrow_ar && (
          <p className="font-arabic text-2xl text-taupe-light mb-4" lang="ar">
            {eyebrow_ar}
          </p>
        )}

        {title && (
          <h2 className="font-display text-3xl sm:text-4xl text-white mb-4 text-balance">
            {title}
          </h2>
        )}

        {intro && (
          <p className="font-body text-sand/70 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            {intro}
          </p>
        )}

        {(primaryLabel || secLabel) && (
          <div className="flex flex-wrap gap-4 justify-center">
            {primaryLabel && primaryHref && (
              <Button href={primaryHref} size="lg"
                className="bg-taupe hover:bg-taupe-dark text-white">
                {primaryLabel}
              </Button>
            )}
            {secLabel && secHref && (
              <Button
                href={secHref}
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white hover:text-slate-mosque"
              >
                {secLabel}
              </Button>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
