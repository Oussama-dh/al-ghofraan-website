// scripts/seed/steps/02-permissions.mjs
// Directus 11 — gebruikt het policies-model.

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
  { collection: "donation_campaigns", filter: { status:    { _eq: "published" } } },
  { collection: "articles",           filter: { status:    { _eq: "published" } } },
  { collection: "videos",             filter: { status:    { _eq: "published" } } },
  { collection: "tv_announcements",   filter: { status:    { _eq: "published" } } },
  { collection: "hijri_date_overrides", filter: { active:  { _eq: true       } } },
  { collection: "contact_subjects",   filter: { status:    { _eq: "published" } } },
  { collection: "article_categories", filter: { status:    { _eq: "published" } } },
  { collection: "video_categories",   filter: { status:    { _eq: "published" } } },
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

  for (const { collection, filter } of COLLECTIONS) {
    const key = `${collection}:read`;
    const payload = {
      policy:      publicPolicy.id,
      collection,
      action:      "read",
      permissions: filter,
      validation:  null,
      presets:     null,
      fields:      ["*"],
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
