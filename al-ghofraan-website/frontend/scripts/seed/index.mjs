// scripts/seed/index.mjs
//
// Directus seed-runner met CLI-opties voor selectieve uitvoering.
//
// Backward compatibility: `npm run seed` zonder flags draait alle
// stappen in EXACT dezelfde volgorde als voorheen. De refactor raakt
// alleen de runner — geen seed-stap zelf is gewijzigd.
//
// CLI-opties (delivery selective-seed):
//   npm run seed                           Alles, in array-volgorde
//   npm run seed -- --list                 Toon beschikbare stappen
//   npm run seed -- --only 45              Alleen stap 45
//   npm run seed -- --only 43,44,45        Drie specifieke stappen
//   npm run seed -- --from 43              Vanaf 43 tot einde
//   npm run seed -- --to 25                Van begin tot 25 inclusief
//   npm run seed -- --from 43 --to 45      Range (inclusief beide kanten)
//
// Belangrijke regels:
//   - `--from`/`--to` werken op ARRAY-POSITIE (de volgorde in STEPS
//     hieronder), niet op numerieke ID. Reden: huidige volgorde is
//     bewust niet numeriek (bv. 12b komt ná 24, 4b ná 25).
//   - `--only` matcht op exacte step-id (strings: "1", "1b", "12b").
//   - Onbekende stap-IDs → duidelijke foutmelding + lijst van geldige.
//   - `--only` mag niet samen met `--from`/`--to`.
//   - Stap-IDs zijn strings; vergelijk altijd via String() om typo's
//     met getallen vs strings te voorkomen.

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
import { setupRolesAndPolicies }    from "./steps/25-roles-policies.mjs";
import { setupAdminListLayouts }    from "./steps/26-admin-list-layouts.mjs";
import { setupRichTextToolbar }    from "./steps/27-rich-text-toolbar.mjs";
import { setupHeroBackground }     from "./steps/28-hero-background.mjs";
import { setupVacatures }          from "./steps/29-vacatures.mjs";
import { setupVacancyRole }        from "./steps/30-vacancy-role.mjs";
import { setupVacancyStatusColors } from "./steps/31-vacancy-status-colors.mjs";
import { setupPrayerCalendarHighlights } from "./steps/32-prayer-calendar-highlights.mjs";
import { setupMosqueLogo }          from "./steps/33-mosque-logo.mjs";
import { setupCheckInFields }       from "./steps/34-check-in-fields.mjs";
import { setupVisitorConfirmationFields } from "./steps/35-visitor-confirmation-fields.mjs";
import { setupCheckInSettings }    from "./steps/36-check-in-settings.mjs";
import { setupNavigationParent }   from "./steps/37-navigation-parent.mjs";
import { setupEducationCategories } from "./steps/38-education-categories.mjs";
import { setupHomepageCtaContent }  from "./steps/39-homepage-cta-content.mjs";
import { setupPageSectionsAyahWhatsapp } from "./steps/40-page-sections-ayah-whatsapp.mjs";
import { setupRecurringActivities }      from "./steps/41-recurring-activities.mjs";
import { setupOccurrencePickerToggle }   from "./steps/42-occurrence-picker-toggle.mjs";
import { setupVideoImportFields }        from "./steps/43-video-import-fields.mjs";
import { setupContactMapsFields }        from "./steps/44-contact-maps-fields.mjs";
import { setupDailyHadiths }             from "./steps/45-daily-hadiths.mjs";
import { setupAhadiethRole }             from "./steps/46-ahadieth-role.mjs";
import { setupCtaAyahReferenceTranslation } from "./steps/47-cta-ayah-reference-translation.mjs";
import { setupEmailFields }         from "./steps/04c-email-fields.mjs";
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
import { setupActivityFormFields }  from "./steps/07b-activity-form-fields.mjs";
import { seedIconSettings }         from "./steps/08-icon-settings.mjs";
import { seedPageSections }         from "./steps/09-page-sections.mjs";
import { seedExamplePages }         from "./steps/10-example-pages.mjs";

// ─── Step-array — single source of truth ───────────────────────
//
// Volgorde komt EXACT overeen met de oude await-keten zodat
// `npm run seed` zonder flags identiek gedrag heeft als vóór deze
// refactor. Wijzig de volgorde alleen met dezelfde voorzichtigheid
// als bij de oorspronkelijke keten — sommige stappen hebben impliciete
// dependencies (bv. permissies NA collecties, rollen NA permissies).

