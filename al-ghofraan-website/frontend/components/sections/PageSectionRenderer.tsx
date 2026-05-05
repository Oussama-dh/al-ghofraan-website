// components/sections/PageSectionRenderer.tsx
//
// Dispatcher die op basis van section.type het juiste section-component kiest.
// Onbekende types worden stil overgeslagen — geen crash.

import type { PageSection, PageSectionItem } from "@/types/directus";
import SplitFeatureSection from "./types/SplitFeatureSection";
import CardGridSection     from "./types/CardGridSection";
import SimpleTextSection   from "./types/SimpleTextSection";
import CtaSection          from "./types/CtaSection";

type SectionWithItems = PageSection & { items: PageSectionItem[] };

interface PageSectionRendererProps {
  section: SectionWithItems;
}

export default function PageSectionRenderer({ section }: PageSectionRendererProps) {
  switch (section.type) {
    case "split_feature": return <SplitFeatureSection section={section} />;
    case "card_grid":     return <CardGridSection     section={section} />;
    case "simple_text":   return <SimpleTextSection   section={section} />;
    case "cta":           return <CtaSection          section={section} />;
    default:
      // Onbekend type — stil renderen niets
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[PageSectionRenderer] onbekend type: ${section.type}`);
      }
      return null;
  }
}

/**
 * Convenience component dat een lijst sections rendert.
 * Filtert op optionele type-whitelist (handig om bv. alleen
 * non-cta sections in een bepaald deel van de pagina te tonen).
 */
interface PageSectionsListProps {
  sections: SectionWithItems[];
  only?:    PageSection["type"][];
}

export function PageSectionsList({ sections, only }: PageSectionsListProps) {
  const filtered = only
    ? sections.filter((s) => only.includes(s.type))
    : sections;

  return (
    <>
      {filtered.map((section) => (
        <PageSectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}
