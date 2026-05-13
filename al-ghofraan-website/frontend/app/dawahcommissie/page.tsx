// app/dawahcommissie/page.tsx

import type { Metadata }  from "next";
import Container          from "@/components/ui/Container";
import PageHero           from "@/components/sections/PageHero";
import CTASection         from "@/components/sections/CTASection";
import FaqSection         from "@/components/sections/FaqSection";
import { Icon }           from "@/lib/icons";
import { PageSectionsList } from "@/components/sections/PageSectionRenderer";
import {
  getPageContent,
  getFaqItems,
  getIconSettings,
  getSiteSettings,
  getPageSectionsWithItems,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 600;

const FALLBACK_BODY = `
  <h2>Wie zijn wij?</h2>
  <p>De DawahCommissie is een groep toegewijde vrijwilligers verbonden aan moskee Al-Ghofraan.</p>
  <h2>Onze missie</h2>
  <p>Wij geloven dat Da&apos;wa &mdash; de uitnodiging tot de islam &mdash; begint met het goede voorbeeld geven.</p>
`;

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("dawahcommissie"),
    getSiteSettings(),
  ]);
  return {
    title:       page?.seo_title       || settings?.default_seo_title       || "Over de DawahCommissie",
    description: page?.seo_description || settings?.default_seo_description || "Leer meer over de DawahCommissie van moskee Al-Ghofraan.",
  };
}

export default async function DawahcommissiePage() {
  const [page, faqs, iconMap, sections] = await Promise.all([
    getPageContent("dawahcommissie"),
    getFaqItems(),
    getIconSettings(),
    getPageSectionsWithItems("dawahcommissie"),
  ]);

  const title       = page?.title    || "Over de DawahCommissie";
  const subtitle    = page?.subtitle || "Wie zijn wij en wat drijft ons";
  const arabicTitle = page?.arabic_title || "لجنة الدعوة";
  const body        = page?.body     || FALLBACK_BODY;

  const pageIcon       = page?.icon || resolveIconKey(iconMap, ICON_KEYS.pageSectionDefault);
  const faqDefaultIcon = resolveIconKey(iconMap, ICON_KEYS.faq);

  // Splits CTA-sections van overige sections
  const ctaSections   = sections.filter((s) => s.type === "cta");
  const otherSections = sections.filter((s) => s.type !== "cta");

  return (
    <>
      <PageHero
        title={title}
        arabic={arabicTitle}
        subtitle={subtitle}
        backgroundImage={page?.hero_background_image}
      />

      {/* Page-content body */}
      <section className="bg-sand-50 py-12 lg:py-16">
        <Container narrow>
          {pageIcon && (
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-mosque/10 flex items-center justify-center text-slate-mosque">
                <Icon name={pageIcon} className="w-7 h-7" strokeWidth={1.75} />
              </div>
            </div>
          )}

          {page?.intro && (
            <p className="font-body text-lg text-taupe-dark leading-relaxed mb-8 text-balance text-center">
              {page.intro}
            </p>
          )}

          <div
            className="rich-text max-w-none"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </Container>
      </section>

      {/* Beheerbare sections uit Directus (geen cta) */}
      <PageSectionsList sections={otherSections} />

      {/* FAQ */}
      <FaqSection
        items={faqs}
        title="Veelgestelde vragen"
        subtitle="Antwoorden op vragen die we vaak krijgen over onze activiteiten."
        defaultIcon={faqDefaultIcon}
      />

      {/* CTA: uit Directus indien aanwezig, anders fallback */}
      {ctaSections.length > 0 ? (
        <PageSectionsList sections={ctaSections} />
      ) : (
        <CTASection
          title="Doe mee met de DawahCommissie"
          subtitle="Bekijk onze agenda voor aankomende lezingen en activiteiten."
          primaryCta={{ label: "Bekijk de agenda",      href: "/agenda" }}
          secondaryCta={{ label: "Doneer aan ons werk", href: "/doneren" }}
        />
      )}
    </>
  );
}
