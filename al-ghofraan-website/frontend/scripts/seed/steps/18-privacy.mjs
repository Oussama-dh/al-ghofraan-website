// scripts/seed/steps/18-privacy.mjs
//
// Maakt de privacyverklaring aan in page_content en voegt een footer-link toe.
// Volledig idempotent én "soft": als de admin de tekst handmatig heeft
// gewijzigd, blijft die wijziging staan. We schrijven ALLEEN bij de eerste
// aanmaak.
//
// Werkt via de bestaande dynamische /[slug] route — geen nieuwe Next route nodig.

const PRIVACY_BODY = `
<p><strong>Laatst bijgewerkt:</strong> bij eerste publicatie. Pas deze datum aan in Directus wanneer u de tekst wijzigt.</p>

<h2>Wie is verantwoordelijk?</h2>
<p>De DawahCommissie van moskee Al-Ghofraan in Steenbergen is verantwoordelijk voor de verwerking van uw persoonsgegevens via deze website. Voor vragen over privacy kunt u contact met ons opnemen via <a href="/contact">onze contactpagina</a>.</p>

<h2>Welke gegevens verzamelen wij?</h2>
<p>Afhankelijk van wat u op de website doet, kunnen wij de volgende gegevens van u verwerken:</p>
<ul>
  <li><strong>Bij contact opnemen:</strong> naam, e-mailadres, eventueel telefoonnummer, onderwerp en de inhoud van uw bericht.</li>
  <li><strong>Bij inschrijving voor onderwijs of activiteiten:</strong> naam, e-mailadres, eventueel telefoonnummer, leeftijd en geslacht. Geslacht vragen wij omdat sommige cursussen specifiek voor mannen of vrouwen worden georganiseerd.</li>
  <li><strong>Bij donaties:</strong> uw naam en e-mailadres. Het betalingsproces zelf verloopt volledig via Stripe — wij ontvangen géén kaartgegevens of bankrekeningnummers.</li>
  <li><strong>Bij WhatsApp-contact:</strong> wanneer u op de WhatsApp-knop klikt, opent uw eigen WhatsApp-app. WhatsApp (Meta) is dan de verwerkingsverantwoordelijke voor het bericht dat u stuurt.</li>
</ul>

<h2>Waarom verzamelen wij deze gegevens?</h2>
<ul>
  <li>Om uw berichten en vragen te kunnen beantwoorden.</li>
  <li>Om u in te schrijven voor onderwijs of activiteiten en u op de hoogte te kunnen houden.</li>
  <li>Om donaties correct te kunnen verwerken en u een bevestiging te sturen.</li>
  <li>Om te voldoen aan wettelijke verplichtingen, bijvoorbeeld rondom administratie van giften.</li>
</ul>

<h2>Met wie delen wij gegevens?</h2>
<p>Wij verkopen uw gegevens niet en delen ze alleen met partijen die wij nodig hebben om de website te laten werken:</p>
<ul>
  <li><strong>Stripe</strong> — voor het verwerken van donaties. Stripe is een Iers/Amerikaans betaaldienstverlener met eigen privacybeleid (zie <a href="https://stripe.com/nl/privacy" target="_blank" rel="noopener noreferrer">stripe.com/nl/privacy</a>).</li>
  <li><strong>Hostingpartij</strong> — de servers waarop deze website en database draaien.</li>
</ul>
<p>Met deze partijen hebben wij waar nodig verwerkersafspraken.</p>

<h2>Hoe lang bewaren wij gegevens?</h2>
<ul>
  <li><strong>Contactberichten:</strong> tot 2 jaar na het laatste contact, daarna verwijderd of gearchiveerd.</li>
  <li><strong>Inschrijvingen:</strong> tot het einde van de cursus of activiteit, daarna maximaal 1 jaar voor administratieve doeleinden.</li>
  <li><strong>Donatiegegevens:</strong> 7 jaar — dit is een wettelijke bewaartermijn vanuit de fiscale administratie.</li>
</ul>

<h2>Uw rechten</h2>
<p>U heeft het recht om:</p>
<ul>
  <li>Inzage te vragen in welke gegevens wij van u hebben.</li>
  <li>Onjuiste gegevens te laten corrigeren.</li>
  <li>Uw gegevens te laten verwijderen, voor zover dat wettelijk mag.</li>
  <li>Bezwaar te maken tegen het gebruik van uw gegevens.</li>
  <li>Een klacht in te dienen bij de Autoriteit Persoonsgegevens.</li>
</ul>
<p>Stuur een verzoek via <a href="/contact">onze contactpagina</a> en wij reageren binnen vier weken.</p>

<h2>Cookies en tracking</h2>
<p>Deze website gebruikt <strong>geen tracking cookies en geen analytics</strong>. Er is daarom ook geen cookiebanner nodig. De website gebruikt alleen technisch noodzakelijke functionaliteit om pagina's te laden en formulieren te versturen.</p>
<p>Mocht dit beleid in de toekomst veranderen, dan zullen wij deze pagina aanpassen en — indien wettelijk verplicht — een cookiebanner toevoegen.</p>

<h2>Wijzigingen in deze verklaring</h2>
<p>Wij kunnen deze privacyverklaring aanpassen wanneer wetgeving of werkwijze daarom vraagt. De datum bovenaan toont wanneer de tekst voor het laatst is aangepast.</p>

<h2>Contact bij privacyvragen</h2>
<p>Heeft u vragen over uw privacy of over deze verklaring? Neem contact met ons op via <a href="/contact">onze contactpagina</a>.</p>
`.trim();

