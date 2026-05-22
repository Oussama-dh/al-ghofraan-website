// components/analytics/TrackedLink.tsx
//
// Client-component wrapper rond een link (next/Link of plain <a>) die
// een GA4-event afvuurt bij klik. Bestaande styling, className en
// children blijven onveranderd; alleen onClick is toegevoegd.
//
// Gebruik:
//   <TrackedLink href="/doneren" event="donate_click" params={{ source: "header" }}>
//     Doneer
//   </TrackedLink>
//
//   <TrackedLink
//     href="https://wa.me/..."
//     event="contact_click"
//     params={{ source: "footer", button_label: "WhatsApp" }}
//     external
//   >
//     WhatsApp
//   </TrackedLink>
//
// Privacy: doorgegeven params worden gesanitiseerd door trackEvent
// (whitelist + max 100 chars). Geef GEEN persoonsgegevens of vrije
// tekst mee.

"use client";

import Link            from "next/link";
import type { ReactNode, MouseEvent, AnchorHTMLAttributes } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsEventParams } from "@/lib/analytics";

type Props = {
  href:      string;
  event:     AnalyticsEventName;
  params?:   AnalyticsEventParams;
  external?: boolean;
  children:  ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">;

export default function TrackedLink({
  href,
  event,
  params,
  external,
  children,
  ...rest
}: Props) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // Track eerst, dan laat de browser de navigatie doen.
    // trackEvent is sync en faalt stil; nooit preventDefault gebruiken.
    trackEvent(event, params);
    // Eventuele eigen onClick van de gebruiker is niet ondersteund —
    // wordt bewust niet doorgegeven om de oppervlakte klein te houden.
    void e;
  }

  // Externe links (WhatsApp, mailto:, tel:, https://) gebruiken native <a>.
  // Interne app-routes gebruiken next/Link voor client-side navigation.
  if (external || /^(https?:|mailto:|tel:|wa\.me)/i.test(href)) {
    return (
      <a href={href} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
