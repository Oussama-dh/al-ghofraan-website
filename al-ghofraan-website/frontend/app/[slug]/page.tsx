// app/[slug]/page.tsx
//
// Dynamische pagina-route: leest page_content uit Directus voor de gegeven slug
// en rendert de bijbehorende page_sections.
//
// Vaste app-routes (agenda, gebedstijden, ...) worden uitgesloten via
// isReservedSlug(). Niet-bestaande / draft pagina's krijgen notFound().

import type { Metadata }     from "next";
import { notFound }          from "next/navigation";
import Container             from "@/components/ui/Container";
import PageHero              from "@/components/sections/PageHero";
import { Icon }              from "@/lib/icons";
import { PageSectionsList }  from "@/components/sections/PageSectionRenderer";
import {
  getPageContent,
  getAllPageContentSlugs,
  getPageSectionsWithItems,
  getIconSettings,
  getSiteSettings,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";
import { isReservedSlug } from "@/lib/reservedSlugs";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface Props {
  params: { slug: string };
}

/**
 * Pre-genereer params voor publicly bekende, niet-gereserveerde slugs.
 * Bij dynamicParams=true zorgt Next.js ervoor dat NIEUWE slugs in Directus
 * ook gewoon werken zonder rebuild — pre-render is een optimalisatie.
 */
export async function generateStaticParams() {
  const slugs = await getAllPageContentSlugs();
  return slugs
    .filter((slug) => !isReservedSlug(slug))
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (isReservedSlug(params.slug)) return {};

  const [page, settings] = await Promise.all([
    getPageContent(params.slug),
    getSiteSettings(),
  ]);

  if (!page) return { title: "Pagina niet gevonden" };

  return {
    title:       page.seo_title       || page.title || settings?.default_seo_title || "Pagina",
    description: page.seo_description || page.intro || settings?.default_seo_description || "",
  };
}

export default async function DynamicPage({ params }: Props) {
  // Vaste routes worden door eigen page.tsx files afgehandeld — dit
  // is een veiligheidsklep mocht iemand handmatig naar /agenda hier komen
  if (isReservedSlug(params.slug)) notFound();

  const [page, sections, iconMap] = await Promise.all([
    getPageContent(params.slug),
    getPageSectionsWithItems(params.slug),
    getIconSettings(),
  ]);

  // Geen page_content én geen sections? Dan bestaat de pagina niet.
  if (!page && sections.length === 0) notFound();

  const title    = page?.title    || params.slug;
  const subtitle = page?.subtitle || null;
  const intro    = page?.intro    || null;
  const body     = page?.body     || null;
  const pageIcon = page?.icon || resolveIconKey(iconMap, ICON_KEYS.pageSectionDefault);

  const ctaSections   = sections.filter((s) => s.type === "cta");
  const otherSections = sections.filter((s) => s.type !== "cta");

  return (
    <>
      {/* Page header — zelfde stijl als andere statische pagina's */}
      <PageHero
        title={title}
        arabic={page?.arabic_title || undefined}
        subtitle={subtitle || undefined}
        backgroundImage={page?.hero_background_image}
      />

      {/* Page-content body (alleen als gevuld) */}
      {(intro || body) && (
        <section className="bg-sand-50 py-12 lg:py-16">
          <Container narrow>
            {pageIcon && (
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-mosque/10 flex items-center justify-center text-slate-mosque">
                  <Icon name={pageIcon} className="w-7 h-7" strokeWidth={1.75} />
                </div>
              </div>
            )}

            {intro && (
              <p className="font-body text-lg text-taupe-dark leading-relaxed mb-8 text-balance text-center">
                {intro}
              </p>
            )}

            {body && (
              <div
                className="rich-text max-w-none"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            )}
          </Container>
        </section>
      )}

      {/* Sections (geen cta) */}
      <PageSectionsList sections={otherSections} />

      {/* CTA-sections altijd onderaan */}
      <PageSectionsList sections={ctaSections} />
    </>
  );
}