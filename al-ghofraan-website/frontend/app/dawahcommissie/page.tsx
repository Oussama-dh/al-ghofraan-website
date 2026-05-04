// app/dawahcommissie/page.tsx

import type { Metadata }  from "next";
import Container          from "@/components/ui/Container";
import SectionTitle       from "@/components/ui/SectionTitle";
import CTASection         from "@/components/sections/CTASection";
import FaqSection         from "@/components/sections/FaqSection";
import { Icon }           from "@/lib/icons";
import {
  getPageContent,
  getFaqItems,
  getIconSettings,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";

export const revalidate = 600;

const FALLBACK_BODY = `
  <h2>Wie zijn wij?</h2>
  <p>De DawahCommissie is een groep toegewijde vrijwilligers verbonden aan moskee Al-Ghofraan.</p>
  <h2>Onze missie</h2>
  <p>Wij geloven dat Da&apos;wa &mdash; de uitnodiging tot de islam &mdash; begint met het goede voorbeeld geven.</p>
`;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageContent("dawahcommissie");
  return {
    title:       page?.seo_title       || "Over de DawahCommissie",
    description: page?.seo_description || "Leer meer over de DawahCommissie van moskee Al-Ghofraan.",
  };
}

export default async function DawahcommissiePage() {
  const [page, faqs, iconMap] = await Promise.all([
    getPageContent("dawahcommissie"),
    getFaqItems(),
    getIconSettings(),
  ]);

  const title    = page?.title    || "Over de DawahCommissie";
  const subtitle = page?.subtitle || "Wie zijn wij en wat drijft ons";
  const body     = page?.body     || FALLBACK_BODY;

  const pageIcon       = page?.icon || resolveIconKey(iconMap, ICON_KEYS.pageSectionDefault);
  const faqDefaultIcon = resolveIconKey(iconMap, ICON_KEYS.faq);

  return (
    <>
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title={title}
            arabic="لجنة الدعوة"
            subtitle={subtitle}
            light
          />
        </Container>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f9f7f5" />
          </svg>
        </div>
      </section>

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
            className="prose prose-lg max-w-none font-body text-ink leading-relaxed prose-headings:font-display prose-headings:text-ink prose-a:text-slate-mosque"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </Container>
      </section>

      <FaqSection
        items={faqs}
        title="Veelgestelde vragen"
        subtitle="Antwoorden op vragen die we vaak krijgen over onze activiteiten."
        defaultIcon={faqDefaultIcon}
      />

      <CTASection
        title="Doe mee met de DawahCommissie"
        subtitle="Bekijk onze agenda voor aankomende lezingen en activiteiten."
        primaryCta={{ label: "Bekijk de agenda", href: "/agenda" }}
        secondaryCta={{ label: "Doneer aan ons werk", href: "/doneren" }}
      />
    </>
  );
}
