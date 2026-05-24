// scripts/seed/steps/02-permissions.mjs
// Directus 11 — gebruikt het policies-model.
//
// Per collectie kan optioneel een expliciete `fields`-whitelist worden
// opgegeven. Default = ["*"] (alle velden publiek leesbaar). Voor
// gevoelige collecties met admin-only velden geef je een whitelist
// op om defense-in-depth te krijgen — de frontend-query alleen
// inperken is fragiel (één developer die ?fields=* doet en het lek
// is open).

// Publieke whitelist voor donation_campaigns. Sluit BEWUST
// manual_raised_note uit — dat is een interne admin-notitie.
// Houd deze lijst in sync met CAMPAIGN_FIELDS in lib/directus.ts
// EN met dezelfde array in seed-stap 54 (productie-patch).
// Nieuwe velden moeten expliciet hier worden toegevoegd om
// publiek leesbaar te zijn. Default-secure.
const DONATION_CAMPAIGN_PUBLIC_FIELDS = [
  "id", "status", "title", "slug", "description", "image",
  "allow_one_time", "allow_monthly",
  "suggested_amounts", "default_amount",
  "featured", "sort",
  "use_stripe_payment_link", "stripe_payment_link_url", "stripe_payment_link_id",
  "short_text", "show_progress",
  "goal_amount_eur", "manual_raised_amount_eur",
  "manual_monthly_donor_count", "progress_default_open", "show_on_homepage",
  // Delivery TV-A — show_on_tv toegevoegd aan publieke whitelist.
  "show_on_tv",
  // Delivery 57 — legacy cent-velden verwijderd (goal_amount,
  // goal_amount_display, raised_amount, raised_amount_display).
  // BEWUST UITGESLOTEN: manual_raised_note (interne admin-notitie).
];

const COLLECTIONS = [
  { collection: "activities",         filter: { status:    { _eq: "published" } } },
  { collection: "prayer_time_files",  filter: { active:    { _eq: true       } } },
  { collection: "site_settings",      filter: null },
  { collection: "navigation_items",   filter: { active:    { _eq: true       } } },
  { collection: "page_content",       filter: { status:    { _eq: "published" } } },
  { collection: "faq_items",          filter: { published: { _eq: true       } } },
  { collection: "icon_settings",      filter: null },
  { collection: "page_sections",      filter: { active:    { _eq: true       } } },
  { collection: "page_section_items", filter: { active:    { _eq: true       } } },
  { collection: "education_programs", filter: { status:    { _eq: "published" } } },
  // Delivery donation-campaign-progress-v2 — fields-whitelist sluit
  // manual_raised_note expliciet uit van publieke leesbaarheid.
  {
    collection: "donation_campaigns",
    filter:     { status: { _eq: "published" } },
    fields:     DONATION_CAMPAIGN_PUBLIC_FIELDS,
  },
  { collection: "articles",           filter: { status:    { _eq: "published" } } },
  { collection: "videos",             filter: { status:    { _eq: "published" } } },
  { collection: "tv_announcements",   filter: { status:    { _eq: "published" } } },
  { collection: "hijri_date_overrides", filter: { active:  { _eq: true       } } },
  { collection: "contact_subjects",   filter: { status:    { _eq: "published" } } },
  { collection: "article_categories", filter: { status:    { _eq: "published" } } },
  { collection: "video_categories",   filter: { status:    { _eq: "published" } } },
  { collection: "education_categories", filter: { status:  { _eq: "published" } } },
  { collection: "vacancies",          filter: { status:    { _eq: "published" } } },
  // Delivery 21 — kalender-highlights worden door /gebedstijden en
  // /gebedstijden/overzicht gelezen. Filter op published; show_on_calendar
  // wordt apart afgedwongen in `getPrayerCalendarHighlights`.
  { collection: "prayer_calendar_highlights", filter: { status: { _eq: "published" } } },
  // Delivery daily-hadith — public read alleen voor published + active items.
  // Filter zorgt dat draft of inactive hadiths niet uitlekken.
  {
    collection: "daily_hadiths",
    filter: { _and: [{ status: { _eq: "published" } }, { active: { _eq: true } }] },
  },
  // BEWUST GEEN public-permissies voor `registrations`, `donations` en
  // `contact_messages`: die routes schrijven server-side via DIRECTUS_TOKEN.
  { collection: "directus_files",     filter: null },
];

export async function setupPermissions(client) {
  console.log("\n🔐 Stap 2 · Public read-permissies (Directus 11 policies)");

  const publicPolicy = await findPublicPolicy(client);

  if (!publicPolicy) {
    console.warn("⚠️  Public-policy niet gevonden — zie PUBLIC_PERMISSIONS_FALLBACK.md");
    return;
  }

  console.log(`  · Public policy gevonden: ${publicPolicy.id} (${publicPolicy.name || "Public"})`);

  let existingPerms;
  try {
    const resp = await client.get(`/permissions?filter[policy][_eq]=${publicPolicy.id}&limit=-1`);
    existingPerms = resp?.data || [];
  } catch (err) {
    console.warn("⚠️  Kon bestaande permissies niet ophalen:", err.message);
    return;
  }

  const existingMap = new Map();
  for (const perm of existingPerms) {
    existingMap.set(`${perm.collection}:${perm.action}`, perm);
  }

  let success = 0, failed = 0;

  for (const { collection, filter, fields } of COLLECTIONS) {
    const key = `${collection}:read`;
    const payload = {
      policy:      publicPolicy.id,
      collection,
      action:      "read",
      permissions: filter,
      validation:  null,
      presets:     null,
      // Per-collectie expliciete whitelist mogelijk (default = ["*"]).
      // Gebruikt door donation_campaigns om manual_raised_note uit te
      // sluiten van publieke leesbaarheid. Houd deze whitelist in sync
      // met CAMPAIGN_FIELDS in lib/directus.ts.
      fields:      fields ?? ["*"],
    };

    try {
      if (existingMap.has(key)) {
        const perm = existingMap.get(key);
        await client.patch(`/permissions/${perm.id}`, payload);
        console.log(`  ↻ ${collection}: read-permissie geüpdatet`);
      } else {
        await client.post("/permissions", payload);
        console.log(`  ✓ ${collection}: read-permissie aangemaakt`);
      }
      success++;
    } catch (err) {
      console.warn(`  ⚠️  ${collection}: ${err.message}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.warn(`⚠️  ${failed}/${COLLECTIONS.length} permissies faalden`);
  } else {
    console.log(`✓ Stap 2 voltooid (${success} permissies)`);
  }
}

async function findPublicPolicy(client) {
  try {
    const resp = await client.get(`/policies?filter[name][_eq]=Public&limit=1`);
    if (resp?.data?.[0]) return resp.data[0];
  } catch { /* fall through */ }

  try {
    const resp = await client.get(`/policies?limit=-1`);
    const policies = resp?.data || [];
    const byName = policies.find((p) => (p.name || "").toLowerCase() === "public");
    if (byName) return byName;
    const byIcon = policies.find((p) => p.icon === "public");
    if (byIcon) return byIcon;
  } catch (err) {
    console.warn("  · /policies endpoint niet bereikbaar:", err.message);
  }

  return null;
}
