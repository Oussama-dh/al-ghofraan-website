// scripts/seed/steps/42-occurrence-picker-toggle.mjs
//
// Delivery — recurring UX corrections.
//
// Voegt één boolean veld toe aan `activities`:
//   - show_occurrence_picker (boolean, default false)
//
// Gedrag in frontend (samengevat — zie app/agenda/[slug]/page.tsx en
// app/api/inschrijven/route.ts voor uitvoering):
//
//   show_occurrence_picker = false (default):
//     - Bezoeker ziet GEEN "Kies een datum"-blok op detailpagina.
//     - Eerstvolgende occurrence wordt automatisch gebruikt voor de
//       agenda-knop en de inschrijving (server-side picked).
//     - Hero toont "Eerstvolgend: …" zodat bezoeker weet welke datum.
//     - Mails tonen occurrence_label zoals altijd.
//
//   show_occurrence_picker = true:
//     - Bestaand gedrag — bezoeker kiest datum, alle export en
//       inschrijving gebruikt die keuze.
//
// Backward compatibility:
//   - Bestaande activiteiten krijgen default false → geen zichtbare
//     wijziging op detailpagina's. Recurring activiteiten gaan
//     automatisch over op de "verborgen picker"-flow.
//   - Voor activiteiten die met de eerdere recurring-delivery al
//     waren geconfigureerd: zet show_occurrence_picker=true in
//     Directus admin om het oude gedrag terug te krijgen.
//
// Idempotent: ensureField skipt als veld al bestaat.

import { ensureField } from "../lib/helpers.mjs";

export async function setupOccurrencePickerToggle(client) {
  console.log("\n🗓  Stap 42 · show_occurrence_picker toggle op activities");

  await ensureField(client, "activities", {
    field: "show_occurrence_picker",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Alleen relevant voor terugkerende activiteiten (is_recurring=true). " +
        "Wanneer aan: bezoeker ziet een 'Kies een datum'-blok op de detailpagina. " +
        "Wanneer uit (default): de eerstvolgende datum wordt automatisch gebruikt " +
        "voor inschrijving en agenda-export — bezoeker ziet welke datum dat is " +
        "in de pagina-header.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  console.log("✓ Stap 42 voltooid");
}
