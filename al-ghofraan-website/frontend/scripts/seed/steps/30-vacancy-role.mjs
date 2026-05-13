// scripts/seed/steps/30-vacancy-role.mjs
//
// Delivery 17 — Maakt een "Vacature beheerder" rol + bijbehorende policy
// aan voor het beheren van de /vacatures pagina.
// Delivery 18 — Uitgebreid met permissions op de nieuwe `vacancies`
// collectie (read/create/update, geen delete — archive via status).
//
// Rechten:
//   - page_content read    [filter slug=vacatures]   (hero/intro tekst)
//   - page_content update  [filter slug=vacatures]
//   - vacancies     read                              (delivery 18)
//   - vacancies     create                            (delivery 18)
//   - vacancies     update                            (delivery 18)
//   - directus_files read  (geen filter — admin moet kunnen zien wat er is)
//   - directus_files create (uploads voor rich-text body + hero_image)
//   - site_settings read   (gebruikelijk voor afdelingsrollen)
//
// BEWUST GEEN:
//   - vacancies delete             (archive via status=archived)
//   - page_content create/delete   (alleen het bestaande vacatures-record)
//   - directus_files update/delete (geen risico op andermans uploads aanraken)
//   - navigation_items toegang     (admin beheert structuur; vacatures-link
//                                   wordt door seed eenmalig aangemaakt)
//   - admin_access                 (gewone beheerder, geen admin)
//
// Patroon volgt 25-roles-policies.mjs:
//   /roles      → rol "Vacature beheerder"
//   /policies   → gelijknamige policy
//   /access     → koppelt rol ↔ policy
//   /permissions → de actuele permission-records
//
// HARDE GARANTIES (zoals stap 25):
//   - Admin-rol blijft volledig ongewijzigd.
//   - Public-policy/role blijft ongewijzigd.
//   - Bestaande users worden NOOIT gekoppeld.
//   - Geen DELETE-actie op rollen/policies/permissions.
//   - Tweede run = no-op.
//
// Bewust gedupliceerde helpers: `ensureRole`, `ensurePolicy`, `ensureAccess`,
// `ensurePermission` zijn gekopieerd uit 25-roles-policies.mjs omdat die
// daar niet zijn geëxporteerd. Bewuste DRY-overtreding om dat kritieke
// bestand byte-identiek te houden aan de baseline. Een toekomstige
// refactor kan deze helpers naar `lib/` verplaatsen — dat is niet de
// scope van delivery 17.

const ROLE_DEF = {
  name:        "Vacature beheerder",
  description: "Mag vacatures aanmaken/bewerken (geen delete) en de vacaturespagina-hero beheren. Inclusief uploads.",
  icon:        "work",
};

const POLICY_DEF = {
  name:         "Vacature beheerder",
  description:  "Vacatures (vacancies collectie) beheren + page_content/vacatures hero-tekst + bestanden uploaden.",
  icon:         "work",
  app_access:   true,
  admin_access: false,
};

// Filter dat ervoor zorgt dat de Vacature beheerder ALLEEN het
// page_content-record met slug "vacatures" kan zien en bewerken.
// Andere page_content-records blijven onzichtbaar voor deze rol.
const VACATURES_FILTER = { slug: { _eq: "vacatures" } };

export async function setupVacancyRole(client) {
  console.log("");
  console.log("30. Vacature beheerder — rol + policy + permissions");

  // ─── Bestaande collecties checken (defensief) ──────────────
  const existingCollections = await listExistingCollections(client);

  // ─── Rol + Policy + Access ─────────────────────────────────
  const role   = await ensureRole(client, ROLE_DEF);
  const policy = await ensurePolicy(client, POLICY_DEF);
  await ensureAccess(client, role.id, policy.id);

  let permsCreatedOrUpdated = 0;
  let permsSkipped          = 0;

  // ─── Permission 1: page_content read [filter slug=vacatures] ──
  if (existingCollections.has("page_content")) {
    for (const action of ["read", "update"]) {
      const changed = await ensurePermission(client, {
        policy:      policy.id,
        collection:  "page_content",
        action,
        fields:      ["*"],
        permissions: VACATURES_FILTER,
        validation:  null,
      });
      if (changed) permsCreatedOrUpdated++;
    }
  } else {
    console.log("  · page_content bestaat niet, overgeslagen");
    permsSkipped += 2;
  }

  // ─── Permission 2: vacancies read + create + update ────────────
  // Delivery 18: de "echte" vacancies-collectie. Geen filter — de
  // beheerder mag ALLE vacatures zien (ook drafts en archived), dat
  // is het hele punt van deze rol. Wel: GEEN delete-actie. Verwijderen
  // gebeurt via status=archived zodat data nooit weg is.
  if (existingCollections.has("vacancies")) {
    for (const action of ["read", "create", "update"]) {
      const changed = await ensurePermission(client, {
        policy:      policy.id,
        collection:  "vacancies",
        action,
        fields:      ["*"],
        permissions: null,
        validation:  null,
      });
      if (changed) permsCreatedOrUpdated++;
    }
  } else {
    console.log("  · vacancies bestaat niet, overgeslagen (run stap 29 eerst)");
    permsSkipped += 3;
  }

  // ─── Permission 3: directus_files read + create ────────────
  // Geen filter: de beheerder moet de hele media-library kunnen
  // doorzoeken om eerder geüploade afbeeldingen te hergebruiken.
  // Wel: geen update of delete — geen rotzooi op andermans uploads.
  for (const action of ["read", "create"]) {
    const changed = await ensurePermission(client, {
      policy:      policy.id,
      collection:  "directus_files",
      action,
      fields:      ["*"],
      permissions: null,
      validation:  null,
    });
    if (changed) permsCreatedOrUpdated++;
  }

  // ─── Permission 4: site_settings read ──────────────────────
  // Conventioneel bij afdelingsrollen — admin UI laat anders rare
  // foutmeldingen zien voor onbereikbare singleton-collecties.
  if (existingCollections.has("site_settings")) {
    const changed = await ensurePermission(client, {
      policy:      policy.id,
      collection:  "site_settings",
      action:      "read",
      fields:      ["*"],
      permissions: null,
      validation:  null,
    });
    if (changed) permsCreatedOrUpdated++;
  } else {
    console.log("  · site_settings bestaat niet, overgeslagen");
    permsSkipped += 1;
  }

  console.log(
    `  Resultaat: ${permsCreatedOrUpdated} permission(s) aangemaakt/bijgewerkt, ` +
    `${permsSkipped} overgeslagen`
  );
}

