// app/doneren/page.tsx

import type { Metadata } from "next";
import Container         from "@/components/ui/Container";
import PageHero          from "@/components/sections/PageHero";
import { Icon }          from "@/lib/icons";
import { PageSectionsList } from "@/components/sections/PageSectionRenderer";
import DonationForm      from "@/components/donation/DonationForm";
import {
  getPageContent,
  getIconSettings,
  getSiteSettings,
  getPageSectionsWithItems,
  getDonationCampaigns,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 600;

const DONATIE_DOELEN = [
  { emoji: "📚", titel: "Educatieve programma's", beschrijving: "Lezingen, cursussen en studiemateriaal" },
  { emoji: "🕌", titel: "Moskee-activiteiten",    beschrijving: "Evenementen, open dagen en gemeenschapsbijeenkomsten" },
  { emoji: "🌍", titel: "Da'wa & outreach",       beschrijving: "Informatieverspreiding en interfaith dialoog" },
];

interface Props {
  searchParams?: { geannuleerd?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("doneren"),
    getSiteSettings(),
  ]);
  return {
    title:       page?.seo_title       || settings?.default_seo_title       || "Doneren",
    description: page?.seo_description || settings?.default_seo_description || "Steun de DawahCommissie van moskee Al-Ghofraan.",
  };
}

export default async function DonerenPage({ searchParams }: Props) {
  const [page, iconMap, settings, sections, campaigns] = await Promise.all([
    getPageContent("doneren"),
    getIconSettings(),
    getSiteSettings(),
    getPageSectionsWithItems("doneren"),
    getDonationCampaigns(),
  ]);

  const title       = page?.title    || "Steun de DawahCommissie";
  const subtitle    = page?.subtitle || "Uw bijdrage maakt een verschil voor de gehele gemeenschap";
  const arabicTitle = page?.arabic_title || "ادعم لجنة الدعوة";
  const intro    = page?.intro;

  const donationIcon = page?.icon || resolveIconKey(iconMap, ICON_KEYS.donation);

  const ctaSections   = sections.filter((s) => s.type === "cta");
  const otherSections = sections.filter((s) => s.type !== "cta");

  const cancelled = searchParams?.geannuleerd === "1";

  return (
    <>
      <PageHero
        title={title}
        arabic={arabicTitle}
        subtitle={subtitle}
        backgroundImage={page?.hero_background_image}
      />

      <section className="bg-sand-50 py-12 lg:py-20">
        <Container narrow>
          {/* Quran-vers + intro */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-slate-mosque/10 rounded-full flex items-center justify-center text-slate-mosque mx-auto mb-5">
              <Icon name={donationIcon} className="w-8 h-8" strokeWidth={1.5} />
            </div>

            <div className="font-arabic text-2xl text-taupe mb-3" lang="ar">
              وَمَا تُنفِقُوا مِنْ خَيْرٍ فَلِأَنفُسِكُمْ
            </div>
            <p className="font-body text-xs text-taupe-dark mb-4 italic">
              &ldquo;En wat u ook aan goeds uitgeeft, dat is voor uzelf.&rdquo; &mdash; Soera Al-Baqara 2:272
            </p>

            {intro && (
              <p className="font-body text-taupe-dark text-base leading-relaxed max-w-md mx-auto">
                {intro}
              </p>
            )}
          </div>

          {/* Geannuleerd-melding */}
          {cancelled && (
            <div
              className="mb-6 p-4 rounded-lg bg-taupe/10 border border-taupe/20 text-ink font-body text-sm text-center"
              role="status"
            >
              De betaling is geannuleerd. Geen bedrag is afgeschreven — u kunt het opnieuw proberen wanneer u wilt.
            </div>
          )}

          {/* Donatie­formulier */}
          <DonationForm campaigns={campaigns} />

          {/* Beheerbare body uit Directus */}
          {page?.body && (
            <div
              className="rich-text max-w-none mt-12"
              dangerouslySetInnerHTML={{ __html: page.body }}
            />
          )}

          {/* Doelen */}
          <div className="mt-14">
            <h3 className="font-display text-2xl text-ink mb-6 text-center">
              Waarvoor wordt uw bijdrage gebruikt?
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {DONATIE_DOELEN.map((doel) => (
                <div key={doel.titel} className="bg-white rounded-2xl border border-sand-200 p-6 text-center">
                  <div className="text-4xl mb-3">{doel.emoji}</div>
                  <h4 className="font-body font-semibold text-ink mb-2">{doel.titel}</h4>
                  <p className="font-body text-taupe-dark text-sm leading-relaxed">{doel.beschrijving}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="font-arabic text-3xl text-slate-mosque" lang="ar">
              جزاكم الله خيرًا
            </p>
            <p className="font-body text-taupe-dark text-sm mt-1">
              Moge Allah u belonen met het goede
            </p>
          </div>
        </Container>
      </section>

      {/* Beheerbare sections uit Directus (geen cta) */}
      <PageSectionsList sections={otherSections} />

      {/* CTA-sections altijd onderaan */}
      <PageSectionsList sections={ctaSections} />
    </>
  );
}
