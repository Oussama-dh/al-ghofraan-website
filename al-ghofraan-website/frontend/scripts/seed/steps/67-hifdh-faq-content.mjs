// scripts/seed/steps/67-hifdh-faq-content.mjs
//
// Veelgestelde vragen van het Hifdh programma (Baraa'im), gegroepeerd voor de
// aparte pagina /onderwijs/hifdhprogramma/veelgestelde-vragen.
//
//   1. Voegt het optionele veld `category` toe aan education_program_faqs
//      (keuzelijst met de vier groepen; eigen groepen zijn toegestaan).
//   2. Maakt de hieronder staande vragen aan voor het programma "hifdhprogramma".
//
// Idempotent en niet-destructief:
//   - Een vraag wordt alleen aangemaakt als het programma nog GEEN vraag met
//     dezelfde tekst heeft (hoofdletter-, spatie- en leesteken-ongevoelig).
//   - Bestaande vragen worden NOOIT gewijzigd of verwijderd. Wat een beheerder in
//     Directus aanpast, toevoegt of verwijdert blijft dus zoals het is. Wel: een
//     door een beheerder verwijderde vraag komt bij een herhaalde run terug;
//     draai deze stap daarom alleen bij de eerste uitrol (of om ontbrekende
//     vragen bewust aan te vullen).

import { ensureField } from "../lib/helpers.mjs";

const FAQS = "education_program_faqs";
const PROGRAM_SLUG = "hifdhprogramma";

const CAT_PROGRAM  = "Over het programma";
const CAT_PARENTS  = "Voor ouders";
const CAT_PRACTICE = "Praktische zaken";
const CAT_COSTS    = "Kosten en deelname";

const CATEGORY_CHOICES = [CAT_PROGRAM, CAT_PARENTS, CAT_PRACTICE, CAT_COSTS].map((v) => ({ text: v, value: v }));

