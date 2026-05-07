// components/sections/types/SplitFeatureSection.tsx
//
// Twee-koloms feature-sectie:
//   - Links: titel + items-lijst (met iconen)
//   - Rechts: ofwel een afbeelding (als section.image gezet is),
//     ofwel het decoratieve Arabische woord-blok (card_title_ar / tags)

import Container               from "@/components/ui/Container";
import SectionTitle            from "@/components/ui/SectionTitle";
import Button                  from "@/components/ui/Button";
import { Icon }                from "@/lib/icons";
import { getAssetUrl }         from "@/lib/directus";
import {
  backgroundVariantClass,
  isDarkVariant,
} from "@/components/sections/sectionStyles";
import type { PageSection, PageSectionItem } from "@/types/directus";
import { cn } from "@/lib/utils";

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
    image,
    button_text,
    button_url,
    secondary_button_text,
    secondary_button_url,
    background_variant,
    items,
  } = section;

  const tags     = Array.isArray(card_tags) ? card_tags.filter(Boolean) : [];
  const imageUrl = getAssetUrl(image as never);
  const dark     = isDarkVariant(background_variant);

  return (
    <section className={cn("py-16 lg:py-24", backgroundVariantClass(background_variant))}>
      <Container>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* LINKER KOLOM */}
          <div>
            <SectionTitle
              title={title || ""}
              arabic={eyebrow_ar || undefined}
              align="left"
              subtitle={intro || undefined}
              light={dark}
            />

            {items.length > 0 && (
              <div className="mt-8 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <span className={cn(
                      "shrink-0 mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center",
                      dark ? "bg-white/10 text-taupe-light" : "bg-slate-mosque/10 text-slate-mosque"
                    )}>
                      <Icon name={item.icon} className="w-5 h-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      {item.title && (
                        <h3 className={cn(
                          "font-body font-semibold mb-1",
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
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(button_text || secondary_button_text) && (
              <div className="mt-8 flex flex-wrap gap-3">
                {button_text && button_url && (
                  <Button href={button_url} size="md">
                    {button_text}
                  </Button>
                )}
                {secondary_button_text && secondary_button_url && (
                  <Button href={secondary_button_url} variant="outline" size="md"
                    className={dark ? "border-white/40 text-white hover:bg-white hover:text-slate-mosque" : ""}>
                    {secondary_button_text}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* RECHTER KOLOM — afbeelding heeft voorrang, anders decoratief blok */}
          {imageUrl ? (
            <div className="relative aspect-square rounded-3xl overflow-hidden hidden md:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={title || "Sectie afbeelding"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          ) : (card_title_ar || card_subtitle || tags.length > 0) ? (
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
