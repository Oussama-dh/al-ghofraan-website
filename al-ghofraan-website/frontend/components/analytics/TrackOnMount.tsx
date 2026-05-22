// components/analytics/TrackOnMount.tsx
//
// Client-component dat één GA4-event afvuurt zodra het mount (eenmalig
// per page-load). Bedoeld voor "view"-style events zoals activity_view
// of donation_success.
//
// Gebruik in server-page:
//   <TrackOnMount event="activity_view" params={{ activity_slug: slug }} />
//   <TrackOnMount event="donation_success" />
//
// Het component rendert niets visueels. Faalt stil bij ontbrekende
// gtag (TV-route, ad-blocker, SSR-mismatch).

"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsEventParams } from "@/lib/analytics";

type Props = {
  event:   AnalyticsEventName;
  params?: AnalyticsEventParams;
};

export default function TrackOnMount({ event, params }: Props) {
  useEffect(() => {
    trackEvent(event, params);
    // We willen dit echt maar 1x per mount — params-veranderingen
    // tellen niet als nieuwe view. Disable de exhaustive-deps lint
    // voor deze specifieke use-case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