const FAQ_ITEMS = [
  // ─── Over het programma ────────────────────────────────────
  {
    category: CAT_PROGRAM,
    question: "Voor wie is Hifdh oel-Qoraan bedoeld?",
    answer: `<p>Hifdh oel-Qoraan is bedoeld voor <strong>jongens en meisjes van 6 t/m 12 jaar</strong>.</p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Wat als mijn kind nog niet goed kan lezen of schrijven?",
    answer: `<p>Kinderen die nog niet goed kunnen lezen en/of schrijven, kunnen eerst deelnemen aan een aparte cursus waarin zij leren <strong>de Qoraan te lezen en te schrijven</strong> volgens een bewezen methode. Zodra uw kind voldoende voorbereid is, kan het instromen in de Hifdh-klassen.</p>
<p>Voor deelname aan deze cursus geldt wel een minimale voorwaarde: uw kind moet <strong>minimaal de Arabische letters van elkaar kunnen onderscheiden en herkennen</strong>. Bij de inschrijving vragen wij u dit te bevestigen.</p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Hoe werkt de Loeḥ-methode precies?",
    answer: `<p>Bij de Loeḥ-methode schrijft uw kind zelfstandig vanuit de Mosḥaf een aantal verzen van de Qoraan over op zijn of haar whiteboard.</p>
<p>Nadat het gedeelte is geschreven, controleert de shaykh het bord zorgvuldig op eventuele fouten. Vervolgens leest de shaykh het gedeelte samen met uw kind en leert hij uw kind direct de juiste uitspraak en de bijbehorende tajwiedregels.</p>
<p>Daarna gaat uw kind zelfstandig aan de slag met het memoriseren van het geschreven gedeelte. Wanneer uw kind het gedeelte voldoende heeft gememoriseerd, draagt het dit uit het hoofd voor aan de shaykh.</p>
<p>Is de memorisatie goed, dan krijgt uw kind de opdracht om het gedeelte van het whiteboard uit te wissen en vervolgens een nieuw gedeelte te schrijven. Dit proces wordt steeds opnieuw herhaald.</p>
<p><strong>Schrijven → controleren → lezen → memoriseren → voordragen → opnieuw beginnen.</strong></p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Waarom kiezen jullie voor de Loeḥ-methode?",
    answer: `<p>De Loeḥ-methode is een eeuwenoude manier om de memorisatie van de Qoraan te versterken.</p>
<p>De memorisatie begint hierbij eigenlijk al tijdens het <strong>schrijven</strong>. Uw kind moet de verzen vanuit de Mosḥaf nauwkeurig overnemen. De letters, tekens en woorden moeten precies worden geschreven zoals ze in de Mosḥaf staan. Dit vraagt van uw kind een hoge mate van concentratie en aandacht.</p>
<p>Vervolgens gaat uw kind de verzen memoriseren. Op het whiteboard staat alleen hetgeen uw kind op dat moment moet leren. In tegenstelling tot de Mosḥaf wordt uw kind daardoor niet omringd door andere pagina's en verzen. Dit kan het memoriseren mentaal overzichtelijker en beter behapbaar maken.</p>
<p>Daarnaast vormt het steeds opnieuw mogen uitwissen van het bord en beginnen aan een nieuw gedeelte een soort <strong>mijlpaal</strong> voor uw kind. Iedere keer dat het bord wordt uitgewist, heeft uw kind een gedeelte afgerond en kan het met iets nieuws beginnen. Dit kan een belangrijke motivator zijn tijdens het leerproces.</p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Welke riwaayah wordt binnen het programma gehanteerd?",
    answer: `<p>Binnen het programma hanteren wij in eerste instantie de <strong>riwaayah van Imaam Warsh</strong>.</p>
<p>Wanneer u behoefte heeft aan het hanteren van een andere riwaayah, kan dit worden besproken met de shaykh.</p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Kan mijn kind direct vanuit de Mosḥaf leren?",
    answer: `<p>Wij zijn ervan overtuigd dat de Loeḥ-methode voor onze kinderen grote voordelen biedt. De methode waarbij kinderen rechtstreeks vanuit de Mosḥaf memoriseren is uiteraard een veelgebruikte en wijdverspreide methode.</p>
<p>Wanneer u daar specifiek de voorkeur aan geeft, zijn er andere leerinstellingen waar u hiervoor terechtkunt. Binnen Hifdh oel-Qoraan kiezen wij er bewust voor om <strong>uitsluitend volgens de Loeḥ-methode te werken</strong>, omdat wij ervan overtuigd zijn dat deze methode het beste aansluit bij de manier waarop wij onze kinderen willen begeleiden.</p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Krijgt mijn kind een persoonlijk programma en hoe wordt de voortgang bijgehouden?",
    answer: `<p>Ja. Ieder kind krijgt een <strong>eigen programma</strong>, gebaseerd op zijn of haar niveau. Naarmate uw kind zich ontwikkelt, wordt ook het programma aangepast aan deze ontwikkeling.</p>
<p>In de beginfase houden wij de voortgang van de kinderen voorlopig op papier bij. In shaa Allaah willen wij dit in de toekomst uitbreiden met een <strong>leerling-/ouderportaal</strong>, waarin u en uw kind de voortgang kunnen bekijken. Dit staat bij ons op de planning om zo snel mogelijk te implementeren.</p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Hoeveel Qoraan moet mijn kind per les memoriseren?",
    answer: `<p>Dit hangt volledig af van wat uw kind op dat moment aankan. Ieder kind heeft zijn eigen niveau en tempo.</p>
<p>Wel willen wij uw kind op een gezonde en passende manier blijven uitdagen om steeds meer verzen te memoriseren.</p>
<p>Ons streven is dat een kind uiteindelijk per les ongeveer <strong>1/8 van een hizb</strong> kan memoriseren, wat neerkomt op iets meer dan één pagina uit de Mosḥaf.</p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Is er naast nieuwe Hifdh ook aandacht voor moeraja'ah?",
    answer: `<p>Zeker. <strong>Moeraja'ah is uiteindelijk waar het allemaal om draait.</strong></p>
<p>Uw kind kan zoveel nieuwe verzen memoriseren als het wil, maar als het wil dat de Qoraan bij hem blijft, moet het de nodige aandacht besteden aan het herhalen van wat het heeft geleerd. Daarom vinden wij het belangrijk dat kinderen <strong>dagelijks bezig zijn met moeraja'ah</strong>.</p>
<p>Hier zullen wij binnen het programma veel aandacht aan besteden. Daarnaast verwachten wij van u als ouder/verzorger dat u uw kind op een gezonde en passende manier hierin ondersteunt en motiveert.</p>
<p>Voor extra gemotiveerde kinderen bestaat er bovendien de mogelijkheid om op <strong>dinsdag en donderdag tussen 16:00 en 20:00 uur</strong> in de moskee bij de shaykh extra moeraja'ah te doen om de memorisatie verder te versterken.</p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Wat gebeurt er als mijn kind moeite heeft met het tempo?",
    answer: `<p>Ieder kind heeft een eigen programma dat gebaseerd is op zijn of haar niveau. Er bestaat daarom niet één vast tempo dat voor ieder kind geldt.</p>
<p>Wij begrijpen dat ieder kind zijn eigen ontwikkeling en leertempo heeft. In shaa Allaah zullen wij alles doen wat binnen onze mogelijkheden ligt om uw kind te ondersteunen, te faciliteren, te motiveren en waar mogelijk naar een hoger niveau te brengen.</p>
<p>Ook hierin is uw betrokkenheid als ouder belangrijk. Wij zullen u informeren en begeleiden in de manier waarop u uw kind thuis de juiste aandacht en ondersteuning kunt geven om zich zo goed mogelijk te ontwikkelen.</p>`,
  },
  {
    category: CAT_PROGRAM,
    question: "Worden kinderen van 6 t/m 12 jaar samen in één klas geplaatst, of worden zij ingedeeld naar leeftijd en/of niveau?",
    answer: `<p>Binnen de <strong>Hifdh-klassen</strong> krijgen alle kinderen van <strong>6 t/m 12 jaar gezamenlijk les</strong>. De kinderen worden dus niet op basis van leeftijd in verschillende Hifdh-klassen verdeeld.</p>
<p>Hoewel de kinderen verschillende leeftijden en niveaus hebben, krijgt ieder kind een <strong>persoonlijk Hifdh-programma</strong>, afgestemd op zijn of haar eigen niveau en ontwikkeling.</p>
<p>Voor kinderen die nog niet goed kunnen lezen en/of schrijven en daarom eerst de voorbereidende cursus volgen, werken wij wél met twee leeftijdsgroepen:</p>
<ul>
<li><strong>6 t/m 9 jaar</strong></li>
<li><strong>10 t/m 12 jaar</strong></li>
</ul>
<p>Deze leeftijdsindeling geldt dus <strong>alleen voor de voorbereidende lees- en schrijfcursus en niet voor de Hifdh-klassen</strong>.</p>`,
  },

  // ─── Voor ouders ───────────────────────────────────────────
  {
    category: CAT_PARENTS,
    question: "Wat wordt er van mij als ouder/verzorger verwacht?",
    answer: `<p>Als ouder/verzorger die uw kind helpt bij het memoriseren van de woorden van Allaah, mag u in shaa Allaah een enorme beloning verwachten. Tegelijkertijd is het belangrijk dat u zich realiseert wat het daadwerkelijk betekent om uw kind te begeleiden bij het memoriseren van de woorden van Allaah.</p>
<p>Wanneer dit besef aanwezig is, verandert ook uw houding als ouder.</p>
<p>Wij willen het beste voor uw kind en wij weten dat u als ouder/verzorger dat nog meer wilt. Daarom vragen wij u om <strong>veel doe'aa voor uw kind te doen, uw kind op een gezonde en passende manier te motiveren en zelf het goede voorbeeld te geven</strong>.</p>
<p>Sla thuis ook de Qoraan open. Herhaal samen met uw kind de verzen die het heeft gememoriseerd en maak de Qoraan onderdeel van het dagelijks leven thuis.</p>`,
  },
  {
    category: CAT_PARENTS,
    question: "Hoeveel tijd moet mijn kind thuis besteden aan Hifdh?",
    answer: `<p>Het belangrijkste uitgangspunt is dat uw kind <strong>dagelijks bezig is met de Qoraan</strong>. Dat vormt de basis.</p>
<p>Hoe meer Qoraan uw kind heeft gememoriseerd, hoe meer tijd het uiteindelijk nodig zal hebben om alles goed te blijven herhalen. Daarom vinden wij het belangrijker dat uw kind <strong>iedere dag</strong> met de Qoraan bezig is en zoveel mogelijk herhaalt, dan dat er één vaste hoeveelheid tijd wordt voorgeschreven.</p>`,
  },
  {
    category: CAT_PARENTS,
    question: "Kan ik mijn kind thuis begeleiden als ik zelf niet goed Qoraan kan lezen?",
    answer: `<p>Ja, zeker. Er zijn verschillende manieren waarop u uw kind thuis kunt begeleiden. Iedere ouder kan hierin een manier kiezen die bij de eigen situatie past.</p>
<p>Tegelijkertijd hopen wij dat dit voor u juist een motivatie is om zelf ook lessen te volgen en uw eigen kennis en recitatie van de Qoraan te verbeteren.</p>
<p>Er is immers geen grotere eer voor een ouder/verzorger dan de Qoraan aan zijn of haar kind mee te geven en een goede begeleiding hierin te kunnen bieden.</p>`,
  },

  // ─── Praktische zaken ──────────────────────────────────────
  {
    category: CAT_PRACTICE,
    question: "Hoe vaak en hoe lang zijn de lessen?",
    answer: `<p>De Hifdh-klassen vinden iedere <strong>zaterdag en zondag van 09:30 tot 11:55 uur</strong> plaats.</p>
<p>Voor kinderen die eerst nog moeten leren lezen en schrijven, zijn er aparte cursussen op <strong>zaterdag en zondag van 12:10 tot 13:40 uur</strong>.</p>`,
  },
  {
    category: CAT_PRACTICE,
    question: "Hoe groot zijn de groepen?",
    answer: `<p>De Hifdh-klassen hebben een maximum van <strong>25 leerlingen</strong>.</p>
<p>De groepen voor de lees- en schrijfcursussen bestaan uit <strong>6 tot 10 kinderen</strong>.</p>`,
  },
  {
    category: CAT_PRACTICE,
    question: "Krijgen jongens en meisjes gezamenlijk les?",
    answer: `<p>Ja. Jongens en meisjes krijgen binnen het programma gezamenlijk les. <strong>Binnen de klas worden zij wel van elkaar gescheiden.</strong></p>`,
  },
  {
    category: CAT_PRACTICE,
    question: "Kan mijn kind instromen als het al eerder Qoraan heeft gememoriseerd?",
    answer: `<p>Ja. Ieder kind dat aan de gestelde voorwaarden voldoet, is welkom, ongeacht het niveau waarmee het instroomt.</p>`,
  },

  // ─── Kosten en deelname ────────────────────────────────────
  {
    category: CAT_COSTS,
    question: "Wat zijn de kosten per kind?",
    answer: `<p>De kosten bedragen <strong>€30 per kind</strong>.</p>
<p>Dit bedrag is inclusief de benodigde materialen en de beloningen die kinderen ontvangen bij het behalen van belangrijke mijlpalen.</p>`,
  },
  {
    category: CAT_COSTS,
    question: "Is er korting wanneer ik meerdere kinderen aanmeld?",
    answer: `<p>Ja. Voor gezinnen met meerdere kinderen hanteren wij de volgende tarieven:</p>
<ul>
<li><strong>1e kind:</strong> €30</li>
<li><strong>2e kind:</strong> €25</li>
<li><strong>3e kind:</strong> €15</li>
<li><strong>Vanaf het 3e kind:</strong> €15 per kind</li>
</ul>`,
  },
  {
    category: CAT_COSTS,
    question: "Zijn er nog andere kosten waar ik rekening mee moet houden?",
    answer: `<p>Nee. Er zijn <strong>geen verplichte bijkomende kosten</strong>.</p>
<p>Wanneer wij als Baraa'im in de toekomst activiteiten organiseren waarvoor wij een symbolische eigen bijdrage vragen, zullen wij dit vooraf duidelijk en transparant met u als ouder/verzorger communiceren.</p>`,
  },
];

