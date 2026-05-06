// scripts/seed/steps/01h-target-gender.mjs
//
// Voegt het target_gender veld toe aan zowel activities als education_programs
// (voor doelgroepfiltering op het inschrijfformulier), en werkt de gender-dropdown
// in de registrations collectie bij naar alleen "male"/"female".
//
// Volledig idempotent. Bestaande data blijft staan:
//   - activities.target_gender / education_programs.target_gender = nullable
//     (default "mixed", maar bestaande rijen worden NIET geüpdatet)
//   - registrations.gender blijft nullable string — eventuele oude waarden
//     ("m"/"f"/"other") in bestaande rijen blijven intact. Alleen de keuze-opties
//     in de admin-dropdown worden vervangen.

import { ensureField } from "../lib/helpers.mjs";

const TARGET_GENDER_FIELD = {
  field: "target_gender",
  type:  "string",
  meta: {
    width:     "half",
    interface: "select-dropdown",
    options: {
      choices: [
        { text: "Beide (mannen en vrouwen)", value: "mixed"  },
        { text: "Alleen mannen",              value: "male"   },
        { text: "Alleen vrouwen",             value: "female" },
      ],
    },
    display: "labels",
    display_options: {
      choices: [
        { text: "Beide",    value: "mixed",  foreground: "#18222F", background: "#D3DAE4" },
        { text: "Mannen",   value: "male",   foreground: "#FFFFFF", background: "#3A6F8F" },
        { text: "Vrouwen",  value: "female", foreground: "#FFFFFF", background: "#7E5A3A" },
      ],
    },
    note: "Doelgroep voor inschrijven. 'Beide' of leeg = mannen en vrouwen.",
  },
  schema: { default_value: "mixed", is_nullable: true },
};

export async function setupTargetGender(client) {
  console.log("\n♂♀ Stap 1h · target_gender velden + gender-keuzes bijwerken");

  // ─── activities.target_gender ─────────────────────────────
  const addedActivities       = await ensureField(client, "activities",         TARGET_GENDER_FIELD);
  const addedEducationPrograms = await ensureField(client, "education_programs", TARGET_GENDER_FIELD);

  if (!addedActivities) {
    console.log("  · activities.target_gender bestond al");
  }
  if (!addedEducationPrograms) {
    console.log("  · education_programs.target_gender bestond al");
  }

  // ─── registrations.gender — keuzes vervangen naar male/female ──
  // Dit doet alleen de meta/options bijwerken, schema (nullable string) blijft.
  // Daardoor blijven oude rijen met "m"/"f"/"other" intact in de DB; alleen de
  // dropdown in de admin toont voortaan alleen "Man"/"Vrouw".
  try {
    const existing = await client.get("/fields/registrations/gender");
    if (existing?.data) {
      await client.patch("/fields/registrations/gender", {
        meta: {
          width:     "half",
          interface: "select-dropdown",
          required:  true,
          options: {
            choices: [
              { text: "Man",   value: "male"   },
              { text: "Vrouw", value: "female" },
            ],
          },
          display: "labels",
          display_options: {
            choices: [
              { text: "Man",   value: "male",   foreground: "#FFFFFF", background: "#3A6F8F" },
              { text: "Vrouw", value: "female", foreground: "#FFFFFF", background: "#7E5A3A" },
            ],
          },
          note: "Verplicht — beheerd door inschrijfformulier (alleen male/female). Oude waarden in bestaande rijen blijven intact.",
        },
      });
      console.log("  ↻ registrations.gender — opties bijgewerkt naar Man/Vrouw");
    }
  } catch (err) {
    console.warn(`  ⚠️  Kon registrations.gender niet bijwerken: ${err.message}`);
  }

  console.log("✓ Stap 1h voltooid");
}
