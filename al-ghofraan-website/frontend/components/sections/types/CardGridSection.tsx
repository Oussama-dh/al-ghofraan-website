// components/sections/types/CardGridSection.tsx
//
// Grid van kaartjes. Toont items in 1/2/3 kolommen afhankelijk van scherm.

import Container    from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { Icon }     from "@/lib/icons";
import Link         from "next/link";
import type { PageSection, PageSectionItem } from "@/types/directus";

type SectionWithItems = PageSection & { items: PageSectionItem[] };

export default function CardGridSection({ section }: { section: SectionWithItems }) {
  const { eyebrow_ar, title, intro, items } = section;

  return (
    <section className="bg-white py-16 lg:py-20">
      <Container>
        {(title || intro) && (
          <SectionTitle
            title={title || ""}
            arabic={eyebrow_ar || undefined}
            subtitle={intro || undefined}
          />
        )}

        {items.length > 0 && (
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const card = (
                <div className="bg-sand-50 rounded-2xl border border-sand-200 p-6 h-full transition-colors hover:border-taupe/40">
                  {item.icon && (
                    <span className="inline-flex w-12 h-12 rounded-xl bg-slate-mosque/10 text-slate-mosque items-center justify-center mb-4">
                      <Icon name={item.icon} className="w-6 h-6" strokeWidth={1.75} />
                    </span>
                  )}
                  {item.title && (
                    <h3 className="font-body font-semibold text-ink mb-2">{item.title}</h3>
                  )}
                  {item.description && (
                    <p className="font-body text-taupe-dark text-sm leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              );

              if (item.href) {
                return (
                  <Link key={item.id} href={item.href} className="block">
                    {card}
                  </Link>
                );
              }
              return <div key={item.id}>{card}</div>;
            })}
          </div>
        )}
      </Container>
    </section>
  );
}
