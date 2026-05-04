// components/sections/FaqSection.tsx
// Toont een lijst FAQ-items als <details>-accordion. Geen JS nodig.

import type { FaqItem } from "@/types/directus";
import Container        from "@/components/ui/Container";
import SectionTitle     from "@/components/ui/SectionTitle";

interface FaqSectionProps {
  items:     FaqItem[];
  title?:    string;
  subtitle?: string;
}

export default function FaqSection({
  items,
  title    = "Veelgestelde vragen",
  subtitle = "Antwoorden op de meest gestelde vragen.",
}: FaqSectionProps) {
  if (!items || items.length === 0) return null;

  // Sorteer op sort, fallback alfabetisch
  const sorted = items.slice().sort((a, b) => {
    const sa = a.sort ?? 999;
    const sb = b.sort ?? 999;
    if (sa !== sb) return sa - sb;
    return a.question.localeCompare(b.question);
  });

  return (
    <section className="bg-white py-16 lg:py-20">
      <Container narrow>
        <SectionTitle title={title} subtitle={subtitle} arabic="الأسئلة الشائعة" />

        <div className="mt-10 flex flex-col gap-3">
          {sorted.map((faq, idx) => (
            <details
              key={faq.id}
              className="group bg-sand-50 border border-sand-200 rounded-2xl px-5 py-4 open:bg-white open:shadow-sm transition-all"
              open={idx === 0}
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                <span className="font-body font-semibold text-ink text-base sm:text-lg pr-4">
                  {faq.question}
                </span>
                <span className="shrink-0 w-8 h-8 rounded-full bg-slate-mosque/10 flex items-center justify-center text-slate-mosque transition-transform group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5"  y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </summary>

              <div
                className="prose prose-sm max-w-none mt-3 font-body text-taupe-dark leading-relaxed prose-a:text-slate-mosque"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
