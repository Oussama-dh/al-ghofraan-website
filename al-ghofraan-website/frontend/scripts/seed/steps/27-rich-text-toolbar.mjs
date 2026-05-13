// scripts/seed/steps/27-rich-text-toolbar.mjs
//
// Delivery 14 — Rich-text WYSIWYG toolbar uitbreiden met alignment-knoppen.
//
// Probleem: bestaande rich-text velden (`input-rich-text-html`) hebben geen
// `meta.options.toolbar` ingesteld en gebruiken daardoor de interne Directus-
// default die GEEN alignment-knoppen bevat. Content-makers konden geen
// gecentreerde of rechts-uitgelijnde tekst opmaken.
//
// Oplossing: voor elk relevant rich-text veld de toolbar mergen met een
// uitgebreide set knoppen. De helper `ensureFieldOptions`:
//   - voegt alleen ontbrekende keys toe (verwijdert nooit iets)
//   - skipt netjes als het veld niet bestaat
//   - skipt als het veld geen `input-rich-text-html` is
//   - patcht niets als er niets te veranderen valt
//
// Schemawijziging: geen. Inhoud van velden: niet aangeraakt. Permissies:
// niet aangeraakt. Alleen `directus_fields.meta.options` wordt gepatched.

import { ensureFieldOptions } from "../lib/helpers.mjs";

/**
 * De toolbar-set die we voor alle rich-text velden willen garanderen.
 * Volgorde-keuze: groepen logisch bij elkaar (text formatting, headings,
 * lists, alignment, structuur, media, dev-tools).
 *
 * Bewust NIET opgenomen (kan klant later toevoegen indien gewenst):
 *   - "forecolor" / "backcolor" / "fontsizeselect" — content-makers kunnen
 *     hiermee kleuren/groottes kiezen die slecht passen in light + dark
 *     mode. Vraagt content-discipline; nu uit scope.
 *   - "table"  — krachtig maar produceert gemakkelijk te brede output
 *     op mobiel. Frontend rich-text styling ondersteunt tabellen al wel
 *     (delivery 13); de knop kan later zonder code-wijziging toegevoegd.
 *   - "undo" / "redo" — werkt al via standaard keyboard shortcuts
 *     (Ctrl/Cmd+Z); toolbar-knoppen zijn ruimteverspilling.
 */
const TOOLBAR_KEYS = [
  // Tekst-opmaak
  "bold", "italic", "underline", "strikethrough", "removeformat",
  // Headings
  "h1", "h2", "h3",
  // Lijsten
  "bullist", "numlist",
  // Uitlijning — DE TOEVOEGING VAN DEZE DELIVERY
  "alignleft", "aligncenter", "alignright", "alignjustify",
  // In-/uitspringen (handig naast lijsten en quotes)
  "indent", "outdent",
  // Structuur
  "blockquote", "hr",
  // Inhoud invoegen (Directus-eigen knoppen)
  "customLink", "customImage", "customMedia",
  // Dev / weergave
  "code", "fullscreen",
];

/**
 * De velden die we willen bijwerken. Lijst is bewust expliciet (geen
 * dynamisch zoeken naar input-rich-text-html velden) zodat onverwachte
 * velden van bv. extensions/admin niet meegenomen worden.
 */
const RICH_TEXT_FIELDS = [
  { collection: "activities",          field: "description" },
  { collection: "education_programs",  field: "description" },
  { collection: "articles",            field: "body" },
  { collection: "page_content",        field: "body" },
  { collection: "donation_campaigns",  field: "description" },
  { collection: "faq_items",           field: "answer" },
  // Delivery 19 — vacancies.body kreeg in delivery 18 alleen de Directus
  // default-toolbar (geen alignment/headings/lists). Nu meenemen in dezelfde
  // merge zodat de body net zo bewerkbaar is als andere rich-text velden.
  { collection: "vacancies",           field: "body" },
];

export async function setupRichTextToolbar(client) {
  console.log("");
  console.log("27. Rich-text toolbar — alignment-knoppen toevoegen");

  let updated = 0;
  let skipped = 0;

  for (const { collection, field } of RICH_TEXT_FIELDS) {
    const result = await ensureFieldOptions(client, collection, field, {
      expectedInterface: "input-rich-text-html",
      toolbarAdditions:  TOOLBAR_KEYS,
    });
    if (result) updated += 1;
    else        skipped += 1;
  }

  console.log(`  Resultaat: ${updated} veld(en) bijgewerkt, ${skipped} ongewijzigd/overgeslagen`);
}
