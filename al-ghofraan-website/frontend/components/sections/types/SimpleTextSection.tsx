// components/sections/types/SimpleTextSection.tsx

import Image          from "next/image";
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

export default function SimpleTextSection({ section }: { section: SectionWithItems }) {
  const {
    eyebrow_ar,
    title,
    intro,
    icon,
    image,
    button_text,
    button_url,
    secondary_button_text,
    secondary_button_url,
    background_variant,
  } = section;

  const imageUrl = getAssetUrl(image as never);
  const dark     = isDarkVariant(background_variant);

  return (
    <section className={cn("py-12 lg:py-16", backgroundVariantClass(background_variant))}>
      <Container narrow>
        <div className="text-center">
          {imageUrl && (
            <div className="relative w-full max-w-md mx-auto aspect-[16/9] rounded-2xl overflow-hidden mb-8">
              <Image
                src={imageUrl}
                alt={title || "Sectie afbeelding"}
                fill
                sizes="(min-width: 768px) 28rem, 100vw"
                className="object-cover"
              />
            </div>
          )}
          {icon && !imageUrl && (
            <div className="flex justify-center mb-6">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                dark ? "bg-white/10 text-taupe-light" : "bg-slate-mosque/10 text-slate-mosque"
              )}>
                <Icon name={icon} className="w-7 h-7" strokeWidth={1.75} />
              </div>
            </div>
          )}
          {(title || eyebrow_ar) ? (
            <SectionTitle
              title={title || ""}
              arabic={eyebrow_ar || undefined}
              subtitle={intro || undefined}
              light={dark}
            />
          ) : intro ? (
            <p className={cn(
              "font-body text-lg leading-relaxed text-balance",
              dark ? "text-sand/80" : "text-taupe-dark"
            )}>
              {intro}
            </p>
          ) : null}

          {(button_text || secondary_button_text) && (
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
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
      </Container>
    </section>
  );
}
