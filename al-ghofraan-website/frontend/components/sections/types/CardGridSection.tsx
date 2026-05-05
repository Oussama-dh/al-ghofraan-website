// components/sections/types/CardGridSection.tsx

import Image          from "next/image";
import Link           from "next/link";
import Container      from "@/components/ui/Container";
import SectionTitle   from "@/components/ui/SectionTitle";
import Button         from "@/components/ui/Button";
import { Icon }       from "@/lib/icons";
import { getAssetUrl } from "@/lib/directus";
import {
  backgroundVariantClass,
  isDarkVariant,
} from "@/components/sections/sectionStyles";
import { cn } from "@/lib/utils";
import type { PageSection, PageSectionItem } from "@/types/directus";

type SectionWithItems = PageSection & { items: PageSectionItem[] };

export default function CardGridSection({ section }: { section: SectionWithItems }) {
  const {
    eyebrow_ar,
    title,
    intro,
    items,
    button_text,
    button_url,
    background_variant,
  } = section;

  // Default white voor card_grid (kaartjes komen beter uit op wit)
  const variant = background_variant ?? "white";
  const dark    = isDarkVariant(variant);

  return (
    <section className={cn("py-16 lg:py-20", backgroundVariantClass(variant))}>
      <Container>
        {(title || intro || eyebrow_ar) && (
          <SectionTitle
            title={title || ""}
            arabic={eyebrow_ar || undefined}
            subtitle={intro || undefined}
            light={dark}
          />
        )}

        {items.length > 0 && (
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const itemImage = getAssetUrl(item.image as never);

              const innerContent = (
                <div className={cn(
                  "rounded-2xl border p-6 h-full transition-colors",
                  dark
                    ? "bg-white/5 border-white/10 hover:border-white/20"
                    : "bg-sand-50 border-sand-200 hover:border-taupe/40"
                )}>
                  {itemImage ? (
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-sand-100">
                      <Image
                        src={itemImage}
                        alt={item.title || ""}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : item.icon ? (
                    <span className={cn(
                      "inline-flex w-12 h-12 rounded-xl items-center justify-center mb-4",
                      dark ? "bg-white/10 text-taupe-light" : "bg-slate-mosque/10 text-slate-mosque"
                    )}>
                      <Icon name={item.icon} className="w-6 h-6" strokeWidth={1.75} />
                    </span>
                  ) : null}

                  {item.title && (
                    <h3 className={cn(
                      "font-body font-semibold mb-2",
                      dark ? "text-white" : "text-ink"
                    )}>
                      {item.title}
                    </h3>
                  )}
                  {item.description && (
                    <p className={cn(
                      "font-body text-sm leading-relaxed",
                      dark ? "text-sand/70" : "text-taupe-dark"
                    )}>
                      {item.description}
                    </p>
                  )}

                  {item.button_text && item.button_url && (
                    <div className="mt-4">
                      <span className={cn(
                        "inline-flex items-center text-sm font-medium font-body",
                        dark ? "text-taupe-light" : "text-slate-mosque"
                      )}>
                        {item.button_text} →
                      </span>
                    </div>
                  )}
                </div>
              );

              const linkTarget = item.button_url || item.href;

              if (linkTarget) {
                return (
                  <Link key={item.id} href={linkTarget} className="block">
                    {innerContent}
                  </Link>
                );
              }
              return <div key={item.id}>{innerContent}</div>;
            })}
          </div>
        )}

        {button_text && button_url && (
          <div className="mt-10 flex justify-center">
            <Button href={button_url} variant="outline" size="md"
              className={dark ? "border-white/40 text-white hover:bg-white hover:text-slate-mosque" : ""}>
              {button_text}
            </Button>
          </div>
        )}
      </Container>
    </section>
  );
}
