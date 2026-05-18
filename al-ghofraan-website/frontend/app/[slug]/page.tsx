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
  getAssetUrl,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";
import { isReservedSlug } from "@/lib/reservedSlugs";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 600;
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

  // hero_background_image als og:image (bv. /onze-moskee). Leeg veld
  // → og:image valt terug op site-brede default uit site_settings.
  const imageUrl = getAssetUrl(page.hero_background_image as never);

  return {
    title:       page.seo_title       || page.title || settings?.default_seo_title || "Pagina",
    description: page.seo_description || page.intro || settings?.default_seo_description || "",
    ...(imageUrl && {
      openGraph: {
        images: [{ url: imageUrl }],
      },
    }),
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

      {/* Mosque logo — delivery 25.
          Hardcoded gebonden aan slug=onze-moskee zodat het mosque_logo
          veld op page_content elders niet per ongeluk getoond wordt.
          Render via <img> + getAssetUrl(), conform projectregel "geen
          next/image op Directus-assets" (geen remotePatterns whitelist
          nodig in next.config.mjs). Fail-soft: lege logo = niets tonen,
          pagina werkt verder normaal. */}
      {params.slug === "onze-moskee" && page?.mosque_logo && (() => {
        const logoUrl = getAssetUrl(page.mosque_logo);
        if (!logoUrl) return null;
        return (
          <section className="bg-sand-50 pt-12 lg:pt-16 pb-4 lg:pb-6">
            <Container narrow>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Logo Moskee El Mouahidin"
                  className="max-w-sm h-auto"
                  loading="lazy"
                />
              </div>
            </Container>
          </section>
        );
      })()}

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