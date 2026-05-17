// app/vacatures/page.tsx
//
// Overzicht-pagina voor vacatures (delivery 18).
//
// Toont alle gepubliceerde records uit de `vacancies` collectie als cards.
// De hero (titel/intro) komt uit `page_content` met slug "vacatures" zodat
// de beheerder de kop-tekst zonder code-wijziging kan aanpassen — exact
// het patroon dat `/artikelen`, `/onderwijs` etc. ook gebruiken.
//
// Lege staat: als er geen published vacatures zijn, tonen we een nette
// boodschap met een doorverwijzing naar /contact. Drafts en archived
// vacatures verschijnen hier nooit (filter staat in getVacancies).

import type { Metadata } from "next";
import Link              from "next/link";
import { ArrowRight, MapPin, Clock, CalendarClock } from "lucide-react";
import Container         from "@/components/ui/Container";
import PageHero          from "@/components/sections/PageHero";
import {
  getVacancies,
  getPageContent,
  getSiteSettings,
} from "@/lib/directus";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FALLBACK = {
  title:    "Vacatures",
  arabic:   "وظائف شاغرة",
  subtitle: "Vrijwilligersrollen en functies binnen Al-Ghofraan",
};

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("vacatures"),
    getSiteSettings(),
  ]);
  return {
    title:       page?.seo_title || page?.title || FALLBACK.title,
    description:
      page?.seo_description ||
      settings?.default_seo_description ||
      "Bekijk openstaande vrijwilligersrollen en functies binnen Al-Ghofraan.",
  };
}

export default async function VacaturesPage() {
  const [vacancies, page] = await Promise.all([
    getVacancies(),
    getPageContent("vacatures"),
  ]);

  return (
    <>
      <PageHero
        title={page?.title || FALLBACK.title}
        arabic={page?.arabic_title || FALLBACK.arabic}
        subtitle={page?.subtitle || FALLBACK.subtitle}
        backgroundImage={page?.hero_background_image}
      />

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          {/* Optionele intro-tekst uit page_content. Body wordt bewust NIET
              meer gerenderd — die was bedoeld voor de oude (rich-text-only)
              vacaturepagina. Beheerder kan body laten staan of leegmaken. */}
          {page?.intro && (
            <p className="font-body text-base md:text-lg text-taupe-dark leading-relaxed max-w-3xl mb-10">
              {page.intro}
            </p>
          )}

          {vacancies.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vacancies.map((v) => (
                <article
                  key={v.id}
                  className="group flex flex-col rounded-2xl border border-sand-200 bg-white p-6 shadow-sm transition-all hover:border-taupe/40 hover:shadow-md"
                >
                  <h2 className="font-display text-xl text-ink mb-3 leading-tight">
                    {v.title}
                  </h2>

                  {v.summary && (
                    <p className="font-body text-sm text-taupe-dark leading-relaxed mb-4 line-clamp-3">
                      {v.summary}
                    </p>
                  )}

                  {/* Meta: locatie / hours / deadline — alleen tonen wat gevuld is.
                      Per veld een eigen icoon zodat scannen makkelijk blijft. */}
                  {(v.location || v.hours || v.deadline) && (
                    <ul className="font-body text-xs text-taupe-dark space-y-1.5 mb-5">
                      {v.location && (
                        <li className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-taupe shrink-0" />
                          <span>{v.location}</span>
                        </li>
                      )}
                      {v.hours && (
                        <li className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-taupe shrink-0" />
                          <span>{v.hours}</span>
                        </li>
                      )}
                      {v.deadline && (
                        <li className="flex items-center gap-2">
                          <CalendarClock className="w-3.5 h-3.5 text-taupe shrink-0" />
                          <span>Reageer vóór {formatDate(v.deadline)}</span>
                        </li>
                      )}
                    </ul>
                  )}

                  <div className="mt-auto pt-2">
                    <Link
                      href={`/vacatures/${v.slug}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-mosque hover:text-slate-dark group-hover:gap-2 transition-all"
                    >
                      Bekijk vacature
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            // Lege staat: geen published vacatures. Niet pretenderen dat er
            // iets is — directe doorverwijzing naar contact voor vragen.
            <div className="rounded-2xl border border-sand-200 bg-white p-8 lg:p-12 text-center">
              <p className="font-body text-base text-ink mb-2">
                Er zijn op dit moment geen openstaande vacatures.
              </p>
              <p className="font-body text-sm text-taupe-dark mb-6">
                Wil je toch graag bijdragen aan Al-Ghofraan? Neem gerust contact met ons op.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-mosque px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-dark transition-colors"
              >
                Neem contact op
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
