// scripts/seed/steps/47-cta-ayah-reference-translation.mjs
//
// Voegt één nieuw veld toe aan `page_sections` voor de CTA-ayah-uitbreiding:
//
//   - eyebrow_translation_nl (text)
//     → Nederlandse vertaling die hoort bij `eyebrow_ar` (Arabische tekst
//       boven de titel). Primair gebruikt door type='cta' om de ayah uit
//       te breiden met vertaling onder de Arabische tekst.
//
// Bestaande velden die hergebruikt worden voor de CTA-ayah:
//   - eyebrow_ar      → Arabische ayah-tekst (al aanwezig)
//   - ayah_reference  → bronvermelding (al aanwezig sinds seed 40)
//
// Idempotent: ensureField skipt als veld al bestaat. Tweede run = no-op.
//
// Scope-grenzen:
//   - Géén wijziging aan stap 37 (navigation_items.parent).
//   - Géén heropening van stap 40 (page_sections type=ayah + whatsapp_cta).
//     Deze stap raakt alleen het VELD-niveau aan op page_sections; de
//     type-enum, voorbeeld-rijen en ayah-section-rendering uit stap 40
//     blijven volledig ongewijzigd.
//   - Géén collection-rename, géén DB-migratie.

import { ensureField } from "../lib/helpers.mjs";

const COLLECTION = "page_sections";

export async function setupCtaAyahReferenceTranslation(client) {
  console.log("\n📖 Stap 47 · CTA-ayah: vertaling-veld op page_sections");

  await ensureField(client, COLLECTION, {
    field: "eyebrow_translation_nl",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:
        "Optionele Nederlandse vertaling die hoort bij de Arabische tekst " +
        "in 'eyebrow_ar'. Wordt primair gebruikt door secties met type='cta' " +
        "om onder de Arabische ayah een vertaling te tonen. Leeg laten = " +
        "geen vertaling renderen (frontend is self-guarded).",
    },
    schema: {},
  });

  console.log("✓ Stap 47 voltooid");
}
