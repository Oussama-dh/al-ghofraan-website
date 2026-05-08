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
import { setupEducationPrograms }   from "./steps/11-education-programs.mjs";
import { setupRegistrations }       from "./steps/12-registrations.mjs";
import { setupRegistrationRelations } from "./steps/13-registration-relations.mjs";
import { setupDonations }           from "./steps/14-donations.mjs";
import { setupDonationCampaigns }   from "./steps/15-donation-campaigns.mjs";
import { setupPaymentLinkFields }   from "./steps/15b-payment-link-fields.mjs";
import { setupArticles }            from "./steps/16-articles.mjs";
import { setupContact }             from "./steps/17-contact.mjs";
import { setupPrivacy }             from "./steps/18-privacy.mjs";
import { setupVideos }              from "./steps/19-videos.mjs";
import { setupPageHeaders }         from "./steps/20-page-headers.mjs";
import { setupTvAnnouncements }     from "./steps/21-tv-announcements.mjs";
import { setupContactSubjects }     from "./steps/22-contact-subjects.mjs";
import { setupArticleCategories }   from "./steps/23-article-categories.mjs";
import { setupVideoCategories }     from "./steps/24-video-categories.mjs";
import { setupFollowupFields }      from "./steps/12b-followup-fields.mjs";
import { setupTargetGender }        from "./steps/01h-target-gender.mjs";
import { setupFooterFields }        from "./steps/01i-footer-fields.mjs";
import { setupFileImageFields }     from "./steps/01j-file-image-fields.mjs";
import { setupTvSettings }          from "./steps/01k-tv-settings.mjs";
import { setupHijriOverrides }      from "./steps/01l-hijri-overrides.mjs";
import { setupRegistrationTermsFields } from "./steps/04b-registration-terms-fields.mjs";
import { setupRegistrationContentFields } from "./steps/11b-registration-content-fields.mjs";
import { setupEducationFlowFields } from "./steps/11c-education-flow-fields.mjs";
import { setupEducationFields }     from "./steps/12c-education-fields.mjs";
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
  await setupEducationPrograms(client);     // 11. education_programs (collectie + voorbeelden)
  await setupRegistrations(client);         // 12. registrations (alleen collectie — geen public access)
  await setupRegistrationRelations(client); // 13. opruimen oude/verkeerde registrations-relaties
  await setupDonations(client);             // 14. donations (Stripe-gevuld, geen public access)
  await setupDonationCampaigns(client);     // 15. donation_campaigns (publiek leesbaar als published)
  await setupPaymentLinkFields(client);     // 15b. Payment Link-velden op donation_campaigns
  await setupArticles(client);              // 16. articles (publiek leesbaar als published)
  await setupContact(client);               // 17. contact_messages (admin-only) + page_content + WhatsApp velden
  await setupPrivacy(client);               // 18. privacyverklaring (page_content) + footer nav-item
  await setupVideos(client);                // 19. videos (publiek leesbaar als published)
  await setupPageHeaders(client);           // 20. arabic_title veld + soft-create page_content voor vaste routes
  await setupTvAnnouncements(client);       // 21. tv_announcements (publiek leesbaar als published)
  await setupContactSubjects(client);       // 22. contact_subjects (publiek leesbaar als published)
  await setupArticleCategories(client);     // 23. article_categories (publiek leesbaar als published)
  await setupVideoCategories(client);       // 24. video_categories + extra velden op videos
  await setupFollowupFields(client);        // 12b. opvolgvelden op contact_messages + registrations (na 12 en 17)
  await setupEducationFields(client);       // 12c. onderwijs-velden op registrations (student_number, parent_*, group_id)
  await setupTargetGender(client);          // 1h. target_gender velden + gender keuzes bijwerken
  await setupFooterFields(client);          // 1i. footer + branding velden in site_settings
  await setupFileImageFields(client);       // 1j. heel alle file/image velden naar correcte interface
  await setupTvSettings(client);            // 1k. TV display-instellingen (tv_prayer_slide_seconds etc.)
  await setupHijriOverrides(client);        // 1l. hijri_date_overrides collectie
  await setupPermissions(client);           // 2.  permissies (NA alle collecties!)
  await seedNavigation(client);          // 3.  menu
  await seedSiteSettings(client);        // 4.  site-instellingen
  await setupRegistrationTermsFields(client); // 4b. voorwaarden-velden op site_settings
  await seedPageContent(client);         // 5.  pagina's
  await seedFaq(client);                 // 6.  faq
  await seedActivities(client);          // 7.  activiteiten
  await setupRegistrationContentFields(client); // 11b. beheerbare inschrijfteksten op education_programs + activities
  await setupEducationFlowFields(client);    // 11c. onderwijs-flow toggles op education_programs (form-zichtbaarheid, voorwaarden, multi-student)
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
