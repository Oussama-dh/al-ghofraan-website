// scripts/seed/steps/06-faq.mjs

import { upsertItem } from "../lib/helpers.mjs";

export async function seedFaq(client) {
  console.log("\n❓ Stap 6 · FAQ-items");

  const faqs = [
    {
      question: "Wanneer zijn de wekelijkse lezingen?",
      answer:
        "<p>De wekelijkse lezingen vinden plaats op vrijdagen, direct na de " +
        "vrijdagsalaat (Salat al-Jumu'ah). De exacte tijden hangen af van het seizoen — " +
        "kijk op onze <a href=\"/gebedstijden\">gebedstijdenpagina</a> voor het juiste tijdstip.</p>",
      category:  "Activiteiten",
      sort:      10,
      published: true,
    },
    {
      question: "Kan ik als niet-moslim ook deelnemen aan jullie activiteiten?",
      answer:
        "<p>Ja, zeker! Veel van onze activiteiten zijn toegankelijk voor iedereen, " +
        "ongeacht achtergrond of religie. Wij organiseren regelmatig open dagen en " +
        "lezingen specifiek voor niet-moslims die meer willen weten over de islam. " +
        "Bekijk onze <a href=\"/agenda\">agenda</a> of neem contact met ons op.</p>",
      category:  "Algemeen",
      sort:      20,
      published: true,
    },
  ];

  for (const faq of faqs) {
    await upsertItem(client, "faq_items", "question", faq.question, faq);
  }

  console.log("✓ Stap 6 voltooid");
}
