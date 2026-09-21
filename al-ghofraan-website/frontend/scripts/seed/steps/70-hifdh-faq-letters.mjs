// scripts/seed/steps/70-hifdh-faq-letters.mjs
//
// Werkt het antwoord op de Hifdh-FAQ "Wat als mijn kind nog niet goed kan lezen
// of schrijven?" bij met de minimale voorwaarde voor deelname: het kind moet
// minimaal de Arabische letters kunnen herkennen en van elkaar kunnen onderscheiden.
//
// Veilig en idempotent:
//   - Alleen als het antwoord (witruimte genegeerd) EXACT een van de eerder door
//     de seed geplaatste standaardteksten is (oorspronkelijk, of de eerste
//     formulering van de voorwaarde), wordt het vervangen door de huidige tekst.
//   - Is het antwoord door een beheerder aangepast, dan gebeurt er niets (er wordt
//     alleen gemeld dat handmatig bijwerken nodig is).
//   - Staat de huidige tekst er al, dan gebeurt er niets. Een tweede run is een no-op.
//   - De vraag zelf, categorie, volgorde en status blijven ongewijzigd.

const FAQS = "education_program_faqs";
const PROGRAM_SLUG = "hifdhprogramma";
const QUESTION = "Wat als mijn kind nog niet goed kan lezen of schrijven?";

// Oorspronkelijke standaardtekst (stap 67, eerste versie).
const ORIGINAL =
  "<p>Kinderen die nog niet goed kunnen lezen en/of schrijven, kunnen eerst deelnemen aan een aparte cursus " +
  "waarin zij leren <strong>de Qoraan te lezen en te schrijven</strong> volgens een bewezen methode. " +
  "Zodra uw kind voldoende voorbereid is, kan het instromen in de Hifdh-klassen.</p>";

// Eerste formulering van de voorwaarde (stap 70, eerste versie).
const FIRST_VERSION =
  ORIGINAL +
  "\n<p>Voor deelname aan deze cursus geldt wel een minimale voorwaarde: uw kind moet " +
  "<strong>minimaal de Arabische letters van elkaar kunnen onderscheiden en herkennen</strong>. " +
  "Bij de inschrijving vragen wij u dit te bevestigen.</p>";

// Huidige tekst.
const CURRENT =
  ORIGINAL +
  "\n<p>Voor deelname aan deze cursus geldt wel een minimale voorwaarde: uw kind moet " +
  "<strong>minimaal de Arabische letters kunnen herkennen en van elkaar kunnen onderscheiden</strong>. " +
  "Bij het openen van het inschrijfformulier vragen wij u dit eerst te bevestigen.</p>";

const REPLACEABLE = [ORIGINAL, FIRST_VERSION];

const ws = (s) => String(s || "").replace(/\s+/g, " ").trim();

export async function migrateHifdhFaqLetters(client) {
  console.log("\n🔤 Stap 70 · Hifdh FAQ: voorwaarde Arabische letters");

  const program = (
    await client.get(`/items/education_programs?filter[slug][_eq]=${PROGRAM_SLUG}&fields=id&limit=1`)
  )?.data?.[0];
  if (!program) {
    console.log(`  · programma "${PROGRAM_SLUG}" niet gevonden — niets gewijzigd`);
    return;
  }

  const faqs = (
    await client.get(
      `/items/${FAQS}?filter[program][_eq]=${program.id}` +
        `&filter[question][_eq]=${encodeURIComponent(QUESTION)}&fields=id,answer&limit=5`,
    )
  )?.data || [];

  if (faqs.length === 0) {
    console.log("  · vraag niet gevonden — niets gewijzigd");
    return;
  }

  for (const faq of faqs) {
    const answer = ws(faq.answer);
    if (answer === ws(CURRENT)) {
      console.log(`  · vraag ${faq.id}: bevat de huidige tekst al — niets gewijzigd`);
    } else if (REPLACEABLE.some((t) => ws(t) === answer)) {
      await client.patch(`/items/${FAQS}/${faq.id}`, { answer: CURRENT });
      console.log(`  ↻ vraag ${faq.id}: standaardantwoord bijgewerkt naar de huidige tekst`);
    } else {
      console.log(`  ! vraag ${faq.id}: antwoord is handmatig aangepast — NIET gewijzigd; pas de voorwaarde zelf aan in Directus`);
    }
  }

  console.log("✓ Stap 70 voltooid");
}