/** Vergelijkingssleutel: hoofdletters, spaties en leestekens genegeerd. */
function norm(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export async function setupHifdhFaqContent(client) {
  console.log("\n❓ Stap 67 · Hifdh veelgestelde vragen (categorie-veld + inhoud)");

  try {
    await client.get(`/collections/${FAQS}`);
  } catch {
    throw new Error(`Collectie "${FAQS}" bestaat niet — draai eerst stap 63.`);
  }

  await ensureField(client, FAQS, {
    field: "category",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      options:   { choices: CATEGORY_CHOICES, allowOther: true },
      note:      "Groep op de pagina 'Veelgestelde vragen'. Kies een groep of typ een eigen naam. Leeg = onder 'Overige vragen'.",
      translations: [
        { language: "nl-NL", translation: "Categorie" },
        { language: "en-US", translation: "Categorie" },
      ],
    },
    schema: { is_nullable: true },
  });

  const program = (
    await client.get(`/items/education_programs?filter[slug][_eq]=${PROGRAM_SLUG}&fields=id&limit=1`)
  )?.data?.[0];
  if (!program) {
    throw new Error(`Programma "${PROGRAM_SLUG}" bestaat niet — draai eerst stap 62.`);
  }

  const existing = (
    await client.get(`/items/${FAQS}?filter[program][_eq]=${program.id}&fields=id,question&limit=-1`)
  )?.data || [];
  const have = new Set(existing.map((f) => norm(f.question)));

  let created = 0;
  let skipped = 0;
  for (let i = 0; i < FAQ_ITEMS.length; i++) {
    const item = FAQ_ITEMS[i];
    if (have.has(norm(item.question))) {
      skipped++;
      console.log(`  · bestaat al: "${item.question.slice(0, 60)}"`);
      continue;
    }
    await client.post(`/items/${FAQS}`, {
      program:  program.id,
      status:   "published",
      question: item.question,
      answer:   item.answer,
      category: item.category,
      sort:     (i + 1) * 10,
    });
    created++;
  }

  console.log(`  ✓ ${created} vraag/vragen aangemaakt, ${skipped} bestond al (niet aangeraakt)`);
  console.log("✓ Stap 67 voltooid");
}