const STEPS = [
  { id: "1",   label: "Basis-collecties",                                       run: setupCollections },
  { id: "1b",  label: "Icon-velden + icon_settings",                            run: setupIconFields },
  { id: "1c",  label: "Extra site_settings + nav velden",                       run: setupCmsFields },
  { id: "1d",  label: "page_sections + page_section_items",                     run: setupPageSections },
  { id: "1e",  label: "Extra section + item velden",                            run: setupSectionExtras },
  { id: "1f",  label: "page_slug dropdown → input",                             run: setupPageSlugInput },
  { id: "1g",  label: "file-veld relatie repareren",                            run: fixPrayerTimeFileField },
  { id: "11",  label: "education_programs",                                     run: setupEducationPrograms },
  { id: "12",  label: "registrations (alleen collectie)",                       run: setupRegistrations },
  { id: "13",  label: "registration-relaties opruimen",                         run: setupRegistrationRelations },
  { id: "14",  label: "donations (Stripe-gevuld)",                              run: setupDonations },
  { id: "15",  label: "donation_campaigns",                                     run: setupDonationCampaigns },
  { id: "15b", label: "Payment Link-velden op donation_campaigns",              run: setupPaymentLinkFields },
  { id: "16",  label: "articles",                                               run: setupArticles },
  { id: "17",  label: "contact_messages + WhatsApp velden",                     run: setupContact },
  { id: "18",  label: "Privacyverklaring + footer nav-item",                    run: setupPrivacy },
  { id: "19",  label: "videos",                                                 run: setupVideos },
  { id: "20",  label: "arabic_title veld + page_content soft-create",           run: setupPageHeaders },
  { id: "21",  label: "tv_announcements",                                       run: setupTvAnnouncements },
  { id: "22",  label: "contact_subjects",                                       run: setupContactSubjects },
  { id: "23",  label: "article_categories",                                     run: setupArticleCategories },
  { id: "24",  label: "video_categories + extra velden op videos",              run: setupVideoCategories },
  { id: "12b", label: "Opvolgvelden op contact_messages + registrations",       run: setupFollowupFields },
  { id: "12c", label: "Onderwijs-velden op registrations",                      run: setupEducationFields },
  { id: "1h",  label: "target_gender velden + gender keuzes",                   run: setupTargetGender },
  { id: "1i",  label: "Footer + branding velden in site_settings",              run: setupFooterFields },
  { id: "1j",  label: "Alle file/image velden naar correcte interface",         run: setupFileImageFields },
  { id: "1k",  label: "TV display-instellingen",                                run: setupTvSettings },
  { id: "1l",  label: "hijri_date_overrides collectie",                         run: setupHijriOverrides },
  { id: "2",   label: "Permissies (NA alle collecties)",                        run: setupPermissions },
  { id: "25",  label: "Afdelingsrollen + policies",                             run: setupRolesAndPolicies },
  { id: "3",   label: "Navigatie/menu",                                         run: seedNavigation },
  { id: "4",   label: "Site-instellingen",                                      run: seedSiteSettings },
  { id: "4b",  label: "Voorwaarden-velden op site_settings",                    run: setupRegistrationTermsFields },
  { id: "4c",  label: "E-mailnotificatie-velden op site_settings",              run: setupEmailFields },
  { id: "5",   label: "Pagina's (page_content)",                                run: seedPageContent },
  { id: "6",   label: "FAQ",                                                    run: seedFaq },
  { id: "7",   label: "Activiteiten",                                           run: seedActivities },
  { id: "7b",  label: "Inschrijfformulier-velden op activities",                run: setupActivityFormFields },
  { id: "11b", label: "Beheerbare inschrijfteksten",                            run: setupRegistrationContentFields },
  { id: "11c", label: "Onderwijs-flow toggles op education_programs",           run: setupEducationFlowFields },
  { id: "8",   label: "Icon-settings",                                          run: seedIconSettings },
  { id: "9",   label: "Voorbeeld-secties (page_sections)",                      run: seedPageSections },
  { id: "10",  label: "Voorbeeld dynamische pagina",                            run: seedExamplePages },
  { id: "26",  label: "Admin-lijst layouts",                                    run: setupAdminListLayouts },
  { id: "27",  label: "Rich-text WYSIWYG toolbar",                              run: setupRichTextToolbar },
  { id: "28",  label: "hero_background_image veld op page_content",             run: setupHeroBackground },
  { id: "29",  label: "/vacatures page_content + nav-item",                     run: setupVacatures },
  { id: "30",  label: "Vacature beheerder rol + policy",                        run: setupVacancyRole },
  { id: "31",  label: "Kleurcodering vacancies.status",                         run: setupVacancyStatusColors },
  { id: "32",  label: "Kalender-highlights voor gebedstijden",                  run: setupPrayerCalendarHighlights },
  { id: "33",  label: "mosque_logo veld op page_content",                       run: setupMosqueLogo },
  { id: "34",  label: "Check-in velden op registrations (QR)",                  run: setupCheckInFields },
  { id: "35",  label: "Bezoeker-bevestigingsmail velden",                       run: setupVisitorConfirmationFields },
  { id: "36",  label: "Organisator-code + sessieduur",                          run: setupCheckInSettings },
  { id: "37",  label: "navigation_items.parent + 'Onze moskee'",                run: setupNavigationParent },
  { id: "38",  label: "education_categories + category_ref",                    run: setupEducationCategories },
  { id: "39",  label: "Homepage/doneren ayah + CTA + WhatsApp velden",          run: setupHomepageCtaContent },
  { id: "40",  label: "page_sections type-uitbreiding + ayah-velden (on hold)", run: setupPageSectionsAyahWhatsapp },
  { id: "41",  label: "Recurring-velden + occurrence-velden",                   run: setupRecurringActivities },
  { id: "42",  label: "show_occurrence_picker toggle",                          run: setupOccurrencePickerToggle },
  { id: "43",  label: "YouTube-import velden op videos",                        run: setupVideoImportFields },
  { id: "44",  label: "Maps-velden op site_settings",                           run: setupContactMapsFields },
  { id: "45",  label: "daily_hadiths collectie + sample",                       run: setupDailyHadiths },
  { id: "46",  label: "Rol 'Ahadieth beheerder' (daily_hadiths + TV-hadieth)",  run: setupAhadiethRole },
  { id: "47",  label: "CTA-ayah: vertaling-veld op page_sections",              run: setupCtaAyahReferenceTranslation },
];

