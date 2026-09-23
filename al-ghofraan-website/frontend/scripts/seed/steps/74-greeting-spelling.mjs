// scripts/seed/steps/74-greeting-spelling.mjs
//
// Zet de begroeting in de standaard-intro van de bezoeker-bevestigingsmails
// (stap 35) om naar de Nederlandse transliteratie: "Assalamu alaikum" wordt
// "Assalamoe alaikoem" (conventie: oe, niet u).
//
// Veilig en idempotent:
//   - Alleen als de intro (witruimte genegeerd) EXACT de oude standaardtekst van
//     stap 35 is, wordt hij vervangen door de nieuwe tekst.
//   - Is de intro door een beheerder aangepast, dan gebeurt er niets (er wordt
//     alleen gemeld dat handmatig bijwerken nodig is).
//   - Staat de nieuwe tekst er al, dan gebeurt er niets. Een tweede run is een no-op.

const OLD_GREETING = "Assalamu alaikum,\n";
const NEW_GREETING = "Assalamoe alaikoem,\n";

const EDUCATION_BODY =
  "\n" +
  "Bedankt voor uw inschrijving bij Al-Ghofraan. Hieronder vindt u " +
  "een overzicht van de gegevens die u heeft ingevuld. Bewaar deze " +
  "mail goed.";

const ACTIVITIES_BODY =
  "\n" +
  "Bedankt voor uw inschrijving voor deze activiteit. Hieronder " +
  "vindt u een overzicht van de gegevens die u heeft ingevuld. " +
  "Bewaar deze mail goed.";

const FIELDS = [
  { field: "education_confirmation_email_intro",  body: EDUCATION_BODY },
  { field: "activities_confirmation_email_intro", body: ACTIVITIES_BODY },
];

const ws = (s) => String(s || "").replace(/\s+/g, " ").trim();

export async function migrateGreetingSpelling(client) {
  console.log("\n🔤 Stap 74 · Bevestigingsmails: begroeting Assalamoe alaikoem");

  const settings = (await client.get("/items/site_settings"))?.data;
  if (!settings) {
    console.log("  · site_settings niet gevonden — niets gewijzigd");
    return;
  }

  const payload = {};
  for (const { field, body } of FIELDS) {
    const value = ws(settings[field]);
    if (value === ws(NEW_GREETING + body)) {
      console.log(`  · ${field}: bevat de nieuwe tekst al — niets gewijzigd`);
    } else if (value === ws(OLD_GREETING + body)) {
      payload[field] = NEW_GREETING + body;
      console.log(`  ↻ ${field}: standaardtekst bijgewerkt`);
    } else {
      console.log(`  ! ${field}: tekst is handmatig aangepast — NIET gewijzigd; pas de begroeting zelf aan in Directus`);
    }
  }

  if (Object.keys(payload).length > 0) {
    await client.patch("/items/site_settings", payload);
  }

  console.log("✓ Stap 74 voltooid");
}
