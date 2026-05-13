// scripts/seed/steps/07b-activity-form-fields.mjs
//
// Delivery 19 — Drie extra velden op `activities` voor het inschrijfformulier:
//
//   max_registrations         (integer, nullable)
//     Maximaal aantal inschrijvingen. Leeg = onbeperkt. Server-side
//     afgedwongen in `app/api/inschrijven/route.ts`; bij overschrijding
//     antwoordt de API met 409 Conflict.
//
//   show_registration_limit   (boolean, default false)
//     Wanneer aangevinkt: toont "Nog X plekken beschikbaar" boven het
//     formulier op /agenda/[slug]. Wanneer uit: aantal blijft verborgen,
//     maar het formulier sluit nog steeds bij het bereiken van de limiet.
//
//   require_age               (boolean, default false)
//     Wanneer aangevinkt: leeftijdsveld is verplicht in het formulier
//     (zowel UI als server-side validatie). Anders blijft het optioneel
//     zoals nu.
//
// Delivery 20 — Drie extra velden op `activities` (zelfde stap):
//
//   minimum_age               (integer, nullable)
//     Minimumleeftijd voor inschrijving. Leeg of 0 = geen minimum.
//     Bij gevuld: leeftijd is automatisch verplicht (ook als
//     require_age=false), en de API weigert inschrijvingen met
//     leeftijd < minimum_age (403 Forbidden).
//
//   teacher                   (string, nullable)
//     Naam van de docent/spreker. Vrije tekst.
//
//   show_teacher              (boolean, default false)
//     Wanneer aangevinkt EN `teacher` gevuld: docent wordt zichtbaar
//     op /agenda/[slug]. Standaard uit zodat een per ongeluk ingevulde
//     naam niet meteen publiek staat.
//
// Idempotent: `ensureField` skipt netjes wanneer het veld al bestaat.
// Bestaande activity-records worden NIET aangepast — admin krijgt de
// nieuwe velden leeg en kan ze per activiteit zelf invullen.
//
// Reden voor één gecombineerde stap: alle zes velden horen functioneel
// bij het inschrijfformulier-gedrag of de publicatie van een activiteit,
// hebben dezelfde idempotentie-eigenschappen en worden in opeenvolgende
// deliveries op `activities` toegevoegd. Splitsen levert geen voordeel;
// samenhouden voorkomt dat een latere lezer aparte stapnummers moet
// correleren.

import { ensureField } from "../lib/helpers.mjs";

export async function setupActivityFormFields(client) {
  console.log("\n🎟️  Stap 7b · Inschrijfformulier-velden op activities");

  // ─── max_registrations ────────────────────────────────────────────
  // Integer, geen verplichting. Leeg/null = geen limiet. We zetten geen
  // database-default zodat het verschil tussen "leeg" en "0" duidelijk
  // blijft (0 zou betekenen: niemand kan zich inschrijven). Frontend en
  // API behandelen alleen positieve waarden als actieve limiet.
  await ensureField(client, "activities", {
    field: "max_registrations",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      note:
        "Maximum aantal inschrijvingen voor deze activiteit. Leeg laten = geen limiet. " +
        "Bij bereiken van het maximum sluit het formulier automatisch.",
    },
    schema: {},
  });

  // ─── show_registration_limit ──────────────────────────────────────
  // Boolean met default false. Bepaalt alleen de zichtbaarheid van het
  // resterende aantal plekken op de site — de daadwerkelijke sluiting
  // bij vol gebeurt altijd, ongeacht deze waarde.
  await ensureField(client, "activities", {
    field: "show_registration_limit",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      options:   { label: "Toon resterende plekken op de website" },
      special:   ["cast-boolean"],
      note:
        "Aan: bezoekers zien 'Nog X plekken beschikbaar'. Uit: het aantal blijft " +
        "verborgen, maar het formulier sluit nog steeds bij het bereiken van " +
        "max_registrations.",
    },
    schema: { default_value: false },
  });

  // ─── require_age ──────────────────────────────────────────────────
  // Boolean met default false. Wanneer true: leeftijdsveld in het
  // inschrijfformulier krijgt `required` + asterisk en de API weigert
  // payloads zonder geldige leeftijd (400 Bad Request).
  await ensureField(client, "activities", {
    field: "require_age",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      options:   { label: "Leeftijd verplicht stellen bij inschrijving" },
      special:   ["cast-boolean"],
      note:
        "Aan: bezoekers moeten hun leeftijd invullen om in te schrijven. " +
        "Uit: leeftijd blijft optioneel. " +
        "Let op: als 'Minimumleeftijd' gevuld is wordt leeftijd ook automatisch " +
        "verplicht, ongeacht deze toggle.",
    },
    schema: { default_value: false },
  });

  // ─── Delivery 20 — minimum_age ────────────────────────────────────
  // Integer, geen verplichting. Leeg of 0 = geen minimum. Alleen positieve
  // waarden activeren de check. Wanneer gevuld: leeftijd wordt automatisch
  // verplicht (ook bij require_age=false) — anders kun je niet vergelijken.
  // Server-side afgedwongen in route.ts: ontbrekende leeftijd → 400,
  // leeftijd < minimum → 403.
  await ensureField(client, "activities", {
    field: "minimum_age",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      note:
        "Minimumleeftijd voor inschrijving. Leeg laten = geen minimum. " +
        "Bij invullen wordt leeftijd automatisch verplicht (ongeacht de " +
        "'Leeftijd verplicht'-toggle) en weigert het systeem inschrijvingen " +
        "met een lagere leeftijd.",
    },
    schema: {},
  });

  // ─── Delivery 20 — teacher ────────────────────────────────────────
  // Vrije tekst — naam van de docent/spreker. Alleen zichtbaar op de
  // site wanneer `show_teacher` aanstaat. Niet meegenomen in de
  // TV-route (hard rule: TV-display niet aanpassen).
  await ensureField(client, "activities", {
    field: "teacher",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:
        "Naam van de docent of spreker. Alleen zichtbaar op de website " +
        "wanneer 'Docent tonen' aanstaat.",
    },
    schema: {},
  });

  // ─── Delivery 20 — show_teacher ───────────────────────────────────
  // Boolean met default false. Default uit zodat een per ongeluk
  // ingevulde naam niet meteen publiek staat. Wanneer true EN teacher
  // gevuld: weergave in de hero-meta op /agenda/[slug].
  await ensureField(client, "activities", {
    field: "show_teacher",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      options:   { label: "Docent tonen op de website" },
      special:   ["cast-boolean"],
      note:
        "Aan: de ingevulde docent verschijnt op de detail-pagina. " +
        "Uit: docent blijft verborgen, ook al is het veld gevuld.",
    },
    schema: { default_value: false },
  });

  console.log("✓ Stap 7b voltooid");
}
