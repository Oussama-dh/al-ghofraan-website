// components/sections/types/CtaSection.tsx
//
// CTA-banner met titel, intro en 1-2 knoppen. Gebruikt het
// donkere mosque-blauw met patroon-overlay.

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
  } = section;

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

        {(primary_cta_label || secondary_cta_label) && (
          <div className="flex flex-wrap gap-4 justify-center">
            {primary_cta_label && primary_cta_href && (
              <Button href={primary_cta_href} size="lg"
                className="bg-taupe hover:bg-taupe-dark text-white">
                {primary_cta_label}
              </Button>
            )}
            {secondary_cta_label && secondary_cta_href && (
              <Button
                href={secondary_cta_href}
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white hover:text-slate-mosque"
              >
                {secondary_cta_label}
              </Button>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
