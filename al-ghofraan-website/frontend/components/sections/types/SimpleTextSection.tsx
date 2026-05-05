// components/sections/types/SimpleTextSection.tsx
//
// Eenvoudig sectie-blok met alleen titel en tekst — handig
// voor introductie- of rustblokken tussen andere secties.

import Container    from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { Icon }     from "@/lib/icons";
import type { PageSection, PageSectionItem } from "@/types/directus";

type SectionWithItems = PageSection & { items: PageSectionItem[] };

export default function SimpleTextSection({ section }: { section: SectionWithItems }) {
  const { eyebrow_ar, title, intro, icon } = section;

  return (
    <section className="bg-sand-50 py-12 lg:py-16">
      <Container narrow>
        <div className="text-center">
          {icon && (
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-mosque/10 flex items-center justify-center text-slate-mosque">
                <Icon name={icon} className="w-7 h-7" strokeWidth={1.75} />
              </div>
            </div>
          )}
          {(title || eyebrow_ar) && (
            <SectionTitle
              title={title || ""}
              arabic={eyebrow_ar || undefined}
              subtitle={intro || undefined}
            />
          )}
          {!title && !eyebrow_ar && intro && (
            <p className="font-body text-taupe-dark text-lg leading-relaxed text-balance">
              {intro}
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
