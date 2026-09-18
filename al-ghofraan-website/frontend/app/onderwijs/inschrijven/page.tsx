// app/onderwijs/inschrijven/page.tsx
//
// Inschrijfpagina Koranonderwijs. Vaste route: wint van /onderwijs/[slug].
// Het formulier zelf is een client-component; de API-route is
// /api/onderwijs/inschrijven.

import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/sections/PageHero";
import QuranRegistrationForm from "@/components/registration/QuranRegistrationForm";

export const metadata: Metadata = {
  title: "Inschrijven Koranonderwijs",
  description:
    "Schrijf uw kind in voor het Koranonderwijs van de DawahCommissie van moskee Al-Ghofraan.",
};

export default function KoranonderwijsInschrijvenPage() {
  return (
    <>
      <PageHero
        title="Inschrijven Koranonderwijs"
        subtitle="Vul het formulier in om uw kind in te schrijven"
      />
      <section className="py-10 sm:py-14">
        <Container narrow>
          <QuranRegistrationForm />
        </Container>
      </section>
    </>
  );
}
