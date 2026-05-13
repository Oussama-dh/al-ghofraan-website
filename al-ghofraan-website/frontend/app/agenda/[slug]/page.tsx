// app/agenda/[slug]/page.tsx

import type { Metadata }  from "next";
import { notFound }       from "next/navigation";
import Container          from "@/components/ui/Container";
import Button             from "@/components/ui/Button";
import { Icon }           from "@/lib/icons";
import RegistrationForm   from "@/components/registration/RegistrationForm";
import {
  getActivityBySlug,
  getAssetUrl,
  getIconSettings,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";
import { formatDate }     from "@/lib/utils";

interface Props {
  params: { slug: string };
}

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const activity = await getActivityBySlug(params.slug);
  if (!activity) return { title: "Activiteit niet gevonden" };
  return {
    title:       activity.title,
    description: activity.description?.replace(/<[^>]+>/g, "").slice(0, 160),
  };
}

export default async function ActivityDetailPage({ params }: Props) {
  const [activity, iconMap] = await Promise.all([
    getActivityBySlug(params.slug),
    getIconSettings(),
  ]);

  if (!activity) notFound();

  const dateIcon     = resolveIconKey(iconMap, ICON_KEYS.activityDate);
  const locationIcon = resolveIconKey(iconMap, ICON_KEYS.activityLocation);

  const imageUrl = getAssetUrl(activity.image as never);

  return (
    <>
      <section className="relative bg-slate-mosque text-white py-16 overflow-hidden">
        {imageUrl && (
          <div className="absolute inset-0 opacity-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={activity.title} className="w-full h-full object-cover" />
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
                <Icon name={dateIcon} className="w-4 h-4" />
                {formatDate(activity.start_date, "EEEE d MMMM yyyy")}
              </span>
              {activity.end_date && (
                <span className="flex items-center gap-2">
                  t/m {formatDate(activity.end_date, "d MMMM yyyy")}
                </span>
              )}
              {activity.location && (
                <span className="flex items-center gap-2">
                  <Icon name={locationIcon} className="w-4 h-4" />
                  {activity.location}
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

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container narrow>
          {imageUrl && (
            // Flyer-presentatie: object-contain + aspect-ratio met max-h zorgt dat
            // verticale flyers/posters volledig zichtbaar blijven zonder de pagina
            // op te blazen op grote schermen (delivery 12).
            <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] max-h-[70vh] rounded-2xl overflow-hidden mb-8 shadow-md bg-sand-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={activity.title} className="absolute inset-0 w-full h-full object-contain" />
            </div>
          )}

          <div
            className="rich-text max-w-none"
            dangerouslySetInnerHTML={{ __html: activity.description || "" }}
          />

          {activity.registration_enabled && (
            <div className="mt-10">
              <RegistrationForm
                type="activity"
                sourceSlug={activity.slug}
                sourceTitle={activity.title}
                targetGender={activity.target_gender ?? null}
                contentTexts={{
                  intro_title:     activity.registration_intro_title,
                  intro_text:      activity.registration_intro_text,
                  button_text:     activity.registration_button_text,
                  success_message: activity.registration_success_message,
                  extra_note:      activity.registration_extra_note,
                }}
              />
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
