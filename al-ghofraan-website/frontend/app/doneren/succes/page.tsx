// app/doneren/succes/page.tsx
//
// Bedankpagina ná Stripe Checkout. Toont generieke bevestiging.
// Geen gevoelige Stripe-data — geen bedrag, geen kaartgegevens.
//
// session_id staat in URL maar we tonen 'm niet; webhooks regelen status-update.

import type { Metadata } from "next";
import Link              from "next/link";
import Container         from "@/components/ui/Container";
import { CheckCircle }   from "lucide-react";
import TrackOnMount      from "@/components/analytics/TrackOnMount";

export const metadata: Metadata = {
  title:       "Bedankt voor uw donatie",
  description: "Uw donatie is ontvangen.",
  robots:      { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function DonatieSuccesPage() {
  return (
    <section className="bg-sand-50 py-20 min-h-[60vh] flex items-center">
      {/* GA4 event — donation_success bij elke load van de succes-pagina.
          Privacy: géén bedrag, géén Stripe session_id, géén donor-info. */}
      <TrackOnMount event="donation_success" />
      <Container narrow>
        <div className="bg-white rounded-3xl border border-sand-200 shadow-sm p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
            <CheckCircle className="w-12 h-12" strokeWidth={1.5} />
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-ink mb-3">
            Hartelijk dank voor uw donatie
          </h1>

          <p className="font-arabic text-2xl text-slate-mosque mb-2" lang="ar">
            جزاكم الله خيرًا
          </p>
          <p className="font-body text-taupe-dark text-sm italic mb-6">
            Moge Allah u belonen met het goede
          </p>

          <p className="font-body text-taupe-dark leading-relaxed max-w-lg mx-auto mb-8">
            Uw bijdrage is succesvol ontvangen. U ontvangt een betalingsbevestiging
            van Stripe op het opgegeven e-mailadres. Met uw steun blijft de
            DawahCommissie van moskee Al-Ghofraan haar werk voortzetten voor de
            gemeenschap.
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-slate-mosque text-white font-body font-medium hover:bg-slate-dark transition-colors"
          >
            Terug naar home
          </Link>
        </div>
      </Container>
    </section>
  );
}
