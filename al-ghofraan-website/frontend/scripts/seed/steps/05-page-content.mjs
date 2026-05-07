// scripts/seed/steps/05-page-content.mjs
//
// Vult page_content met initiële teksten voor home / dawahcommissie / doneren.
// Soft-create: bestaat een slug al, dan wordt NIETS overschreven — handmatige
// edits van de beheerder blijven intact. Alleen bij eerste seed worden de
// onderstaande defaults aangemaakt.
//
// Geen hardcoded e-mailadressen meer in body's: bezoekers worden naar /contact
// verwezen. De admin kan daarna zelf het echte adres invullen via
// site_settings.contact_email of in de body via de rich-text editor.

import { softCreateItem } from "../lib/helpers.mjs";

export async function seedPageContent(client) {
  console.log("\n📄 Stap 5 · Pagina-content (soft-create — bestaande edits blijven intact)");

  const pages = [
    {
      slug:     "home",
      title:    "Kennis, geloof en gemeenschap",
      subtitle: "DawahCommissie · Moskee Al-Ghofraan",
      intro:
        "De DawahCommissie van moskee Al-Ghofraan organiseert lezingen, " +
        "activiteiten en programma's om de moslimgemeenschap te verbinden, " +
        "te versterken en te inspireren.",
      body: `
        <p>Welkom op de website van de DawahCommissie. Wij zetten ons in om
        de boodschap van de islam op een toegankelijke en authentieke manier
        te delen met onze gemeenschap en de bredere samenleving.</p>
      `.trim(),
      seo_title:       "DawahCommissie Al-Ghofraan",
      seo_description: "Lezingen, activiteiten en programma's voor de moslimgemeenschap.",
      status:          "published",
    },

    {
      slug:     "dawahcommissie",
      title:    "Over de DawahCommissie",
      subtitle: "Wie zijn wij en wat drijft ons",
      intro:    "De DawahCommissie is een groep toegewijde vrijwilligers verbonden aan moskee Al-Ghofraan.",
      body: `
        <h2>Wie zijn wij?</h2>
        <p>De DawahCommissie is een groep toegewijde vrijwilligers verbonden
        aan moskee Al-Ghofraan. Ons doel is om de kennis over de islam te
        verspreiden op een toegankelijke, authentieke en inspirerende manier.</p>

        <h2>Onze missie</h2>
        <p>Wij geloven dat Da'wa &mdash; de uitnodiging tot de islam &mdash; begint met
        het goede voorbeeld geven. Door middel van educatieve programma's,
        dialoog en gemeenschapsactiviteiten willen wij een brug slaan tussen
        de moslimgemeenschap en de bredere samenleving.</p>

        <blockquote>
          <p><em>"Nodig uit naar de weg van uw Heer met wijsheid en schone vermaning."</em><br>
          &mdash; Soera An-Nahl 16:125</p>
        </blockquote>

        <h2>Wat wij doen</h2>
        <ul>
          <li><strong>Wekelijkse lezingen</strong> &mdash; toegankelijke lezingen na de vrijdagsalaat</li>
          <li><strong>Islamitische cursussen</strong> &mdash; Tawheed, Fiqh, Arabisch, Qur'aanrecitatie</li>
          <li><strong>Open dagen</strong> &mdash; voor niet-moslims en geïnteresseerden</li>
          <li><strong>Jeugdprogramma's</strong> &mdash; speciaal voor jongeren</li>
        </ul>

        <h2>Contact</h2>
        <p>Heeft u vragen of wilt u samenwerken? Neem contact met ons op via
        <a href="/contact">onze contactpagina</a>.</p>
      `.trim(),
      seo_title:       "Over de DawahCommissie Al-Ghofraan",
      seo_description: "Leer meer over de DawahCommissie van moskee Al-Ghofraan — onze missie, visie en activiteiten.",
      status:          "published",
    },

    {
      slug:     "doneren",
      title:    "Steun de DawahCommissie",
      subtitle: "Uw bijdrage maakt een verschil voor de gehele gemeenschap",
      intro:    "Uw bijdrage helpt ons om kennis, gemeenschap en dienstbaarheid te blijven dragen.",
      body: `
        <h3>Waarvoor wordt uw donatie gebruikt?</h3>
        <ul>
          <li><strong>Educatieve programma's</strong> &mdash; lezingen, cursussen en studiemateriaal</li>
          <li><strong>Moskee-activiteiten</strong> &mdash; evenementen en open dagen</li>
          <li><strong>Da'wa &amp; outreach</strong> &mdash; informatieverspreiding en interfaith dialoog</li>
        </ul>

        <p><em>"En wat u ook aan goeds uitgeeft, dat is voor uzelf."</em><br>
        &mdash; Soera Al-Baqara 2:272</p>

        <p>Heeft u vragen over donaties? Neem gerust contact op via
        <a href="/contact">onze contactpagina</a>.</p>
      `.trim(),
      seo_title:       "Doneren — DawahCommissie Al-Ghofraan",
      seo_description: "Steun de DawahCommissie van moskee Al-Ghofraan met een donatie.",
      status:          "published",
    },
  ];

  for (const page of pages) {
    await softCreateItem(client, "page_content", "slug", page.slug, page);
  }

  console.log("✓ Stap 5 voltooid");
}
