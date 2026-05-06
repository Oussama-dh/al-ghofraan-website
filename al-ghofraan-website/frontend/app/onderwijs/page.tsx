// app/onderwijs/page.tsx

import type { Metadata } from "next";
import Link              from "next/link";
import Image             from "next/image";
import Container         from "@/components/ui/Container";
import SectionTitle      from "@/components/ui/SectionTitle";
import { Icon }          from "@/lib/icons";
import {
  getEducationPrograms,
  getSiteSettings,
  getAssetUrl,
} from "@/lib/directus";
import { formatDate }    from "@/lib/utils";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title:       "Onderwijs",
    description:
      settings?.default_seo_description ||
      "Lessen, cursussen en studiekringen aangeboden door de DawahCommissie.",
  };
}

export default async function OnderwijsPage() {
  const programs = await getEducationPrograms();

  return (
    <>
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title="Onderwijs"
            arabic="التعليم"
            subtitle="Lessen, cursussen en studiekringen voor de gemeenschap"
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
          {programs.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="font-display text-2xl text-ink mb-2">
                Momenteel geen aanbod
              </h3>
              <p className="font-body text-taupe-dark">
                Houd onze pagina in de gaten voor nieuwe lessen en cursussen.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program) => {
                const imageId =
                  typeof program.image === "string"
                    ? program.image
                    : program.image?.id;
                const imageUrl = imageId ? getAssetUrl(imageId) : null;

                return (
                  <Link
                    key={program.id}
                    href={`/onderwijs/${program.slug}`}
                    className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-sand-200 hover:border-taupe/50 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="relative h-48 bg-sand overflow-hidden">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={program.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 pattern-overlay flex items-center justify-center">
                          <Icon name="graduation-cap" className="w-12 h-12 text-taupe/40" strokeWidth={1.5} />
                        </div>
                      )}
                      {program.registration_enabled && (
                        <span className="absolute top-3 right-3 bg-slate-mosque text-white text-xs font-body font-medium px-3 py-1 rounded-full shadow-sm">
                          Inschrijving open
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 p-5">
                      {program.target_group && (
                        <span className="font-body text-xs uppercase tracking-wider text-taupe mb-1">
                          {program.target_group}
                        </span>
                      )}
                      <h3 className="font-display text-xl text-ink group-hover:text-slate-mosque transition-colors">
                        {program.title}
                      </h3>

                      {program.description && (
                        <p className="font-body text-taupe-dark text-sm leading-relaxed mt-2 flex-1 line-clamp-3">
                          {program.description.replace(/<[^>]+>/g, "")}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-taupe text-sm font-body">
                        {program.teacher && (
                          <span className="flex items-center gap-1.5">
                            <Icon name="user" className="w-4 h-4" />
                            {program.teacher}
                          </span>
                        )}
                        {program.start_date && (
                          <span className="flex items-center gap-1.5">
                            <Icon name="calendar" className="w-4 h-4" />
                            {formatDate(program.start_date, "d MMM yyyy")}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center text-slate-mosque text-sm font-medium font-body group-hover:gap-2 transition-all">
                        <span>Meer informatie</span>
                        <Icon name="arrow-right" className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
