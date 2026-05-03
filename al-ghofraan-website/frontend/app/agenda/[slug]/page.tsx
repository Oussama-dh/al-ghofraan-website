// app/agenda/[slug]/page.tsx

import type { Metadata }          from "next";
import { notFound }               from "next/navigation";
import Image                      from "next/image";
import Container                  from "@/components/ui/Container";
import Button                     from "@/components/ui/Button";
import { getActivityBySlug, getAssetUrl } from "@/lib/directus";
import { formatDate }             from "@/lib/utils";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const activity = await getActivityBySlug(params.slug);
    if (!activity) return { title: "Activiteit niet gevonden" };
    return {
      title:       activity.title,
      description: activity.description?.replace(/<[^>]+>/g, "").slice(0, 160),
    };
  } catch {
    return { title: "Activiteit" };
  }
}

export const revalidate = 300;

export default async function ActivityDetailPage({ params }: Props) {
  let activity;
  try {
    activity = await getActivityBySlug(params.slug);
  } catch {
    activity = null;
  }

  if (!activity) notFound();

  const imageId =
    typeof activity.image === "string"
      ? activity.image
      : (activity.image as { id: string } | null)?.id;

  return (
    <>
      {/* Hero */}
      <section className="relative bg-slate-mosque text-white py-16 overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        {imageId && (
          <div className="absolute inset-0 opacity-20">
            <Image
              src={getAssetUrl(imageId)}
              alt={activity.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <Container className="relative z-10">
          <Button href="/agenda" variant="ghost" size="sm"
            className="text-sand/70 hover:text-white mb-6 -ml-1">
            ← Terug naar agenda
          </Button>
          <div className="max-w-2xl">
            {activity.featured && (
              <span className="inline-block bg-taupe text-white text-xs font-body px-3 py-1 rounded-full mb-4">
                Uitgelicht
              </span>
            )}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white mb-4 leading-tight">
              {activity.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-sand/80 text-sm font-body">
              <span className="flex items-center gap-2">
                📅 {formatDate(activity.start_date, "EEEE d MMMM yyyy")}
              </span>
              {activity.end_date && (
                <span className="flex items-center gap-2">
                  t/m {formatDate(activity.end_date, "d MMMM yyyy")}
                </span>
              )}
              {activity.location && (
                <span className="flex items-center gap-2">
                  📍 {activity.location}
                </span>
              )}
            </div>
          </div>
        </Container>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f9f7f5" />
          </svg>
        </div>
      </section>

      {/* Content */}
      <section className="bg-sand-50 py-12 lg:py-16">
        <Container narrow>
          {imageId && (
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden mb-8 shadow-md">
              <Image
                src={getAssetUrl(imageId)}
                alt={activity.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div
            className="prose prose-lg max-w-none font-body text-ink leading-relaxed"
            dangerouslySetInnerHTML={{ __html: activity.description || "" }}
          />

          {/* TODO: Inschrijfformulier (toekomstige functionaliteit) */}
          {activity.registration_enabled && (
            <div className="mt-10 p-6 bg-slate-mosque/10 border border-slate-mosque/20 rounded-2xl">
              <h3 className="font-display text-xl text-ink mb-2">
                Inschrijven
              </h3>
              <p className="font-body text-taupe-dark text-sm">
                Inschrijven voor deze activiteit is binnenkort mogelijk.
              </p>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-sand-200">
            <Button href="/agenda" variant="outline">
              ← Terug naar alle activiteiten
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
