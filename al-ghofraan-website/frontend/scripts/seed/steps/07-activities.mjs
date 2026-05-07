// scripts/seed/steps/07-activities.mjs
//
// Vroeger maakte deze stap twee voorbeeldactiviteiten aan ("Vrijdagslezing
// Tawakkul" en "Open dag Moskee Al-Ghofraan") met dynamisch gegenereerde
// datums. Voor productie ongewenst: zo verschijnen er fake activiteiten op
// de homepage zodra de seed loopt.
//
// De activities-collectie zelf wordt nog steeds aangemaakt in stap 1
// (collections). Deze stap maakt geen items meer aan — de admin voegt
// activiteiten zelf toe via Directus.
//
// We laten de export staan zodat scripts/seed/index.mjs onveranderd blijft.

export async function seedActivities(_client) {
  console.log("\n📅 Stap 7 · Activiteiten");
  console.log("  · geen seed-items — admin voegt activiteiten zelf toe via Directus");
  console.log("✓ Stap 7 voltooid");
}
