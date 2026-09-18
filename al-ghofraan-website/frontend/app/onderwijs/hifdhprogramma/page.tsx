// app/onderwijs/hifdhprogramma/page.tsx
//
// Inschrijfpagina Hifdh programma. Vaste route: wint van /onderwijs/[slug].
// Het formulier zelf is een client-component; de API-route is
// /api/onderwijs/inschrijven. De oude route /onderwijs/inschrijven is een
// permanente redirect naar deze pagina (zie next.config.mjs).

import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/sections/PageHero";
import QuranRegistrationForm from "@/components/registration/QuranRegistrationForm";
import { HIFDH_PROGRAM_TITLE } from "@/lib/educationRoutes";

export const metadata: Metadata = {
  title: `Inschrijven ${HIFDH_PROGRAM_TITLE}`,
  description:
    "Schrijf uw kind of kinderen in voor het Hifdh programma van de DawahCommissie van moskee Al-Ghofraan.",
};

export default function HifdhProgrammaPage() {
  return (
    <>
      <PageHero
        title={HIFDH_PROGRAM_TITLE}
        subtitle="Vul het formulier in om uw kind of kinderen in te schrijven"
      />
      <section className="py-10 sm:py-14">
        <Container narrow>
          <QuranRegistrationForm />
        </Container>
      </section>
    </>
  );
}
