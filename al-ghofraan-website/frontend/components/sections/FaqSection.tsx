// components/sections/FaqSection.tsx

import { Plus } from "lucide-react";
import type { FaqItem } from "@/types/directus";
import Container        from "@/components/ui/Container";
import SectionTitle     from "@/components/ui/SectionTitle";
import { Icon }         from "@/lib/icons";

interface FaqSectionProps {
  items:        FaqItem[];
  title?:       string;
  subtitle?:    string;
  /** Standaardicoon als een FAQ-item geen eigen icoon heeft */
  defaultIcon?: string;
}

export default function FaqSection({
  items,
  title       = "Veelgestelde vragen",
  subtitle    = "Antwoorden op de meest gestelde vragen.",
  defaultIcon = "message-circle",
}: FaqSectionProps) {
  if (!items || items.length === 0) return null;

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
                <span className="flex items-center gap-3 font-body font-semibold text-ink text-base sm:text-lg pr-4">
                  <Icon
                    name={faq.icon || defaultIcon}
                    className="w-5 h-5 text-slate-mosque shrink-0"
                  />
                  {faq.question}
                </span>
                <span className="shrink-0 w-8 h-8 rounded-full bg-slate-mosque/10 flex items-center justify-center text-slate-mosque transition-transform group-open:rotate-45">
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </span>
              </summary>

              <div
                className="rich-text rich-text--sm max-w-none mt-3"
                dangerouslySetInnerHTML={{ __html: faq.answer }}
              />
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
