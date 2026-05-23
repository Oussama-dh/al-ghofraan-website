// app/page.tsx

import type { Metadata }     from "next";
import HeroSection           from "@/components/sections/HeroSection";
import CTASection            from "@/components/sections/CTASection";
import AyahBlock             from "@/components/sections/AyahBlock";
import WhatsappCtaBlock      from "@/components/sections/WhatsappCtaBlock";
import DailyHadithBlock      from "@/components/sections/DailyHadithBlock";
import SectionTitle          from "@/components/ui/SectionTitle";
import ActivityCard          from "@/components/ui/ActivityCard";
import Container             from "@/components/ui/Container";
import Button                from "@/components/ui/Button";
import { Icon }              from "@/lib/icons";
import { PageSectionsList }  from "@/components/sections/PageSectionRenderer";
import SplitFeatureSection   from "@/components/sections/types/SplitFeatureSection";
import AyahSection           from "@/components/sections/types/AyahSection";
import WhatsappCtaSection    from "@/components/sections/types/WhatsappCtaSection";
import {
  getUpcomingActivities,
  getPageContent,
  getIconSettings,
  getSiteSettings,
  getPageSectionsWithItems,
  getHomepageVideos,
  getDailyHadithForToday,
  getDonationCampaigns,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";
import { getCampaignProgressBatch } from "@/lib/donations";
import HomepageCampaignBlock from "@/components/donation/HomepageCampaignBlock";
import { buildYouTubeEmbedUrl } from "@/lib/utils";
import type { PageSection, PageSectionItem } from "@/types/directus";

export const dynamic = "force-dynamic";

// ─── Fallback voor het missie-sectie blok ────────────────────
//
// Wordt alleen gebruikt als er in Directus geen 'mission' sectie
// staat voor page_slug='home'. Zo blijft de site er goed uitzien
// vóór de seed loopt of als Directus offline is. Bevat geen
// concrete claims (datums/locaties), alleen branding-tekst.
const FALLBACK_MISSION_SECTION: PageSection & { items: PageSectionItem[] } = {
  id: "fallback-mission",
  page_slug: "home",
  key:        "mission",
  type:       "split_feature",
  active:     true,
  sort:       10,
  eyebrow_ar:    "رسالتنا",
  title:         "Onze missie",
  intro:         "Wij geloven dat kennis, gemeenschap en dienstbaarheid de pijlers zijn van een bloeiende moslimgemeenschap.",
  card_title_ar: "الدعوة",
  card_subtitle: "Ad-Da'wa — De Uitnodiging",
  card_tags:     ["الإيمان", "العلم", "العمل"],
  items: [
    { id: "fb1", page_slug: "home", section_key: "mission", active: true, sort: 1,
      title: "Kennis verspreiden", icon: "book-open",
      description: "Door lezingen en cursussen de kennis over de islam toegankelijk maken voor iedereen." },
    { id: "fb2", page_slug: "home", section_key: "mission", active: true, sort: 2,
      title: "Gemeenschap bouwen", icon: "users",
      description: "Bruggen slaan binnen en buiten de moslimgemeenschap door ontmoeting en dialoog." },
    { id: "fb3", page_slug: "home", section_key: "mission", active: true, sort: 3,
      title: "Dienend zijn", icon: "hand-heart",
      description: "De samenleving dienen met oprechtheid en toewijding, zoals de Profeet ﷺ ons leerde." },
  ],
};

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
  const [page, activities, iconMap, sections, homepageVideos, settings, hadith, campaigns] = await Promise.all([
    getPageContent("home"),
    getUpcomingActivities(6),
    getIconSettings(),
    getPageSectionsWithItems("home"),
    getHomepageVideos(3),
    getSiteSettings(),
    getDailyHadithForToday(),
    getDonationCampaigns(),
  ]);

  // Delivery donation-campaign-progress-v2 — homepage campagne-blok.
  // Toon maximaal 2 campagnes met show_on_homepage=true. Volgorde
  // (featured DESC, sort ASC, title) komt al uit getDonationCampaigns.
  const homepageCampaigns = campaigns
    .filter((c) => c.show_on_homepage)
    .slice(0, 2);
  const homepageCampaignProgress = await getCampaignProgressBatch(
    homepageCampaigns.map((c) => c.id),
  );

  const dateIcon        = resolveIconKey(iconMap, ICON_KEYS.activityDate);
  const locationIcon    = resolveIconKey(iconMap, ICON_KEYS.activityLocation);
  const prayerTimesIcon = resolveIconKey(iconMap, ICON_KEYS.prayerTimes);

  // Activiteiten — alleen tonen wat in Directus staat. Geen demo-fallback,
  // want fake data met echte data zou bezoekers misleiden.
  const featured  = activities.filter((a) => a.featured).slice(0, 1);
  const remaining = activities.filter((a) => !a.featured).slice(0, 5);
  const shown     = [...featured, ...remaining].slice(0, 6);

  // Splits sections in: missie (boven activiteiten), overige (onder),
  // en specifieke types die hun eigen plek hebben:
  //   - ayah          → vlak onder de hero
  //   - whatsapp_cta  → tussen video's en gebedstijden-banner
  //   - cta           → helemaal onderaan vlak voor de footer
  const missionSection  = sections.find((s) => s.key === "mission" && s.type === "split_feature");
  const ayahSection     = sections.find((s) => s.type === "ayah");
  const whatsappSection = sections.find((s) => s.type === "whatsapp_cta");
  const otherSections   = sections.filter(
    (s) =>
      s.key !== "mission" &&
      s.type !== "cta" &&
      s.type !== "ayah" &&
      s.type !== "whatsapp_cta"
  );
  const ctaSections     = sections.filter((s) => s.type === "cta");

  // Als er geen missie-sectie in Directus staat, val terug op hardcoded versie
  const missionToShow = missionSection ?? FALLBACK_MISSION_SECTION;

  return (
    <>
      <HeroSection
        title={page?.title    || undefined}
        subtitle={page?.subtitle || undefined}
        intro={page?.intro    || undefined}
        arabic={page?.arabic_title || undefined}
        backgroundImage={page?.hero_background_image}
      />

      {/* Ayah-blok — prioriteit (delivery sections):
          1. page_sections type=ayah op slug=home   → beheerbaar via secties
          2. site_settings.home_ayah_enabled        → legacy site_settings (delivery A)
          3. niets                                  → geen ayah getoond */}
      {ayahSection ? (
        <AyahSection section={ayahSection} />
      ) : settings?.home_ayah_enabled && settings.home_ayah_arabic?.trim() ? (
        <section className="bg-sand-50 pt-12 pb-2">
          <Container narrow>
            <AyahBlock
              enabled={settings.home_ayah_enabled}
              arabic={settings.home_ayah_arabic}
              translation={settings.home_ayah_translation}
              reference={settings.home_ayah_reference}
            />
          </Container>
        </section>
      ) : null}

      {/* Delivery daily-hadith — Hadith van de dag, direct onder de ayah.
          Self-guarded: rendert niets zonder actieve hadith of vertaling. */}
      <DailyHadithBlock hadith={hadith} />

      {/* Delivery donation-campaign-ux — homepage campagne-blok.
          Verplaatst naar direct NA DailyHadithBlock (was na missie).
          Volgorde: hero → ayah → hadieth → campagnes → body/missie/activiteiten.
          Max 2 campagnes met show_on_homepage=true. Title/subtitel beheerbaar
          via site_settings.homepage_campaigns_title/_subtitle met fallbacks. */}
      {homepageCampaigns.length > 0 && (
        <section className="bg-sand-50 py-12 lg:py-16">
          <Container>
            <SectionTitle
              title={
                settings?.homepage_campaigns_title?.trim() ||
                "Actuele campagnes"
              }
              subtitle={
                settings?.homepage_campaigns_subtitle?.trim() ||
                "Steun een specifiek doel van de DawahCommissie"
              }
              className="mb-8"
            />
            <div className={`grid gap-4 ${homepageCampaigns.length === 1 ? "max-w-md mx-auto" : "sm:grid-cols-2"}`}>
              {homepageCampaigns.map((c) => {
                const goalCents =
                  typeof c.goal_amount_eur === "number" && c.goal_amount_eur > 0
                    ? Math.round(c.goal_amount_eur * 100)
                    : (c.goal_amount ?? 0);
                const manualCents = Math.round(
                  (c.manual_raised_amount_eur ?? 0) * 100,
                );
                const auto = homepageCampaignProgress.get(c.id) ?? {
                  autoRaisedCents:   0,
                  monthlyDonorCount: 0,
                };
                const monthlyDonorCount =
                  auto.monthlyDonorCount + (c.manual_monthly_donor_count ?? 0);

                return (
                  <HomepageCampaignBlock
                    key={c.id}
                    campaign={c}
                    autoRaisedCents={auto.autoRaisedCents}
                    monthlyDonorCount={monthlyDonorCount}
                    manualRaisedCents={manualCents}
                    goalCents={goalCents}
                  />
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {/* Body uit page_content (rich text) */}
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
              className="rich-text max-w-none"
              dangerouslySetInnerHTML={{ __html: page.body }}
            />
          </Container>
        </section>
      )}

      {/* Missie-sectie (split_feature) — uit Directus of fallback */}
      <SplitFeatureSection section={missionToShow} />

      {/* Andere secties die in Directus zijn aangemaakt (geen cta) */}
      <PageSectionsList sections={otherSections} />

      {/* Activiteiten — code-driven, niet via sections */}
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

      {/* Homepage video's — alleen tonen als beheerder show_on_homepage heeft aangevinkt.
          Geen sectie zichtbaar bij lege selectie zodat homepage er niet "incompleet" uitziet. */}
      {(() => {
        const validVideos = homepageVideos
          .map((v) => ({ video: v, embedUrl: buildYouTubeEmbedUrl(v.youtube_url) }))
          .filter((entry) => entry.embedUrl !== null);

        if (validVideos.length === 0) return null;

        return (
          <section className="bg-sand-50 py-16 lg:py-20">
            <Container>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                <SectionTitle
                  title="Video's"
                  subtitle="Lezingen, opnames en momentopnames van onze activiteiten"
                  align="left"
                />
                <Button href="/videos" variant="outline" size="sm" className="shrink-0">
                  Alle video's
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {validVideos.map(({ video, embedUrl }) => (
                  <article
                    key={video.id}
                    className="flex flex-col bg-white rounded-2xl overflow-hidden border border-sand-200 shadow-sm"
                  >
                    <div className="relative aspect-video bg-ink">
                      <iframe
                        src={embedUrl!}
                        title={video.title}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                    <div className="flex flex-col flex-1 p-5">
                      <h3 className="font-display text-lg text-ink">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="font-body text-taupe-dark text-sm leading-relaxed mt-2 flex-1 line-clamp-2">
                          {video.description}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </Container>
          </section>
        );
      })()}

      {/* WhatsApp CTA — prioriteit (delivery sections):
          1. page_sections type=whatsapp_cta op slug=home → beheerbaar via secties
          2. site_settings.homepage_whatsapp_cta_enabled  → legacy site_settings (delivery A)
          3. niets                                        → geen WhatsApp CTA */}
      {whatsappSection ? (
        <WhatsappCtaSection section={whatsappSection} />
      ) : (
        <WhatsappCtaBlock
          enabled={settings?.homepage_whatsapp_cta_enabled}
          title={settings?.homepage_whatsapp_cta_title}
          description={settings?.homepage_whatsapp_cta_description}
          buttonLabel={settings?.homepage_whatsapp_cta_button_label}
          url={settings?.homepage_whatsapp_cta_url}
        />
      )}

      {/* Gebedstijden-banner */}
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
                  Bekijk de actuele gebedstijden voor Den Haag en omgeving.
                </p>
              </div>
            </div>
            <Button href="/gebedstijden" size="md">
              Bekijk gebedstijden
            </Button>
          </div>
        </Container>
      </section>

      {/* CTA — prioriteit (delivery sections):
          1. Directus page_sections type=cta op slug=home → beheerbaar via secties (PRIMAIR)
          2. site_settings.homepage_cta_enabled            → legacy site_settings (delivery A)
          3. Hardcoded fallback "Doneer hier"              → werkt zonder Directus
      */}
      {ctaSections.length > 0 ? (
        <PageSectionsList sections={ctaSections} />
      ) : settings?.homepage_cta_enabled ? (
        <CTASection
          title={settings.homepage_cta_title || ""}
          subtitle={settings.homepage_cta_description || undefined}
          primaryCta={
            settings.homepage_cta_primary_label?.trim() &&
            settings.homepage_cta_primary_url?.trim()
              ? {
                  label: settings.homepage_cta_primary_label.trim(),
                  href:  settings.homepage_cta_primary_url.trim(),
                }
              : undefined
          }
          secondaryCta={
            settings.homepage_cta_secondary_label?.trim() &&
            settings.homepage_cta_secondary_url?.trim()
              ? {
                  label: settings.homepage_cta_secondary_label.trim(),
                  href:  settings.homepage_cta_secondary_url.trim(),
                }
              : undefined
          }
        />
      ) : (
        <CTASection
          title="Steun het werk van de DawahCommissie"
          subtitle="Uw bijdrage helpt ons om de gemeenschap te blijven dienen."
          primaryCta={{ label: "Doneer hier",     href: "/doneren" }}
          secondaryCta={{ label: "Meer over ons", href: "/dawahcommissie" }}
        />
      )}
    </>
  );
}
