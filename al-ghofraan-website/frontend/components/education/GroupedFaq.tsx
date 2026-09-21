// components/education/GroupedFaq.tsx
//
// Veelgestelde vragen per groep, in accordeon-stijl (zelfde look als
// FaqSection). Gebruikt op /onderwijs/[slug]/veelgestelde-vragen.

import { Plus } from "lucide-react";
import type { FaqGroup } from "@/lib/faqGroups";

export default function GroupedFaq({ groups }: { groups: FaqGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-12">
      {/* Sprongmenu (alleen zinvol bij meer dan één groep) */}
      {groups.length > 1 && (
        <nav aria-label="Onderwerpen" className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="inline-flex items-center min-h-[44px] px-4 rounded-full border border-sand-200 bg-white font-body text-sm text-ink hover:bg-sand-100 transition-colors"
            >
              {g.title}
            </a>
          ))}
        </nav>
      )}

      {groups.map((group) => (
        <section key={group.id} id={group.id} aria-labelledby={`${group.id}-titel`} className="scroll-mt-24">
          <h2 id={`${group.id}-titel`} className="font-display text-2xl text-ink mb-4">
            {group.title}
          </h2>
          <div className="flex flex-col gap-3">
            {group.items.map((faq) => (
              <details
                key={faq.id}
                id={`vraag-${faq.id}`}
                className="group bg-sand-50 border border-sand-200 rounded-2xl px-5 py-4 open:bg-white open:shadow-sm transition-all scroll-mt-24"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none min-h-[44px]">
                  <span className="font-body font-semibold text-ink text-base sm:text-lg pr-4">
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
        </section>
      ))}
    </div>
  );
}
