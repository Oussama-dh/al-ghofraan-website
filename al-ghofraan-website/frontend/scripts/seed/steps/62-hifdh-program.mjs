// scripts/seed/steps/62-hifdh-program.mjs
//
// Hifdh programma als gewoon onderwijsprogramma in `education_programs`,
// zodat het als kaart op /onderwijs verschijnt (zelfde component en
// huisstijl als de andere programma's).
//
// De kaart linkt naar /onderwijs/hifdhprogramma, dat door de gewone
// /onderwijs/[slug]-pagina wordt gerenderd; alleen het inschrijfformulier is
// Hifdh-specifiek (components/registration/QuranRegistrationForm.tsx). Het
// actielabel op de kaart komt uit lib/educationRoutes.ts.
//
// Idempotent en niet-destructief: bestaat het item niet, dan wordt het aangemaakt;
// bestaat het wel, dan worden ALLEEN lege velden aangevuld (bv. de knoptekst).
// Ingevulde velden (docent, doelgroep, planning, locatie, beschrijving, status, …)
// worden nooit overschreven. Geen schema-, permissie- of rolwijzigingen.
//
// Het programma toont op /onderwijs/hifdhprogramma dezelfde blokken als elk
// ander onderwijsprogramma (Docent, Doelgroep, Planning, Locatie, beschrijving,
// flyer). Die gegevens vult een beheerder in Directus in (education_programs).

export async function setupHifdhProgram(client) {
  console.log("\n📖 Stap 62 · Hifdh programma in education_programs");

  try {
    await client.get("/collections/education_programs");
  } catch {
    throw new Error('Collectie "education_programs" bestaat niet — draai eerst stap 11.');
  }

  const DEFAULTS = {
    title: "Hifdh programma",
    status: "published",
    registration_enabled: true,
    // Zelfde veld stuurt de reveal-knop op de programmapagina én het verzendlabel.
    registration_button_text: "Hifdh oel-Quraan",
  };

  const search = await client.get(
    `/items/education_programs?filter[slug][_eq]=hifdhprogramma&limit=1`,
  );
  const existing = search?.data?.[0];

  if (!existing) {
    await client.post("/items/education_programs", { slug: "hifdhprogramma", ...DEFAULTS });
    console.log('  ✓ education_programs: "hifdhprogramma" aangemaakt');
  } else {
    const empty = (v) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
    const patch = {};
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (empty(existing[k])) patch[k] = v;
    }
    if (Object.keys(patch).length > 0) {
      await client.patch(`/items/education_programs/${existing.id}`, patch);
      console.log(`  ↻ education_programs: "hifdhprogramma" — lege velden aangevuld (${Object.keys(patch).join(", ")}); overige inhoud onaangeraakt`);
    } else {
      console.log('  · education_programs: "hifdhprogramma" bestaat al en is compleet — niets gewijzigd');
    }
  }

  console.log("✓ Stap 62 voltooid");
}
