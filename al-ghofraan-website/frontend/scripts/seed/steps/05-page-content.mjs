// scripts/seed/steps/05-page-content.mjs

import { upsertItem } from "../lib/helpers.mjs";

export async function seedPageContent(client) {
  console.log("\n📄 Stap 5 · Pagina-content");

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
        <p>Wij geloven dat Da'wa — de uitnodiging tot de islam — begint met
        het goede voorbeeld geven. Door middel van educatieve programma's,
        dialoog en gemeenschapsactiviteiten willen wij een brug slaan tussen
        de moslimgemeenschap en de bredere samenleving.</p>

        <blockquote>
          <p><em>"Nodig uit naar de weg van uw Heer met wijsheid en schone vermaning."</em><br>
          — Soera An-Nahl 16:125</p>
        </blockquote>

        <h2>Wat wij doen</h2>
        <ul>
          <li><strong>Wekelijkse lezingen</strong> — toegankelijke lezingen na de vrijdagsalaat</li>
          <li><strong>Islamitische cursussen</strong> — Tawheed, Fiqh, Arabisch, Qur'aanrecitatie</li>
          <li><strong>Open dagen</strong> — voor niet-moslims en geïnteresseerden</li>
          <li><strong>Jeugdprogramma's</strong> — speciaal voor jongeren</li>
        </ul>

        <h2>Contact</h2>
        <p>Heeft u vragen of wilt u samenwerken? Neem contact met ons op via
        <a href="mailto:el-masoudi@hotmail.com">el-masoudi@hotmail.com</a>.</p>
      `.trim(),
      seo_title:       "Over de DawahCommissie Al-Ghofraan",
      seo_description: "Leer meer over de DawahCommissie van moskee Al-Ghofraan — onze missie, visie en activiteiten.",
      status:          "published",
    },

    {
      slug:     "doneren",
      title:    "Steun de DawahCommissie",
      subtitle: "Uw bijdrage maakt een verschil voor de gehele gemeenschap",
      intro:    "Binnenkort kunt u hier veilig online doneren.",
      body: `
        <p>We werken aan een veilige en eenvoudige donatiemogelijkheid via Stripe.
        Uw bijdrage is van onschatbare waarde voor ons werk.</p>

        <p>Wilt u nu al bijdragen? Neem contact met ons op via
        <a href="mailto:el-masoudi@hotmail.com">el-masoudi@hotmail.com</a>.</p>

        <h3>Waarvoor wordt uw donatie gebruikt?</h3>
        <ul>
          <li><strong>Educatieve programma's</strong> — lezingen, cursussen en studiemateriaal</li>
          <li><strong>Moskee-activiteiten</strong> — evenementen en open dagen</li>
          <li><strong>Da'wa &amp; outreach</strong> — informatieverspreiding en interfaith dialoog</li>
        </ul>

        <p><em>"En wat u ook aan goeds uitgeeft, dat is voor uzelf."</em><br>
        — Soera Al-Baqara 2:272</p>
      `.trim(),
      seo_title:       "Doneren — DawahCommissie Al-Ghofraan",
      seo_description: "Steun de DawahCommissie van moskee Al-Ghofraan met een donatie.",
      status:          "published",
    },
  ];

  for (const page of pages) {
    await upsertItem(client, "page_content", "slug", page.slug, page);
  }

  console.log("✓ Stap 5 voltooid");
}
