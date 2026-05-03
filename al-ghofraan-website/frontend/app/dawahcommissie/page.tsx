// app/dawahcommissie/page.tsx

import type { Metadata }   from "next";
import Container           from "@/components/ui/Container";
import SectionTitle        from "@/components/ui/SectionTitle";
import CTASection          from "@/components/sections/CTASection";
import { getPageBySlug }   from "@/lib/directus";

export const metadata: Metadata = {
  title: "Over de DawahCommissie",
  description: "Leer meer over de DawahCommissie van moskee Al-Ghofraan — onze missie, visie en activiteiten.",
};

export const revalidate = 3600;

export default async function DawahcommissiePage() {
  let pageContent = null;

  try {
    pageContent = await getPageBySlug("dawahcommissie");
  } catch {
    // Fallback naar statische content
  }

  return (
    <>
      {/* Header */}
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title={pageContent?.title || "Over de DawahCommissie"}
            arabic="لجنة الدعوة"
            subtitle="Wie zijn wij en wat drijft ons"
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
          {pageContent?.content ? (
            /* Content uit Directus */
            <div
              className="prose prose-lg max-w-none font-body text-ink leading-relaxed"
              dangerouslySetInnerHTML={{ __html: pageContent.content }}
            />
          ) : (
            /* Statische fallback-content */
            <div className="space-y-10">
              <div>
                <h2 className="font-display text-3xl text-ink mb-4">
                  Wie zijn wij?
                </h2>
                <p className="font-body text-taupe-dark text-lg leading-relaxed">
                  De DawahCommissie is een groep toegewijde vrijwilligers verbonden
                  aan moskee Al-Ghofraan. Ons doel is om de kennis over de islam
                  te verspreiden op een toegankelijke, authentieke en inspirerende
                  manier.
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-sand-200 p-8">
                <div className="font-arabic text-3xl text-slate-mosque mb-3 text-center" lang="ar">
                  ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِالْحِكْمَةِ
                </div>
                <p className="font-body text-center text-taupe-dark text-sm italic">
                  "Nodig uit naar de weg van uw Heer met wijsheid en schone vermaning."
                  <br />— Soera An-Nahl 16:125
                </p>
              </div>

              <div>
                <h2 className="font-display text-3xl text-ink mb-4">Onze missie</h2>
                <p className="font-body text-taupe-dark text-lg leading-relaxed">
                  Wij geloven dat Da'wa — de uitnodiging tot de islam — begint met
                  het goede voorbeeld geven. Door middel van educatieve programma's,
                  dialoog en gemeenschapsactiviteiten willen wij een brug slaan
                  tussen de moslimgemeenschap en de bredere samenleving.
                </p>
              </div>

              <div>
                <h2 className="font-display text-3xl text-ink mb-6">Wat wij doen</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { titel: "Wekelijkse lezingen",     beschrijving: "Elke vrijdag na de gebedstijden verzorgen wij toegankelijke lezingen over diverse islamitische onderwerpen." },
                    { titel: "Islamitische cursussen",   beschrijving: "Cursussen voor beginners en gevorderden over Tawheed, Fiqh, Arabisch en Qur'aanrecitatie." },
                    { titel: "Open dagen",               beschrijving: "Regelmatig verwelkomen wij niet-moslims en geïnteresseerden in de moskee voor een ontmoeting en gesprek." },
                    { titel: "Jeugdprogramma's",         beschrijving: "Activiteiten en programma's speciaal voor jongeren om hen te verbinden met hun identiteit en geloof." },
                  ].map((item) => (
                    <div
                      key={item.titel}
                      className="bg-white rounded-2xl border border-sand-200 p-6"
                    >
                      <h3 className="font-body font-semibold text-ink mb-2">
                        {item.titel}
                      </h3>
                      <p className="font-body text-taupe-dark text-sm leading-relaxed">
                        {item.beschrijving}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-mosque/5 border border-slate-mosque/15 rounded-2xl p-6">
                <h3 className="font-body font-semibold text-ink mb-2">Contact</h3>
                <p className="font-body text-taupe-dark text-sm">
                  Heeft u vragen of wilt u samenwerken? Neem contact met ons op via{" "}
                  <a
                    href="mailto:el-masoudi@hotmail.com"
                    className="text-slate-mosque underline hover:no-underline"
                  >
                    el-masoudi@hotmail.com
                  </a>
                </p>
              </div>

              <p className="font-body text-xs text-taupe-dark italic">
                💡 Beheerder: bewerk deze pagina via Directus → Pagina's → slug: "dawahcommissie"
              </p>
            </div>
          )}
        </Container>
      </section>

      <CTASection
        title="Doe mee met de DawahCommissie"
        subtitle="Bekijk onze agenda voor aankomende lezingen en activiteiten."
        primaryCta={{ label: "Bekijk de agenda", href: "/agenda" }}
        secondaryCta={{ label: "Doneer aan ons werk", href: "/doneren" }}
      />
    </>
  );
}
