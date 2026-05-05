// app/agenda/page.tsx

import type { Metadata }  from "next";
import SectionTitle       from "@/components/ui/SectionTitle";
import ActivityCard       from "@/components/ui/ActivityCard";
import Container          from "@/components/ui/Container";
import {
  getActivities,
  getIconSettings,
  getSiteSettings,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";
import type { Activity }  from "@/types/directus";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title:       "Agenda",
    description:
      settings?.default_seo_description ||
      "Bekijk alle aankomende activiteiten, lezingen en evenementen van de DawahCommissie.",
  };
}

export default async function AgendaPage() {
  const [activities, iconMap] = await Promise.all([
    getActivities() as Promise<Activity[]>,
    getIconSettings(),
  ]);

  const dateIcon     = resolveIconKey(iconMap, ICON_KEYS.activityDate);
  const locationIcon = resolveIconKey(iconMap, ICON_KEYS.activityLocation);

  const now      = new Date();
  const upcoming = activities.filter((a) => new Date(a.start_date) >= now);
  const past     = activities.filter((a) => new Date(a.start_date) <  now);

  return (
    <>
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title="Agenda & Activiteiten"
            arabic="الأنشطة والفعاليات"
            subtitle="Lezingen, cursussen en evenementen van de DawahCommissie"
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
