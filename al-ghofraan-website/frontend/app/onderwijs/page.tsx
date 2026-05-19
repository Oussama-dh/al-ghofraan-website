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
import PageHero          from "@/components/sections/PageHero";
import {
  getEducationPrograms,
  getEducationCategories,
  getEffectiveEducationCategorySlug,
  getPageContent,
  getSiteSettings,
  getAssetUrl,
} from "@/lib/directus";
import { formatDate, cn } from "@/lib/utils";
import type { EducationProgram } from "@/types/directus";

export const dynamic = "force-dynamic";
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

interface OnderwijsPageProps {
  searchParams?: { category?: string };
}

export default async function OnderwijsOverviewPage({ searchParams }: OnderwijsPageProps) {
  const [programs, categories, page] = await Promise.all([
    getEducationPrograms() as Promise<EducationProgram[]>,
    getEducationCategories(),
    getPageContent("onderwijs"),
  ]);

  // ─── Filter: category_ref (M2O naar education_categories) ─
  // Bron: de Directus-collectie education_categories (beheerbaar).
  // We tonen alleen categorieën die daadwerkelijk gebruikt worden
  // door één of meer gepubliceerde programma's — voorkomt lege
  // filterpills. Zelfde patroon als /videos en /artikelen.
  //
  // Programma's zonder category_ref blijven zichtbaar bij "Alle"
  // (geen filter), maar verschijnen niet onder een specifieke
  // categorie-filter. Beheerder kan via Directus een categorie
  // koppelen aan oude programma's wanneer gewenst.

  const usedSlugs = new Set<string>();
  for (const p of programs) {
    const slug = getEffectiveEducationCategorySlug(p);
    if (slug) usedSlugs.add(slug);
  }
  // Behoud Directus-volgorde (al gesorteerd op sort, name in getter).
  const availableCategories = categories.filter((c) => usedSlugs.has(c.slug));

  const requested = (searchParams?.category ?? "").trim().toLowerCase();
  const activeCategory =
    availableCategories.find((c) => c.slug === requested) ?? null;

  const visible = activeCategory
    ? programs.filter(
        (p) => getEffectiveEducationCategorySlug(p) === activeCategory.slug,
      )
    : programs;

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
          {/* Filterknoppen — zelfde stijl als videos/artikelen.
              Alleen tonen als er meer dan één relevante categorie is. */}
          {availableCategories.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <FilterPill href="/onderwijs" active={activeCategory === null}>
                Alle
              </FilterPill>
              {availableCategories.map((cat) => (
                <FilterPill
                  key={cat.slug}
                  href={`/onderwijs?category=${encodeURIComponent(cat.slug)}`}
                  active={activeCategory?.slug === cat.slug}
                >
                  {cat.name}
                </FilterPill>
              ))}
            </div>
          )}

          {visible.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <GraduationCap className="w-12 h-12 text-taupe/40 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="font-display text-2xl text-ink mb-2">
                {activeCategory
                  ? "Geen programma's in deze categorie"
                  : "Momenteel geen lopende programma's"}
              </h3>
              <p className="font-body text-taupe-dark">
                {activeCategory
                  ? "Probeer een andere categorie of bekijk alle programma's."
                  : "Houd onze pagina in de gaten voor nieuwe cursussen en lessen."}
              </p>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

// ─── FilterPill — zelfde stijl als videos/artikelen ──────────
// Bewust een lokale kopie i.p.v. een shared component: videos en
// artikelen hebben elk hun eigen lokale FilterPill, en consolidatie
// in een gedeeld component zou drie pagina's tegelijk raken. Houd
// klein-en-veilig; dedupliceer in een latere delivery als gewenst.
function FilterPill({
  href,
  active,
  children,
}: {
  href:     string;
  active:   boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-body border transition-colors",
        active
          ? "bg-slate-mosque text-white border-slate-mosque"
          : "bg-white text-taupe-dark border-sand-200 hover:border-slate-mosque hover:text-slate-mosque",
      )}
    >
      {children}
    </Link>
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
      {/* Afbeelding — object-contain zodat verticale onderwijsflyers volledig
          zichtbaar blijven (delivery 12). */}
      <div className="relative bg-sand-100 overflow-hidden h-48">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={program.title}
            className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
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
