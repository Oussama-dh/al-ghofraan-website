// app/page.tsx

import type { Metadata }     from "next";
import HeroSection           from "@/components/sections/HeroSection";
import CTASection            from "@/components/sections/CTASection";
import SectionTitle          from "@/components/ui/SectionTitle";
import ActivityCard          from "@/components/ui/ActivityCard";
import Container             from "@/components/ui/Container";
import Button                from "@/components/ui/Button";
import { Icon }              from "@/lib/icons";
import {
  getUpcomingActivities,
  getPageContent,
  getIconSettings,
  getSiteSettings,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";
import type { Activity }     from "@/types/directus";

// Dev: altijd vers. Productie: cache 10 min.
export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 600;

const FALLBACK_ACTIVITIES: Activity[] = [
  {
    id: "1", status: "published", featured: true,  registration_enabled: false,
    title: "Vrijdagslezing", slug: "vrijdagslezing",
    description: "Wekelijkse lezing na de vrijdagssalaat.",
    start_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    location: "Moskee Al-Ghofraan",
  },
  {
    id: "2", status: "published", featured: false, registration_enabled: false,
    title: "Islamitische cursus voor beginners", slug: "islamitische-cursus-beginners",
    description: "Een toegankelijke introductiecursus over de islam.",
    start_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    location: "Moskee Al-Ghofraan",
  },
  {
    id: "3", status: "published", featured: false, registration_enabled: false,
    title: "Open dag voor niet-moslims", slug: "open-dag-niet-moslims",
    description: "Kom meer te weten over de islam, bezoek de moskee.",
    start_date: new Date(Date.now() + 21 * 86400000).toISOString(),
    location: "Moskee Al-Ghofraan",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("home"),
    getSiteSettings(),
  ]);
  return {
    title:       page?.seo_title       || settings?.default_seo_title       || "Home",
    description: page?.seo_description || settings?.default_seo_description || "De DawahCommissie van moskee Al-Ghofraan.",
  };
}

export default async function HomePage() {
  const [page, activities, iconMap] = await Promise.all([
    getPageContent("home"),
    getUpcomingActivities(6),
    getIconSettings(),
  ]);

  const dateIcon        = resolveIconKey(iconMap, ICON_KEYS.activityDate);
  const locationIcon    = resolveIconKey(iconMap, ICON_KEYS.activityLocation);
  const prayerTimesIcon = resolveIconKey(iconMap, ICON_KEYS.prayerTimes);

  const list      = activities.length > 0 ? activities : FALLBACK_ACTIVITIES;
  const featured  = list.filter((a) => a.featured).slice(0, 1);
  const remaining = list.filter((a) => !a.featured).slice(0, 5);
  const shown     = [...featured, ...remaining].slice(0, 6);

  return (
    <>
      <HeroSection
        title={page?.title    || undefined}
        subtitle={page?.subtitle || undefined}
        intro={page?.intro    || undefined}
      />

      {page?.body && (
        <section className="bg-sand-50 py-16 lg:py-20">
          <Container narrow>
            {page.icon && (
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-mosque/10 flex items-center justify-center text-slate-mosque">
                  <Icon name={page.icon} className="w-7 h-7" strokeWidth={1.75} />
                </div>
              </div>
            )}
            <div
              className="prose prose-lg max-w-none font-body text-ink leading-relaxed prose-headings:font-display prose-headings:text-ink prose-a:text-slate-mosque"
              dangerouslySetInnerHTML={{ __html: page.body }}
            />
          </Container>
        </section>
      )}

      <section className="bg-sand-50 py-16 lg:py-24">
        <Container>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <SectionTitle
                title="Onze missie"
                arabic="رسالتنا"
                align="left"
                subtitle="Wij geloven dat kennis, gemeenschap en dienstbaarheid de pijlers zijn van een bloeiende moslimgemeenschap."
              />
              <div className="mt-8 space-y-4">
                {[
                  { icon: "📖", title: "Kennis verspreiden", text: "Door lezingen en cursussen de kennis over de islam toegankelijk maken voor iedereen." },
                  { icon: "🤝", title: "Gemeenschap bouwen", text: "Bruggen slaan binnen en buiten de moslimgemeenschap door ontmoeting en dialoog." },
                  { icon: "💛", title: "Dienend zijn",       text: "De samenleving dienen met oprechtheid en toewijding, zoals de Profeet ﷺ ons leerde." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <span className="text-2xl mt-1 shrink-0">{item.icon}</span>
                    <div>
                      <h3 className="font-body font-semibold text-ink mb-1">{item.title}</h3>
                      <p className="font-body text-taupe-dark text-sm leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden md:block">
              <div className="aspect-square rounded-3xl bg-slate-mosque/10 border border-taupe/20 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="font-arabic text-6xl text-slate-mosque mb-4" lang="ar">الدعوة</div>
                  <div className="font-body text-taupe-dark text-sm">Ad-Da&apos;wa — De Uitnodiging</div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {["الإيمان", "العلم", "العمل"].map((word) => (
                      <div key={word} className="bg-white rounded-xl p-2 text-center border border-sand-200">
                        <div className="font-arabic text-lg text-slate-mosque" lang="ar">{word}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-taupe/20 -z-10" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-slate-mosque/20 -z-10" />
            </div>
          </div>
        </Container>
      </section>

      {shown.length > 0 && (
        <section className="bg-white py-16 lg:py-24">
          <Container>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <SectionTitle
                title="Aankomende activiteiten"
                subtitle="Ontdek onze lezingen, cursussen en evenementen."
                align="left"
              />
              <Button href="/agenda" variant="outline" size="sm" className="shrink-0">
                Alle activiteiten
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {shown.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  featured={activity.featured}
                  dateIcon={dateIcon}
                  locationIcon={locationIcon}
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="bg-sand py-12">
        <Container>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-mosque/10 rounded-2xl flex items-center justify-center text-slate-mosque shrink-0">
                <Icon name={prayerTimesIcon} className="w-7 h-7" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-xl text-ink">Gebedstijden</h3>
                <p className="font-body text-sm text-taupe-dark mt-0.5">
                  Bekijk de actuele gebedstijden voor uw regio
                </p>
              </div>
            </div>
            <Button href="/gebedstijden" size="md">
              Bekijk gebedstijden
            </Button>
          </div>
        </Container>
      </section>

      <CTASection
        title="Steun het werk van de DawahCommissie"
        subtitle="Uw bijdrage helpt ons om de gemeenschap te blijven dienen."
        primaryCta={{ label: "Doneer hier",     href: "/doneren" }}
        secondaryCta={{ label: "Meer over ons", href: "/dawahcommissie" }}
      />
    </>
  );
}