// ─── Helpers (gekopieerd uit 25-roles-policies.mjs) ───────────
// Bewuste duplicatie om dat kritieke bestand niet aan te raken.

async function listExistingCollections(client) {
  try {
    const resp = await client.get("/collections?limit=-1");
    const set = new Set();
    for (const c of resp?.data || []) {
      if (c?.collection) set.add(c.collection);
    }
    set.add("directus_files");
    set.add("directus_users");
    return set;
  } catch (err) {
    console.warn("  ⚠️  Kon collecties niet ophalen:", err.message);
    return new Set();
  }
}

async function ensureRole(client, def) {
  try {
    const resp = await client.get(
      `/roles?filter[name][_eq]=${encodeURIComponent(def.name)}&limit=1`
    );
    const existing = resp?.data?.[0];
    if (existing) {
      console.log(`  · rol "${def.name}" bestaat al (${existing.id})`);
      return { id: existing.id, created: false };
    }
  } catch (err) {
    console.warn(`  ⚠️  rol-lookup faalde voor "${def.name}":`, err.message);
  }

  try {
    const resp = await client.post("/roles", {
      name:        def.name,
      description: def.description,
      icon:        def.icon,
    });
    const id = resp?.data?.id;
    console.log(`  ✓ rol "${def.name}" aangemaakt (${id})`);
    return { id, created: true };
  } catch (err) {
    console.warn(`  ⚠️  rol "${def.name}" aanmaken mislukt:`, err.message);
    throw err;
  }
}

async function ensurePolicy(client, def) {
  try {
    const resp = await client.get(
      `/policies?filter[name][_eq]=${encodeURIComponent(def.name)}&limit=1`
    );
    const existing = resp?.data?.[0];
    if (existing) {
      console.log(`  · policy "${def.name}" bestaat al (${existing.id})`);
      return { id: existing.id, created: false };
    }
  } catch (err) {
    console.warn(`  ⚠️  policy-lookup faalde voor "${def.name}":`, err.message);
  }

  try {
    const resp = await client.post("/policies", {
      name:         def.name,
      description:  def.description,
      icon:         def.icon,
      app_access:   def.app_access ?? true,
      admin_access: def.admin_access ?? false,
    });
    const id = resp?.data?.id;
    console.log(`  ✓ policy "${def.name}" aangemaakt (${id})`);
    return { id, created: true };
  } catch (err) {
    console.warn(`  ⚠️  policy "${def.name}" aanmaken mislukt:`, err.message);
    throw err;
  }
}

async function ensureAccess(client, roleId, policyId) {
  try {
    const resp = await client.get(
      `/access?filter[role][_eq]=${roleId}&filter[policy][_eq]=${policyId}&limit=1`
    );
    if (resp?.data?.[0]) return;
  } catch (err) {
    console.warn(`  ⚠️  access-lookup faalde:`, err.message);
  }

  try {
    await client.post("/access", { role: roleId, policy: policyId, sort: 1 });
    console.log(`  ✓ access role=${roleId} ↔ policy=${policyId} gekoppeld`);
  } catch (err) {
    console.warn(`  ⚠️  access-koppeling mislukt (role=${roleId}, policy=${policyId}):`, err.message);
  }
}

async function ensurePermission(client, p) {
  let existing;
  try {
    const resp = await client.get(
      `/permissions` +
      `?filter[policy][_eq]=${p.policy}` +
      `&filter[collection][_eq]=${encodeURIComponent(p.collection)}` +
      `&filter[action][_eq]=${p.action}` +
      `&limit=1`
    );
    existing = resp?.data?.[0];
  } catch (err) {
    console.warn(`  ⚠️  permission-lookup faalde:`, err.message);
    return false;
  }

  if (existing) {
    const samePerms  = JSON.stringify(existing.permissions || null) === JSON.stringify(p.permissions || null);
    const sameFields = JSON.stringify(existing.fields || ["*"]) === JSON.stringify(p.fields);
    if (samePerms && sameFields) {
      return false;
    }
    try {
      await client.patch(`/permissions/${existing.id}`, {
        fields:      p.fields,
        permissions: p.permissions,
        validation:  p.validation,
      });
      console.log(`  ↻ permission ${p.collection}/${p.action} (policy ${p.policy}) bijgewerkt`);
      return true;
    } catch (err) {
      console.warn(`  ⚠️  permission-update faalde voor ${p.collection}/${p.action}:`, err.message);
      return false;
    }
  }

  try {
    await client.post("/permissions", p);
    console.log(`  ✓ permission ${p.collection}/${p.action} (policy ${p.policy}) aangemaakt`);
    return true;
  } catch (err) {
    console.warn(`  ⚠️  permission-create faalde voor ${p.collection}/${p.action}:`, err.message);
    return false;
  }
}
