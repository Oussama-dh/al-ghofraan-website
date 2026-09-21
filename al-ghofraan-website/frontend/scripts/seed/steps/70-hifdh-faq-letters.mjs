// scripts/seed/steps/70-hifdh-faq-letters.mjs
//
// Werkt het antwoord op de Hifdh-FAQ "Wat als mijn kind nog niet goed kan lezen
// of schrijven?" bij met de nieuwe minimale voorwaarde: het kind moet minimaal de
// Arabische letters van elkaar kunnen onderscheiden en herkennen.
//
// Veilig en idempotent:
//   - Alleen als het antwoord (witruimte genegeerd) EXACT de oorspronkelijke
//     standaardtekst uit stap 67 is, wordt het vervangen.
//   - Is het antwoord door een beheerder aangepast, dan gebeurt er niets (er wordt
//     alleen gemeld dat handmatig bijwerken nodig is).
//   - Staat de nieuwe tekst er al, dan gebeurt er niets. Een tweede run is een no-op.
//   - De vraag zelf, categorie, volgorde en status blijven ongewijzigd.

const FAQS = "education_program_faqs";
const PROGRAM_SLUG = "hifdhprogramma";
const QUESTION = "Wat als mijn kind nog niet goed kan lezen of schrijven?";

const OLD_ANSWER =
  "<p>Kinderen die nog niet goed kunnen lezen en/of schrijven, kunnen eerst deelnemen aan een aparte cursus " +
  "waarin zij leren <strong>de Qoraan te lezen en te schrijven</strong> volgens een bewezen methode. " +
  "Zodra uw kind voldoende voorbereid is, kan het instromen in de Hifdh-klassen.</p>";

const NEW_ANSWER =
  OLD_ANSWER +
  "\n<p>Voor deelname aan deze cursus geldt wel een minimale voorwaarde: uw kind moet " +
  "<strong>minimaal de Arabische letters van elkaar kunnen onderscheiden en herkennen</strong>. " +
  "Bij de inschrijving vragen wij u dit te bevestigen.</p>";

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
    if (ws(faq.answer) === ws(NEW_ANSWER)) {
      console.log(`  · vraag ${faq.id}: bevat de voorwaarde al — niets gewijzigd`);
    } else if (ws(faq.answer) === ws(OLD_ANSWER)) {
      await client.patch(`/items/${FAQS}/${faq.id}`, { answer: NEW_ANSWER });
      console.log(`  ↻ vraag ${faq.id}: standaardantwoord bijgewerkt met de voorwaarde`);
    } else {
      console.log(`  ! vraag ${faq.id}: antwoord is handmatig aangepast — NIET gewijzigd; voeg de voorwaarde zelf toe in Directus`);
    }
  }

  console.log("✓ Stap 70 voltooid");
}
