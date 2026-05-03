// scripts/seed/index.mjs
// Hoofdscript: logt in op Directus, voert alle setup-stappen uit.
//
// Gebruik:  node scripts/seed/index.mjs
// Of via:   npm run seed   (zie package.json)
//
// IDEMPOTENT: kan meerdere keren gedraaid worden.
//   - Bestaande collecties worden niet opnieuw aangemaakt
//   - Bestaande velden worden niet opnieuw aangemaakt
//   - Bestaande items worden geüpdatet (op basis van een natural key)

import { loadEnv }            from "./lib/env.mjs";
import { createClient }       from "./lib/client.mjs";
import { setupCollections }   from "./steps/01-collections.mjs";
import { setupPermissions }   from "./steps/02-permissions.mjs";
import { seedNavigation }     from "./steps/03-navigation.mjs";
import { seedSiteSettings }   from "./steps/04-site-settings.mjs";
import { seedPageContent }    from "./steps/05-page-content.mjs";
import { seedFaq }            from "./steps/06-faq.mjs";
import { seedActivities }     from "./steps/07-activities.mjs";

const env = loadEnv();

console.log("");
console.log("╔══════════════════════════════════════════════════════╗");
console.log("║   Al-Ghofraan — Directus seed                        ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log("");
console.log(`→ Directus URL : ${env.DIRECTUS_URL}`);
console.log(`→ Admin email  : ${env.DIRECTUS_ADMIN_EMAIL}`);
console.log("");

const client = await createClient(env);

try {
  await setupCollections(client);
  await setupPermissions(client);
  await seedNavigation(client);
  await seedSiteSettings(client);
  await seedPageContent(client);
  await seedFaq(client);
  await seedActivities(client);

  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   ✅  Seed voltooid                                  ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Volgende stappen:");
  console.log("  1. Bezoek http://localhost:8055 om de data te bekijken");
  console.log("  2. Bezoek http://localhost:3000 om de site te zien");
  console.log("  3. Maak een API token aan en zet deze in .env (zie README)");
  console.log("");
} catch (err) {
  console.error("");
  console.error("❌  Seed mislukt:");
  console.error(err.message);
  if (err.cause) console.error("Oorzaak:", err.cause);
  if (err.errors) console.error("Details:", JSON.stringify(err.errors, null, 2));
  process.exit(1);
}
