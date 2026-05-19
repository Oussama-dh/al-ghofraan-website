// components/sections/types/WhatsappCtaSection.tsx
//
// Section-wrapper voor page_sections rijen met type="whatsapp_cta".
// Mapt section-velden op het bestaande presentational
// <WhatsappCtaBlock> component.
//
// Conventie veld-mapping:
//   title             → CTA-titel
//   intro             → beschrijving onder de titel
//   primary_cta_label → tekst op de WhatsApp-knop
//   primary_cta_href  → externe URL (https://...)
//
// Veiligheid (URL-validatie + target="_blank" + rel="noopener
// noreferrer") wordt door WhatsappCtaBlock zelf afgehandeld.

import type { PageSection } from "@/types/directus";
import WhatsappCtaBlock from "@/components/sections/WhatsappCtaBlock";

interface WhatsappCtaSectionProps {
  section: PageSection;
}

export default function WhatsappCtaSection({ section }: WhatsappCtaSectionProps) {
  return (
    <WhatsappCtaBlock
      enabled
      title={section.title}
      description={section.intro}
      buttonLabel={section.primary_cta_label}
      url={section.primary_cta_href}
    />
  );
}