// ─── CLI-argument parsing ──────────────────────────────────────

function parseArgs(argv) {
  const out = { only: null, from: null, to: null, list: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list")             { out.list = true; continue; }
    if (a === "--help" || a === "-h") { out.help = true; continue; }
    if (a === "--only") { out.only = String(argv[++i] || "").trim(); continue; }
    if (a === "--from") { out.from = String(argv[++i] || "").trim(); continue; }
    if (a === "--to")   { out.to   = String(argv[++i] || "").trim(); continue; }
    // `--only=43,44,45` vorm (combined form) ook ondersteunen.
    if (a.startsWith("--only=")) { out.only = a.slice(7).trim(); continue; }
    if (a.startsWith("--from=")) { out.from = a.slice(7).trim(); continue; }
    if (a.startsWith("--to="))   { out.to   = a.slice(5).trim(); continue; }
    console.error(`⚠️  Onbekend argument: "${a}" (gebruik --help)`);
    process.exit(2);
  }
  return out;
}

function printHelp() {
  console.log("");
  console.log("Al-Ghofraan — Directus seed-runner");
  console.log("");
  console.log("Gebruik:");
  console.log("  npm run seed                          Alles draaien (default)");
  console.log("  npm run seed -- --list                Toon alle stappen");
  console.log("  npm run seed -- --only 45             Draai alleen stap 45");
  console.log("  npm run seed -- --only 43,44,45       Draai meerdere stappen");
  console.log("  npm run seed -- --from 43             Vanaf stap 43 tot einde");
  console.log("  npm run seed -- --to 25               Van begin tot stap 25");
  console.log("  npm run seed -- --from 43 --to 45     Range (incl. beide kanten)");
  console.log("");
  console.log("Stap-IDs zijn strings: '1', '1b', '12b', '43'. `--from`/`--to`");
  console.log("gebruiken de array-volgorde (niet numeriek), zodat de keten");
  console.log("dezelfde afhankelijkheidsvolgorde respecteert als zonder flags.");
  console.log("");
}

function printList() {
  console.log("");
  console.log("Beschikbare seed-stappen (in uitvoer-volgorde):");
  console.log("");
  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    console.log(`  ${String(i + 1).padStart(3, " ")}. [${s.id.padEnd(3, " ")}]  ${s.label}`);
  }
  console.log("");
  console.log(`Totaal: ${STEPS.length} stappen.`);
  console.log("");
}

