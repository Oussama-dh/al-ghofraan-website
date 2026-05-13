// components/sections/PageHero.tsx
//
// Delivery 16 — Herbruikbare page-hero voor subpages (en `/[slug]`).
//
// Vervangt de eerder verspreide inline-blokken van het type:
//   <section className="bg-slate-mosque py-16 relative overflow-hidden">
//     <div className="absolute inset-0 pattern-overlay" />
//     <Container className="relative z-10">
//       <SectionTitle title=... arabic=... subtitle=... light />
//     </Container>
//     <div className="absolute bottom-0 ..."><svg .../></div>
//   </section>
//
// Wijzigingen t.o.v. die oude vorm:
//   - Geen pattern-overlay meer (de "plusjes" decoratie is verwijderd).
//   - Optionele `backgroundImage` (uuid van een directus_files entry).
//     Bij aanwezigheid: image als achtergrond met bg-black/40 overlay voor
//     leesbaarheid. Bij afwezigheid: huidige slate-mosque kleur-hero.
//   - Wave-overgang onderaan blijft (geeft de natuurlijke overgang naar de
//     sand-50 body — hoort bij de huidige sfeer).
//
// Niet hier geregeld:
//   - De homepage hero (`HeroSection.tsx`) heeft een eigen design met
//     Bismillah, gradient en grote CTA-knoppen. Dat blijft een aparte
//     component (alleen daar wordt het pattern + driehoek-blok verwijderd).
//   - Detail-pagina's `/agenda/[slug]`, `/onderwijs/[slug]`,
//     `/artikelen/[slug]` hebben een hero met opacity-20 image-overlay
//     specifiek voor de activiteit/programma-afbeelding (delivery 12 styling).
//     Die blijven hun eigen inline-structuur houden.

import Container             from "@/components/ui/Container";
import SectionTitle          from "@/components/ui/SectionTitle";
import { getAssetUrl }       from "@/lib/directus";

interface PageHeroProps {
  title:           string;
  subtitle?:       string | null;
  arabic?:         string | null;
  /** UUID of file-object van directus_files. Optioneel — zonder image: kleur-hero. */
  backgroundImage?: string | { id?: string } | null;
}

export default function PageHero({
  title,
  subtitle,
  arabic,
  backgroundImage,
}: PageHeroProps) {
  // getAssetUrl retourneert "" als er geen file is — daar nemen we de
  // kleur-hero als fallback.
  const imageUrl = getAssetUrl(backgroundImage as never);
  const hasImage = imageUrl.length > 0;

  return (
    <section className="bg-slate-mosque py-16 relative overflow-hidden">
      {/* Achtergrondafbeelding — alleen als ingesteld. bg-black/40 zorgt voor
          leesbaarheid van de witte tekst over wisselende afbeeldingen.
          eslint-disable: gebruik <img> i.p.v. next/image, zoals project-breed
          gebruikelijk voor Directus assets (Docker fetch-quirk uit handoff). */}
      {hasImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        </>
      )}

      <Container className="relative z-10">
        <SectionTitle
          title={title}
          arabic={arabic || undefined}
          subtitle={subtitle || undefined}
          light
        />
      </Container>

      {/* Wave-overgang onderaan — bewust behouden. Geeft de natuurlijke
          overgang naar de sand-50 body en hoort bij de huidige sfeer. */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 40"
          fill="none"
          preserveAspectRatio="none"
          className="w-full"
        >
          <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f9f7f5" />
        </svg>
      </div>
    </section>
  );
}
