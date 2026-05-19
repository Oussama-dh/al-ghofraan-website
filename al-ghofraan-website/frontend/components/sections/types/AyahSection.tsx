// components/sections/types/AyahSection.tsx
//
// Section-wrapper voor page_sections rijen met type="ayah".
// Mapt section.ayah_arabic / section.intro / section.ayah_reference
// op het bestaande presentational <AyahBlock> component.
//
// Conventie veld-mapping:
//   ayah_arabic     → Arabische tekst (RTL)
//   intro           → Nederlandse vertaling (optioneel)
//   ayah_reference  → bronvermelding (optioneel)
//
// Layout: gecentreerde blok op zand-achtergrond, narrow container —
// zelfde toon als het oude site_settings-gestuurde blok op de homepage.
//
// Server-component. Toont niets als ayah_arabic leeg is (extra
// veiligheid bovenop AyahBlock's eigen guard).
//
// Toelichting render-keuze:
//   - Op /doneren wordt deze section NIET via PageSectionRenderer
//     gerenderd, want daar moet het ayah-blok bewust BOVEN het
//     donatieformulier komen (op een eigen vaste plek). De
//     doneren-pagina mapt de section dus direct op <AyahBlock />.
//   - Op /home wordt deze section wel via de generieke renderer
//     opgepakt.

import type { PageSection } from "@/types/directus";
import Container from "@/components/ui/Container";
import AyahBlock from "@/components/sections/AyahBlock";

interface AyahSectionProps {
  section: PageSection;
}

export default function AyahSection({ section }: AyahSectionProps) {
  const arabic      = (section.ayah_arabic    ?? "").trim();
  const translation = (section.intro          ?? "").trim();
  const reference   = (section.ayah_reference ?? "").trim();

  // Niets te tonen — render geen lege section.
  if (!arabic) return null;

  return (
    <section className="bg-sand-50 pt-12 pb-2">
      <Container narrow>
        <AyahBlock
          enabled
          arabic={arabic}
          translation={translation}
          reference={reference}
        />
      </Container>
    </section>
  );
}
