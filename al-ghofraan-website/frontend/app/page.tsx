// app/page.tsx
// Homepagina — data wordt server-side opgehaald uit Directus

import type { Metadata }     from "next";
import HeroSection           from "@/components/sections/HeroSection";
import CTASection            from "@/components/sections/CTASection";
import SectionTitle          from "@/components/ui/SectionTitle";
import ActivityCard          from "@/components/ui/ActivityCard";
import Container             from "@/components/ui/Container";
import Button                from "@/components/ui/Button";
import { getUpcomingActivities } from "@/lib/directus";
import type { Activity }     from "@/types/directus";

export const metadata: Metadata = {
  title: "Home",
  description:
    "De DawahCommissie van moskee Al-Ghofraan — lezingen, activiteiten en programma's voor de moslimgemeenschap.",
};

// Revalideer elke 10 minuten
export const revalidate = 600;

// Fallback-activiteiten als Directus niet bereikbaar is
const FALLBACK_ACTIVITIES: Activity[] = [
  {
    id:                   "1",
    title:                "Vrijdagslezing",
    slug:                 "vrijdagslezing",
    description:          "Wekelijkse lezing na de vrijdagssalaat. Iedereen is welkom.",
    start_date:           new Date(Date.now() + 7 * 86400000).toISOString(),
    location:             "Moskee Al-Ghofraan",
    status:               "published",
    featured:             true,
    registration_enabled: false,
  },
  {
    id:                   "2",
    title:                "Islamitische cursus voor beginners",
    slug:                 "islamitische-cursus-beginners",
    description:          "Een toegankelijke introducties-cursus over de grondbeginselen van de islam.",
    start_date:           new Date(Date.now() + 14 * 86400000).toISOString(),
    location:             "Moskee Al-Ghofraan",
    status:               "published",
    featured:             false,
    registration_enabled: false,
  },
  {
    id:                   "3",
    title:                "Open dag voor niet-moslims",
    slug:                 "open-dag-niet-moslims",
    description:
      "Kom meer te weten over de islam, bezoek de moskee en stel al uw vragen.",
    start_date:           new Date(Date.now() + 21 * 86400000).toISOString(),
    location:             "Moskee Al-Ghofraan",
    status:               "published",
    featured:             false,
    registration_enabled: false,
  },
];

export default async function HomePage() {
  let activities: Activity[] = [];

  try {
    const result = await getUpcomingActivities(6);
    activities = (result as Activity[]);
  } catch (err) {
    console.warn("Directus niet bereikbaar — fallback-activiteiten gebruikt:", err);
    activities = FALLBACK_ACTIVITIES;
  }

  const featured   = activities.filter((a) => a.featured).slice(0, 1);
  const remaining  = activities.filter((a) => !a.featured).slice(0, 5);
  const shown      = [...featured, ...remaining].slice(0, 6);

  return (
    <>
      <HeroSection />

      {/* Missie-sectie */}
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
                  { icon: "💛", title: "Dienend zijn", text: "De samenleving dienen met oprechtheid en toewijding, zoals de Profeet ﷺ ons leerde." },
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

            {/* Decoratief kader */}
            <div className="relative hidden md:block">
              <div className="aspect-square rounded-3xl bg-slate-mosque/10 border border-taupe/20 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="font-arabic text-6xl text-slate-mosque mb-4" lang="ar">
                    الدعوة
                  </div>
                  <div className="font-body text-taupe-dark text-sm">
                    Ad-Da'wa — De Uitnodiging
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {["الإيمان", "العلم", "العمل"].map((word) => (
                      <div key={word} className="bg-white rounded-xl p-2 text-center border border-sand-200">
                        <div className="font-arabic text-lg text-slate-mosque" lang="ar">{word}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Decoratieve cirkel */}
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-taupe/20 -z-10" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-slate-mosque/20 -z-10" />
            </div>
          </div>
        </Container>
      </section>

      {/* Activiteiten-sectie */}
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
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Gebedstijden-banner */}
      <section className="bg-sand py-12">
        <Container>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-mosque/10 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                🕌
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

      {/* CTA doneren */}
      <CTASection
        title="Steun het werk van de DawahCommissie"
        subtitle="Uw bijdrage helpt ons om de gemeenschap te blijven dienen met lezingen, activiteiten en educatieve programma's."
        primaryCta={{ label: "Doneer hier", href: "/doneren" }}
        secondaryCta={{ label: "Meer over ons", href: "/dawahcommissie" }}
      />
    </>
  );
}
