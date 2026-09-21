// lib/faqGroups.ts
//
// Groepering van onderwijs-FAQ's voor de aparte pagina
// /onderwijs/[slug]/veelgestelde-vragen. Gedeeld door die pagina en de
// programmapagina (die alleen een link toont bij veel vragen).

import type { EducationProgramFaq } from "@/types/directus";

/** Tot dit aantal blijven de vragen onderaan de programmapagina staan; daarboven komt er een link. */
export const FAQ_INLINE_MAX = 5;

/** Kopje voor vragen zonder categorie (staat altijd onderaan). */
export const UNCATEGORIZED_TITLE = "Overige vragen";

export interface FaqGroup {
  id:    string;
  title: string;
  items: EducationProgramFaq[];
}

/**
 * Groepeert per `category`. Volgorde van de groepen = eerste voorkomen
 * (de lijst is al gesorteerd op `sort`); vragen zonder categorie komen in
 * een laatste groep. Volgorde binnen een groep blijft behouden.
 */
export function groupFaqs(faqs: EducationProgramFaq[]): FaqGroup[] {
  const groups: FaqGroup[] = [];
  const byTitle = new Map<string, FaqGroup>();
  const rest: EducationProgramFaq[] = [];

  for (const faq of faqs) {
    const title = (faq.category || "").trim();
    if (!title) {
      rest.push(faq);
      continue;
    }
    let group = byTitle.get(title);
    if (!group) {
      group = { id: `groep-${groups.length + 1}`, title, items: [] };
      byTitle.set(title, group);
      groups.push(group);
    }
    group.items.push(faq);
  }

  if (rest.length > 0) {
    groups.push({ id: `groep-${groups.length + 1}`, title: UNCATEGORIZED_TITLE, items: rest });
  }
  return groups;
}
