// components/registration/RegistrationFormReveal.tsx
"use client";

//
// Kleine client-component die het inschrijfformulier verbergt tot de
// bezoeker op "Inschrijven" klikt. Wordt alleen gebruikt op
// /onderwijs/[slug] wanneer het programma `show_registration_form_immediately`
// = false heeft.
//
// Gedrag:
//   - initial render: alleen de CTA-balk met de knop
//   - na klik: CTA verdwijnt, formulier verschijnt + scroll naar ankerpunt
//
// Hydration-veilig: zowel server- als client-render starten met
// `revealed = false`. We gebruiken geen `localStorage`, geen
// `window`-checks tijdens render, en geen useEffect die de state
// flippelt.
//

import { useState, useRef, type ReactNode } from "react";
import Button from "@/components/ui/Button";

interface Props {
  /** Tekst op de "Inschrijven"-knop. */
  buttonLabel: string;
  /** ID van het ankerpunt waar naartoe gescrolld wordt na onthullen. */
  anchorId?: string;
  /** Het inschrijfformulier (server-rendered, lui geactiveerd). */
  children: ReactNode;
}

export default function RegistrationFormReveal({
  buttonLabel,
  anchorId = "inschrijven",
  children,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  function handleReveal() {
    setRevealed(true);
    // Zachtjes scrollen naar het formulier zodra het in de DOM staat.
    // requestAnimationFrame zorgt dat we wachten op de re-render.
    requestAnimationFrame(() => {
      const target =
        document.getElementById(anchorId) ?? wrapperRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (!revealed) {
    return (
      <div className="my-10 p-6 bg-white border border-sand-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-display text-xl text-ink">
            Klaar om in te schrijven?
          </h3>
          <p className="font-body text-sm text-taupe-dark mt-1">
            Klik op de knop om het inschrijfformulier te openen.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="shrink-0"
          onClick={handleReveal}
        >
          {buttonLabel}
        </Button>
      </div>
    );
  }

  return <div ref={wrapperRef}>{children}</div>;
}
