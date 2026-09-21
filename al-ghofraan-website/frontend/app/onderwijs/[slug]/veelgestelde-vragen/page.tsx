// app/onderwijs/[slug]/veelgestelde-vragen/page.tsx
//
// Alle gepubliceerde veelgestelde vragen van één onderwijsprogramma,
// gegroepeerd per categorie. Beheer: Directus → education_program_faqs
// (of via het programma zelf, veld "Veelgestelde vragen").

import type { Metadata } from "next";
import { notFound }      from "next/navigation";
import Container         from "@/components/ui/Container";
import Button            from "@/components/ui/Button";
import GroupedFaq        from "@/components/education/GroupedFaq";
import { getEducationProgramBySlug, getEducationProgramFaqs } from "@/lib/directus";
import { groupFaqs }     from "@/lib/faqGroups";

interface Props {
  params: { slug: string };
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = await getEducationProgramBySlug(params.slug);
  if (!program) return { title: "Onderwijsprogramma niet gevonden" };
  return {
    title:       `Veelgestelde vragen — ${program.title}`,
    description: `Antwoorden op veelgestelde vragen over ${program.title}.`,
  };
}

export default async function EducationProgramFaqPage({ params }: Props) {
  const program = await getEducationProgramBySlug(params.slug);
  if (!program) notFound();

  const faqs = await getEducationProgramFaqs(program.id);
  if (faqs.length === 0) notFound();

  const groups = groupFaqs(faqs);
  const programHref = `/onderwijs/${program.slug}`;

  return (
    <>
      <section className="bg-slate-mosque text-white py-14">
        <Container className="relative z-10">
          <Button
            href={programHref}
            variant="ghost"
            size="sm"
            className="text-sand/70 hover:text-white mb-6 -ml-1"
          >
            ← Terug naar {program.title}
          </Button>
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white mb-3 leading-tight">
              Veelgestelde vragen
            </h1>
            <p className="font-body text-sand/80 text-base sm:text-lg">{program.title}</p>
          </div>
        </Container>
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container narrow>
          <GroupedFaq groups={groups} />

          <div className="mt-14 p-6 bg-white border border-sand-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-ink">Klaar om in te schrijven?</h2>
              <p className="font-body text-sm text-taupe-dark mt-1">
                Ga terug naar de programmapagina om uw kind(eren) in te schrijven.
              </p>
            </div>
            {program.registration_enabled && (
              <Button href={`${programHref}#inschrijven`} variant="primary" className="shrink-0">
                Naar de inschrijving
              </Button>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