/**
 * Maakt een page_content rij aan ALS die nog niet bestaat. Bestaat hij al,
 * dan blijft alle bestaande content (incl. handmatige edits) intact —
 * de seed update geen velden.
 */
async function ensurePageContent(client, slug, data) {
  const search = await client.get(
    `/items/page_content?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`
  );
  const existing = search?.data?.[0];
  if (existing) {
    console.log(`  · page_content "${slug}" bestaat al — niet overschreven`);
    return existing.id;
  }
  const created = await client.post("/items/page_content", { slug, ...data });
  console.log(`  ✓ page_content "${slug}" aangemaakt`);
  return created?.data?.id;
}

export async function setupPrivacy(client) {
  console.log("\n🔒 Stap 18 · privacyverklaring + footer-link");

  await ensurePageContent(client, "privacy", {
    title:           "Privacyverklaring",
    subtitle:        "Hoe wij omgaan met persoonsgegevens",
    intro:           "Wij hechten veel waarde aan uw privacy. Hieronder leggen we uit welke gegevens wij verzamelen en waarom.",
    body:            PRIVACY_BODY,
    seo_title:       "Privacyverklaring",
    seo_description: "Hoe de DawahCommissie van moskee Al-Ghofraan omgaat met persoonsgegevens.",
    status:          "published",
  });

  // Footer-link — voegt alleen toe als hij nog niet bestaat. Bestaande
  // handmatige instellingen (label, sort, location) blijven intact.
  const navResp = await client.get(
    `/items/navigation_items?filter[href][_eq]=${encodeURIComponent("/privacy")}&limit=1&fields=id,location`
  );
  const existingNav = navResp?.data?.[0];

  if (existingNav) {
    console.log(`  · navigation_items "/privacy" bestaat al — niet overschreven`);
  } else {
    await client.post("/items/navigation_items", {
      label:     "Privacyverklaring",
      href:      "/privacy",
      sort:      90,
      highlight: false,
      external:  false,
      active:    true,
      location:  "footer",
    });
    console.log(`  ✓ navigation_items "/privacy" aangemaakt (footer)`);
  }

  console.log("✓ Stap 18 voltooid");
}
