// scripts/seed/steps/01f-page-slug-input.mjs
//
// Zet het page_slug veld in page_sections en page_section_items
// om van een dropdown (select-dropdown met vaste opties) naar een
// vrij tekstveld (input).
//
// Idempotent: PATCH op het veld-meta is veilig om meerdere keren te
// draaien. Bestaande data (de waarden zelf) blijft volledig intact —
// we wijzigen alleen de meta (interface, options, note).

const TARGETS = [
  {
    collection: "page_sections",
    note: "Slug van de pagina waarop deze sectie verschijnt. Bv. 'home', 'dawahcommissie', 'doneren', 'gebedstijden', 'jongeren'. Moet exact overeenkomen met de URL.",
  },
  {
    collection: "page_section_items",
    note: "Slug van de pagina. Moet exact gelijk zijn aan de page_slug van de sectie waarbij dit item hoort.",
  },
];

export async function setupPageSlugInput(client) {
  console.log("\n🔤 Stap 1f · page_slug → vrije tekstinvoer");

  for (const { collection, note } of TARGETS) {
    // Eerst checken: bestaat het veld? (als 01d nog niet gedraaid is, slaan we over)
    let existing;
    try {
      existing = await client.get(`/fields/${collection}/page_slug`);
    } catch {
      console.log(`  · ${collection}.page_slug bestaat nog niet — overgeslagen`);
      continue;
    }

    const currentInterface = existing?.data?.meta?.interface;

    // Als het al "input" is, niets te doen
    if (currentInterface === "input") {
      console.log(`  · ${collection}.page_slug is al een vrij tekstveld`);
      continue;
    }

    // Patch de meta: interface naar input, opties weg
    try {
      await client.patch(`/fields/${collection}/page_slug`, {
        meta: {
          interface: "input",
          options:   null,    // verwijdert de dropdown-keuzes
          display:   null,
          note,
        },
      });
      console.log(`  ✓ ${collection}.page_slug omgezet naar vrij tekstveld`);
    } catch (err) {
      console.warn(`  ⚠️  ${collection}.page_slug patch mislukt: ${err.message}`);
    }
  }

  console.log("✓ Stap 1f voltooid");
}
