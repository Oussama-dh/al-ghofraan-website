// components/sections/types/SplitFeatureSection.tsx
//
// Twee-koloms feature-sectie met items-lijst links en
// decoratief Arabisch woord-blok rechts. Vervangt het
// hardcoded missie-blok op de homepage.

import Container       from "@/components/ui/Container";
import SectionTitle    from "@/components/ui/SectionTitle";
import { Icon }        from "@/lib/icons";
import type { PageSection, PageSectionItem } from "@/types/directus";

type SectionWithItems = PageSection & { items: PageSectionItem[] };

interface Props {
  section: SectionWithItems;
}

export default function SplitFeatureSection({ section }: Props) {
  const {
    eyebrow_ar,
    title,
    intro,
    card_title_ar,
    card_subtitle,
    card_tags,
    items,
  } = section;

  const tags = Array.isArray(card_tags) ? card_tags.filter(Boolean) : [];

  return (
    <section className="bg-sand-50 py-16 lg:py-24">
      <Container>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* LINKER KOLOM — titel + items */}
          <div>
            <SectionTitle
              title={title || "Onze missie"}
              arabic={eyebrow_ar || undefined}
              align="left"
              subtitle={intro || undefined}
            />

            {items.length > 0 && (
              <div className="mt-8 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <span className="shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-slate-mosque/10 text-slate-mosque flex items-center justify-center">
                      <Icon name={item.icon} className="w-5 h-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      {item.title && (
                        <h3 className="font-body font-semibold text-ink mb-1">
                          {item.title}
                        </h3>
                      )}
                      {item.description && (
                        <p className="font-body text-taupe-dark text-sm leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECHTER KOLOM — decoratief blok (alleen als card-velden gezet zijn) */}
          {(card_title_ar || card_subtitle || tags.length > 0) ? (
            <div className="relative hidden md:block">
              <div className="aspect-square rounded-3xl bg-slate-mosque/10 border border-taupe/20 flex items-center justify-center p-8">
                <div className="text-center">
                  {card_title_ar && (
                    <div className="font-arabic text-6xl text-slate-mosque mb-4" lang="ar">
                      {card_title_ar}
                    </div>
                  )}
                  {card_subtitle && (
                    <div className="font-body text-taupe-dark text-sm">
                      {card_subtitle}
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      {tags.slice(0, 6).map((tag, idx) => (
                        <div
                          key={`${tag}-${idx}`}
                          className="bg-white rounded-xl p-2 text-center border border-sand-200"
                        >
                          <div className="font-arabic text-lg text-slate-mosque" lang="ar">
                            {tag}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-taupe/20 -z-10" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-slate-mosque/20 -z-10" />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
