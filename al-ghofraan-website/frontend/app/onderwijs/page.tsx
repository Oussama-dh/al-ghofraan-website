// app/onderwijs/page.tsx
//
// Overzicht-pagina voor onderwijsprogramma's. Bezoeker ziet hier een
// keuze van alle gepubliceerde programma's en klikt door naar
// /onderwijs/<slug> voor de detailpagina.
//
// Belangrijk: deze pagina opent NIET automatisch een programma. Ze
// toont alleen een lijst van cards. De /onderwijs/[slug] route handelt
// de detail + inschrijfflow af.

import type { Metadata } from "next";
import Link              from "next/link";
import { ArrowRight, GraduationCap, Star } from "lucide-react";
import Container         from "@/components/ui/Container";
import SectionTitle      from "@/components/ui/SectionTitle";
import {
  getEducationPrograms,
  getPageContent,
  getSiteSettings,
  getAssetUrl,
} from "@/lib/directus";
import { formatDate, cn } from "@/lib/utils";
import type { EducationProgram } from "@/types/directus";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 300;

const FALLBACK = {
  title:    "Onderwijs",
  arabic:   "التعليم",
  subtitle: "Cursussen en programma's voor jong en oud",
};

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("onderwijs"),
    getSiteSettings(),
  ]);
  return {
    title: page?.seo_title || page?.title || FALLBACK.title,
    description:
      page?.seo_description ||
      settings?.default_seo_description ||
      "Bekijk alle cursussen, lessen en studiekringen van de DawahCommissie.",
  };
}

export default async function OnderwijsOverviewPage() {
  const [programs, page] = await Promise.all([
    getEducationPrograms() as Promise<EducationProgram[]>,
    getPageContent("onderwijs"),
  ]);

  return (
    <>
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title={page?.title || FALLBACK.title}
            arabic={page?.arabic_title || FALLBACK.arabic}
            subtitle={page?.subtitle || FALLBACK.subtitle}
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
        <Container>
          {programs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <GraduationCap className="w-12 h-12 text-taupe/40 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="font-display text-2xl text-ink mb-2">
                Momenteel geen lopende programma&apos;s
              </h3>
              <p className="font-body text-taupe-dark">
                Houd onze pagina in de gaten voor nieuwe cursussen en lessen.
              </p>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

// ─── Card-component (lokaal — onderwijs heeft eigen velden) ─────
function ProgramCard({ program }: { program: EducationProgram }) {
  const imageId =
    typeof program.image === "string" ? program.image : program.image?.id;
  const imageUrl = imageId ? getAssetUrl(imageId) : null;

  const startDate = program.start_date
    ? formatDate(program.start_date, "d MMM yyyy")
    : null;

  return (
    <Link
      href={`/onderwijs/${program.slug}`}
      className={cn(
        "group flex flex-col bg-white rounded-2xl overflow-hidden",
        "border border-sand-200 hover:border-taupe/50",
        "shadow-sm hover:shadow-md transition-all duration-300",
      )}
    >
      <div className="relative bg-sand overflow-hidden h-48">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={program.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 pattern-overlay bg-sand flex items-center justify-center">
            <Star className="w-12 h-12 text-taupe/40" strokeWidth={1.5} />
          </div>
        )}

        {program.target_group && (
          <div className="absolute top-3 left-3 bg-slate-mosque/95 text-white text-xs font-body font-medium px-3 py-1 rounded-full shadow-md">
            {program.target_group}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        {(program.teacher || startDate) && (
          <div className="flex items-center gap-2 text-taupe text-sm font-body mb-2 flex-wrap">
            {program.teacher && <span className="truncate">{program.teacher}</span>}
            {program.teacher && startDate && <span aria-hidden>·</span>}
            {startDate && <span>vanaf {startDate}</span>}
          </div>
        )}

        <h3 className="font-display text-xl text-ink group-hover:text-slate-mosque transition-colors">
          {program.title}
        </h3>

        {program.description && (
          <p className="font-body text-taupe-dark text-sm leading-relaxed mt-2 flex-1 line-clamp-3">
            {program.description.replace(/<[^>]+>/g, "")}
          </p>
        )}

        <div className="mt-4 flex items-center text-slate-mosque text-sm font-medium font-body group-hover:gap-2 transition-all">
          <span>Bekijk programma</span>
          <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
