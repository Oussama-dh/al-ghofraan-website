// app/agenda/page.tsx

import type { Metadata }  from "next";
import PageHero          from "@/components/sections/PageHero";
import ActivityCard       from "@/components/ui/ActivityCard";
import Container          from "@/components/ui/Container";
import {
  getActivities,
  getIconSettings,
  getPageContent,
  getSiteSettings,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";
import type { Activity }  from "@/types/directus";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 300;

// Fallbacks worden gebruikt zodra de admin het page_content-record voor
// "agenda" leeg laat of nog niet heeft aangemaakt — zo blijft de pagina
// in productie altijd presentabel.
const FALLBACK = {
  title:    "Agenda & Activiteiten",
  arabic:   "الأنشطة والفعاليات",
  subtitle: "Lezingen, cursussen en evenementen van de DawahCommissie",
};

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("agenda"),
    getSiteSettings(),
  ]);
  return {
    title:       page?.seo_title || page?.title || FALLBACK.title,
    description:
      page?.seo_description ||
      settings?.default_seo_description ||
      "Bekijk alle aankomende activiteiten, lezingen en evenementen van de DawahCommissie.",
  };
}

export default async function AgendaPage() {
  const [activities, iconMap, page] = await Promise.all([
    getActivities() as Promise<Activity[]>,
    getIconSettings(),
    getPageContent("agenda"),
  ]);

  const dateIcon     = resolveIconKey(iconMap, ICON_KEYS.activityDate);
  const locationIcon = resolveIconKey(iconMap, ICON_KEYS.activityLocation);

  const now      = new Date();
  const upcoming = activities.filter((a) => new Date(a.start_date) >= now);
  const past     = activities.filter((a) => new Date(a.start_date) <  now);

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
          {upcoming.length > 0 ? (
            <div className="mb-16">
              <h2 className="font-display text-2xl text-ink mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-slate-mosque rounded-full inline-block" />
                Aankomende activiteiten
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    dateIcon={dateIcon}
                    locationIcon={locationIcon}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="font-display text-2xl text-ink mb-2">
                Momenteel geen geplande activiteiten
              </h3>
              <p className="font-body text-taupe-dark">
                Houd onze pagina in de gaten voor aankomende evenementen.
              </p>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="font-display text-2xl text-ink mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-taupe/40 rounded-full inline-block" />
                Eerdere activiteiten
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
                {past.slice(0, 6).map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    dateIcon={dateIcon}
                    locationIcon={locationIcon}
                  />
                ))}
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
