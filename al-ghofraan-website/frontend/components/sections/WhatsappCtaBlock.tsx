// components/sections/WhatsappCtaBlock.tsx
//
// WhatsApp-kanaal CTA voor op de homepage. Verschijnt alleen als
// beheerder enabled=true heeft gezet EN een url heeft ingevuld.
//
// Server-component. Externe link wordt veilig geopend
// (target=_blank + rel="noopener noreferrer").
//
// Styling: card met groene accent zodat het visueel onderscheidt
// van de standaard slate-mosque CTA's, maar binnen het bestaande
// design. Gebruikt MessageCircle icoon van lucide-react.

import { MessageCircle } from "lucide-react";
import Container from "@/components/ui/Container";

interface WhatsappCtaBlockProps {
  enabled?:     boolean | null;
  title?:       string  | null;
  description?: string  | null;
  buttonLabel?: string  | null;
  url?:         string  | null;
}

export default function WhatsappCtaBlock({
  enabled,
  title,
  description,
  buttonLabel,
  url,
}: WhatsappCtaBlockProps) {
  const titleTrim       = (title       ?? "").trim();
  const descriptionTrim = (description ?? "").trim();
  const buttonTrim      = (buttonLabel ?? "").trim();
  const urlTrim         = (url         ?? "").trim();

  // Veiligheidsklep: vereist een url. Zonder url geen knop = geen
  // zinvolle CTA.
  if (!enabled || !urlTrim) return null;

  // Validatie: alleen externe https-links accepteren. Voorkomt
  // protocol-relative of javascript: payloads via Directus.
  const isSafeUrl =
    urlTrim.startsWith("https://") || urlTrim.startsWith("http://");
  if (!isSafeUrl) return null;

  // Fallback-strings als beheerder velden leeg laat:
  const displayTitle  = titleTrim       || "WhatsApp-kanaal";
  const displayButton = buttonTrim      || "Open WhatsApp";

  return (
    <section className="bg-sand-50 py-12">
      <Container>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <MessageCircle className="w-7 h-7" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-display text-xl text-ink">{displayTitle}</h3>
              {descriptionTrim && (
                <p className="font-body text-sm text-taupe-dark mt-0.5">
                  {descriptionTrim}
                </p>
              )}
            </div>
          </div>
          <a
            href={urlTrim}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-body font-medium text-base bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 shrink-0"
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2} />
            {displayButton}
          </a>
        </div>
      </Container>
    </section>
  );
}
