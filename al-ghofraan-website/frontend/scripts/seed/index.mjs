// scripts/seed/index.mjs

import { loadEnv }                  from "./lib/env.mjs";
import { createClient }             from "./lib/client.mjs";
import { setupCollections }         from "./steps/01-collections.mjs";
import { setupIconFields }          from "./steps/01b-icon-fields.mjs";
import { setupCmsFields }           from "./steps/01c-cms-fields.mjs";
import { setupPageSections }        from "./steps/01d-page-sections.mjs";
import { setupSectionExtras }       from "./steps/01e-section-extras.mjs";
import { setupPageSlugInput }       from "./steps/01f-page-slug-input.mjs";
import { fixPrayerTimeFileField }   from "./steps/01g-fix-prayer-time-file-field.mjs";
import { setupPermissions }         from "./steps/02-permissions.mjs";
import { seedNavigation }           from "./steps/03-navigation.mjs";
import { seedSiteSettings }         from "./steps/04-site-settings.mjs";
import { seedPageContent }          from "./steps/05-page-content.mjs";
import { seedFaq }                  from "./steps/06-faq.mjs";
import { seedActivities }           from "./steps/07-activities.mjs";
import { seedIconSettings }         from "./steps/08-icon-settings.mjs";
import { seedPageSections }         from "./steps/09-page-sections.mjs";
import { seedExamplePages }         from "./steps/10-example-pages.mjs";

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
  await setupCollections(client);        // 1.  basis-collecties
  await setupIconFields(client);         // 1b. icon-velden + icon_settings
  await setupCmsFields(client);          // 1c. extra site_settings + nav velden
  await setupPageSections(client);       // 1d. page_sections + page_section_items
  await setupSectionExtras(client);      // 1e. extra section + item velden
  await setupPageSlugInput(client);      // 1f. page_slug dropdown → input
  await fixPrayerTimeFileField(client);  // 1g. file-veld relatie repareren
  await setupPermissions(client);        // 2.  permissies
  await seedNavigation(client);          // 3.  menu
  await seedSiteSettings(client);        // 4.  site-instellingen
  await seedPageContent(client);         // 5.  pagina's
  await seedFaq(client);                 // 6.  faq
  await seedActivities(client);          // 7.  activiteiten
  await seedIconSettings(client);        // 8.  icon-settings
  await seedPageSections(client);        // 9.  voorbeeld-secties
  await seedExamplePages(client);        // 10. voorbeeld dynamische pagina

  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   ✅  Seed voltooid                                  ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
} catch (err) {
  console.error("");
  console.error("❌  Seed mislukt:");
  console.error(err.message);
  if (err.cause) console.error("Oorzaak:", err.cause);
  if (err.errors) console.error("Details:", JSON.stringify(err.errors, null, 2));
  process.exit(1);
}