/**
 * Reduceer STEPS naar de selectie op basis van CLI-flags.
 * Retourneert { steps, skipped } of throwt bij ongeldige selectie.
 */
function resolveSelection(args) {
  const allIds = STEPS.map((s) => s.id);

  // --only heeft voorrang en sluit --from/--to uit.
  if (args.only) {
    if (args.from || args.to) {
      throw new Error("`--only` kan niet samen met `--from`/`--to` worden gebruikt.");
    }
    const requested = args.only.split(",").map((s) => s.trim()).filter(Boolean);
    if (requested.length === 0) {
      throw new Error("`--only` heeft minstens één stap-id nodig.");
    }
    const unknown = requested.filter((id) => !allIds.includes(id));
    if (unknown.length > 0) {
      throw new Error(
        `Onbekende stap-id(s): ${unknown.map((u) => `"${u}"`).join(", ")}.\n` +
        `Gebruik --list voor de volledige lijst.`,
      );
    }
    // Behoud array-volgorde, niet de volgorde waarin de user ze opgaf.
    const set = new Set(requested);
    const selected = STEPS.filter((s) => set.has(s.id));
    const skipped  = STEPS.filter((s) => !set.has(s.id));
    return { steps: selected, skipped };
  }

  // --from / --to gebruiken array-positie.
  let fromIdx = 0;
  let toIdx   = STEPS.length - 1;

  if (args.from) {
    const idx = allIds.indexOf(args.from);
    if (idx === -1) {
      throw new Error(`Onbekende stap-id voor --from: "${args.from}". Gebruik --list.`);
    }
    fromIdx = idx;
  }
  if (args.to) {
    const idx = allIds.indexOf(args.to);
    if (idx === -1) {
      throw new Error(`Onbekende stap-id voor --to: "${args.to}". Gebruik --list.`);
    }
    toIdx = idx;
  }
  if (fromIdx > toIdx) {
    throw new Error(
      `Range is leeg: --from "${args.from}" (positie ${fromIdx + 1}) ligt ná ` +
      `--to "${args.to}" (positie ${toIdx + 1}) in de uitvoer-volgorde.`,
    );
  }

  const selected = STEPS.slice(fromIdx, toIdx + 1);
  const skipped  = [
    ...STEPS.slice(0, fromIdx),
    ...STEPS.slice(toIdx + 1),
  ];
  return { steps: selected, skipped };
}

// ─── Main ──────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}
if (args.list) {
  printList();
  process.exit(0);
}

let selection;
try {
  selection = resolveSelection(args);
} catch (err) {
  console.error("");
  console.error(`❌  ${err.message}`);
  console.error("");
  process.exit(2);
}

const env = loadEnv();

console.log("");
console.log("╔══════════════════════════════════════════════════════╗");
console.log("║   Al-Ghofraan — Directus seed                        ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log("");
console.log(`→ Directus URL : ${env.DIRECTUS_URL}`);
console.log(`→ Admin email  : ${env.DIRECTUS_ADMIN_EMAIL}`);

// Selectie-overzicht
const isPartial = selection.steps.length !== STEPS.length;
if (isPartial) {
  console.log("");
  console.log(`→ Modus        : SELECTIEF (${selection.steps.length} van ${STEPS.length} stappen)`);
  if (args.only) console.log(`→ --only       : ${args.only}`);
  if (args.from) console.log(`→ --from       : ${args.from}`);
  if (args.to)   console.log(`→ --to         : ${args.to}`);
  console.log("");
  console.log("Uitvoeren:");
  for (const s of selection.steps) {
    console.log(`  ✓ [${s.id.padEnd(3, " ")}]  ${s.label}`);
  }
  if (selection.skipped.length > 0) {
    console.log("");
    console.log(`Overgeslagen (${selection.skipped.length}):`);
    // Compact: alleen ID's, geen labels, anders is de output te lang.
    const skippedIds = selection.skipped.map((s) => s.id).join(", ");
    console.log(`  · ${skippedIds}`);
  }
} else {
  console.log("");
  console.log(`→ Modus        : VOLLEDIG (${STEPS.length} stappen)`);
}
console.log("");

const client = await createClient(env);

try {
  for (const step of selection.steps) {
    await step.run(client);
  }

  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  if (isPartial) {
    console.log(`║   ✅  Seed voltooid (${selection.steps.length} stappen)${" ".repeat(Math.max(0, 31 - String(selection.steps.length).length))}║`);
  } else {
    console.log("║   ✅  Seed voltooid                                  ║");
  }
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
