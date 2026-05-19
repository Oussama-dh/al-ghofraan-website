// app/agenda/page.tsx

import type { Metadata }  from "next";
import Link              from "next/link";
import { CalendarRange } from "lucide-react";
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
import {
  isRecurringActivity,
  getNextActivityOccurrence,
  describeRecurrence,
} from "@/lib/recurrence";

export const dynamic = "force-dynamic";

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

  // Delivery recurring — een terugkerende activiteit telt als "upcoming"
  // zolang er nog een occurrence in de toekomst ligt. Niet-recurring valt
  // terug op het oude criterium (start_date >= now).
  const upcoming: Activity[] = [];
  const past:     Activity[] = [];
  for (const a of activities) {
    if (isRecurringActivity(a)) {
      const next = getNextActivityOccurrence(a, now);
      if (next) upcoming.push(a);
      else      past.push(a);
    } else {
      if (new Date(a.start_date) >= now) upcoming.push(a);
      else                                past.push(a);
    }
  }

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
          {/* Delivery recurring — knop naar de nieuwe overzichtspagina,
              waar bezoekers alle occurrences chronologisch zien. */}
          <div className="mb-8 flex justify-end">
            <Link
              href="/agenda/overzicht"
              className="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2 font-body text-sm text-ink hover:border-slate-mosque hover:text-slate-mosque transition-colors"
            >
              <CalendarRange size={16} strokeWidth={2} />
              Bekijk volledige agenda
            </Link>
          </div>

          {upcoming.length > 0 ? (
            <div className="mb-16">
              <h2 className="font-display text-2xl text-ink mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-slate-mosque rounded-full inline-block" />
                Aankomende activiteiten
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map((activity) => {
                  // Voor terugkerende activiteiten: toon de eerstvolgende
                  // occurrence-datum ipv de (vaak verouderde) start_date
                  // van het hoofdrecord.
                  const recurring = isRecurringActivity(activity);
                  const nextOcc   = recurring ? getNextActivityOccurrence(activity, now) : null;
                  return (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      dateIcon={dateIcon}
                      locationIcon={locationIcon}
                      overrideStart={nextOcc?.start}
                      recurrenceLabel={recurring ? describeRecurrence(activity) : undefined}
                    />
                  );
                })}
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
