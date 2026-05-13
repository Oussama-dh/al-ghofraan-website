// scripts/seed/steps/31-vacancy-status-colors.mjs
//
// Delivery 19 — Kleur-gecodeerde status-badges op de `vacancies` collectie
// in de Directus admin-lijst.
//
// Achtergrond
// -----------
// In delivery 18 werd het `status`-veld op `vacancies` aangemaakt met
// `display: "labels"` maar zónder `display_options.choices`. Daardoor
// toont de admin-lijst grijze labels in plaats van de gekleurde badges
// die andere collecties (articles, donation_campaigns, ...) wél hebben.
//
// Vanaf delivery 19 zit de juiste `display_options` inline in stap 29.
// Maar `ensureField` is een puur existence-check: zodra het veld bestaat
// (zoals bij elke installatie die delivery 18 al heeft gedraaid) wordt
// de nieuwe inline-config genegeerd. Deze stap dekt dat gat af door
// idempotent een PATCH op `/fields/vacancies/status` te doen wanneer
// de display-kleuren ontbreken.
//
// Hard rules respecteert
// ----------------------
// - Patcht alléén `meta.display_options.choices`. Andere meta-velden
//   (interface, options.choices, display, schema-defaults) blijven
//   ongemoeid.
// - No-op wanneer er al `display_options.choices`-entries staan: zo
//   overschrijven we nooit een eventuele handmatige aanpassing in admin.
// - No-op wanneer het veld niet bestaat (logwarn, geen crash).
// - Tweede `npm run seed` doet niets — idempotent.

const TARGET_COLLECTION = "vacancies";
const TARGET_FIELD      = "status";

// Dezelfde kleuren als bij `articles.status` (stap 16) en
// `donation_campaigns.status` (stap 15) — consistentie over collecties.
const WANTED_CHOICES = [
  { text: "Gepubliceerd", value: "published", foreground: "#FFFFFF", background: "#2ECDA7" },
  { text: "Concept",       value: "draft",     foreground: "#18222F", background: "#D3DAE4" },
  { text: "Gearchiveerd",  value: "archived",  foreground: "#FFFFFF", background: "#A2B5CD" },
];

export async function setupVacancyStatusColors(client) {
  console.log("\n🎨 Stap 31 · Kleurcodering voor vacancies.status");

  // ─── 1. Veld ophalen ──────────────────────────────────────────────
  let field;
  try {
    const res = await client.get(`/fields/${TARGET_COLLECTION}/${TARGET_FIELD}`);
    field = res?.data;
  } catch (err) {
    console.warn(
      `  ⚠ veld "${TARGET_COLLECTION}.${TARGET_FIELD}" niet gevonden — overgeslagen ` +
      `(${err?.message ?? "onbekende fout"})`,
    );
    return;
  }
  if (!field || !field.meta) {
    console.warn(`  ⚠ veld "${TARGET_COLLECTION}.${TARGET_FIELD}" heeft geen meta — overgeslagen`);
    return;
  }

  // ─── 2. Huidige display_options analyseren ────────────────────────
  // Alleen patchen wanneer er nog géén choices-array met items aanwezig is.
  // Zo overschrijven we nooit een handmatige admin-aanpassing.
  const currentDisplayOptions = field.meta.display_options || {};
  const currentChoices = Array.isArray(currentDisplayOptions.choices)
    ? currentDisplayOptions.choices
    : [];

  if (currentChoices.length > 0) {
    console.log(`  · ${TARGET_COLLECTION}.${TARGET_FIELD} heeft al display_options.choices — ongewijzigd`);
    return;
  }

  // ─── 3. Patchen ───────────────────────────────────────────────────
  // We voegen alleen `display_options.choices` toe en laten de rest van
  // `meta.display_options` intact (in geval er andere keys staan).
  try {
    await client.patch(`/fields/${TARGET_COLLECTION}/${TARGET_FIELD}`, {
      meta: {
        display_options: {
          ...currentDisplayOptions,
          choices: WANTED_CHOICES,
        },
      },
    });
    console.log(`  ↻ ${TARGET_COLLECTION}.${TARGET_FIELD} — kleuren toegevoegd`);
  } catch (err) {
    console.warn(
      `  ⚠ patch op "${TARGET_COLLECTION}.${TARGET_FIELD}" mislukt: ` +
      `${err?.message ?? "onbekende fout"}`,
    );
  }

  console.log("✓ Stap 31 voltooid");
}
