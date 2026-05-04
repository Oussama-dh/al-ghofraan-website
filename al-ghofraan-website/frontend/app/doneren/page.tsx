// app/doneren/page.tsx
// Placeholder-pagina voor donaties — Stripe nog NIET geïmplementeerd.

import type { Metadata } from "next";
import Container         from "@/components/ui/Container";
import SectionTitle      from "@/components/ui/SectionTitle";
import { CreditCard }    from "lucide-react";
import { Icon }          from "@/lib/icons";
import {
  getPageContent,
  getIconSettings,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";

const DONATIE_DOELEN = [
  { emoji: "📚", titel: "Educatieve programma's", beschrijving: "Lezingen, cursussen en studiemateriaal" },
  { emoji: "🕌", titel: "Moskee-activiteiten",    beschrijving: "Evenementen, open dagen en gemeenschapsbijeenkomsten" },
  { emoji: "🌍", titel: "Da'wa & outreach",       beschrijving: "Informatieverspreiding en interfaith dialoog" },
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageContent("doneren");
  return {
    title:       page?.seo_title       || "Doneren",
    description: page?.seo_description || "Steun de DawahCommissie van moskee Al-Ghofraan met een donatie.",
  };
}

export default async function DonerenPage() {
  const [page, iconMap] = await Promise.all([
    getPageContent("doneren"),
    getIconSettings(),
  ]);

  const title    = page?.title    || "Steun de DawahCommissie";
  const subtitle = page?.subtitle || "Uw bijdrage maakt een verschil voor de gehele gemeenschap";
  const intro    = page?.intro    || "Binnenkort kunt u hier veilig online doneren.";

  const donationIcon = page?.icon || resolveIconKey(iconMap, ICON_KEYS.donation);

  return (
    <>
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title={title}
            arabic="ادعم لجنة الدعوة"
            subtitle={subtitle}
            light
          />
        </Container>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f9f7f5" />
          </svg>
        </div>
      </section>

      <section className="bg-sand-50 py-12 lg:py-20">
        <Container narrow>
          <div className="bg-white rounded-3xl border border-sand-200 shadow-sm p-8 sm:p-12 text-center mb-10">
            <div className="w-20 h-20 bg-slate-mosque/10 rounded-full flex items-center justify-center text-slate-mosque mx-auto mb-6">
              <Icon name={donationIcon} className="w-10 h-10" strokeWidth={1.5} />
            </div>

            <div className="font-arabic text-2xl text-taupe mb-3" lang="ar">
              وَمَا تُنفِقُوا مِنْ خَيْرٍ فَلِأَنفُسِكُمْ
            </div>
            <p className="font-body text-xs text-taupe-dark mb-6 italic">
              &ldquo;En wat u ook aan goeds uitgeeft, dat is voor uzelf.&rdquo; &mdash; Soera Al-Baqara 2:272
            </p>

            <h2 className="font-display text-3xl text-ink mb-4">
              Binnenkort kunt u hier veilig doneren
            </h2>
            <p className="font-body text-taupe-dark text-lg leading-relaxed max-w-md mx-auto mb-8">
              {intro}
            </p>

            <div className="inline-flex items-center gap-2 bg-taupe/20 text-taupe-dark px-8 py-4 rounded-full font-body font-medium cursor-default text-base">
              <CreditCard className="w-5 h-5" strokeWidth={2} />
              Online doneren — binnenkort beschikbaar
            </div>

            <p className="font-body text-xs text-taupe mt-4">
              Wilt u nu al bijdragen? Neem contact met ons op via{" "}
              <a href="mailto:el-masoudi@hotmail.com" className="text-slate-mosque underline hover:no-underline">
                el-masoudi@hotmail.com
              </a>
            </p>
          </div>

          {page?.body && (
            <div
              className="prose prose-lg max-w-none font-body text-ink leading-relaxed prose-headings:font-display prose-headings:text-ink prose-a:text-slate-mosque mb-12"
              dangerouslySetInnerHTML={{ __html: page.body }}
            />
          )}

          <div>
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
    </>
  );
}
