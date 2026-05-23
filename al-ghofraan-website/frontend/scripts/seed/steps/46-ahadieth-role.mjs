// scripts/seed/steps/46-ahadieth-role.mjs
//
// Voegt een nieuwe afdelingsrol "Ahadieth beheerder" toe voor het
// beheren van ahadieth-content op de website + TV-scherm.
//
// Permissions:
//   manage (CRU, geen delete):
//     - daily_hadiths              ("Hadieth van de dag" op homepage)
//
//   filtered manage (CRU + validation, geen delete):
//     - tv_announcements waar type=hadith ("Hadieth"-aankondigingen op TV)
//       * read  → permissions-filter type=hadith
//       * update → permissions-filter type=hadith
//       * create → validation type=hadith (zodat nieuwe items
//                  alleen als hadith kunnen worden aangemaakt; voorkomt
//                  dat de Ahadieth-beheerder accidenteel een
//                  "announcement" of "reminder" maakt)
//
//   read:
//     - site_settings   (admin UI vereist read op site_settings voor
//                        diverse interface-elementen)
//     - directus_files  (voor evt. media in arabic_text / explanation)
//
// HARDE GARANTIES (gelijk aan stap 25):
//   - Bestaande rollen/policies/permissions ongewijzigd.
//   - Tweede run = no-op (alle ensure-functies controleren eerst).
//   - Geen DELETE-rechten.
//   - Geen koppeling aan bestaande users — admin koppelt handmatig.
//
// Helpers (ensureRole/ensurePolicy/ensureAccess/ensurePermission) zijn
// hieronder gedupliceerd vanuit stap 25. Bewust gekozen voor lokale
// duplicatie om stap 25 niet te hoeven aanraken in deze delivery
// (klein-en-veilig). Bij een volgende refactor kunnen ze naar
// scripts/seed/lib/role-helpers.mjs.

// ─── Rol-definitie ────────────────────────────────────────────

const ROLE_DEF = {
  role: {
    name:        "Ahadieth beheerder",
    description: "Hadieth van de dag (daily_hadiths) + TV-aankondigingen met type=hadith.",
    icon:        "menu_book",
  },
  manage: [
    "daily_hadiths",
  ],
  // Bewust GEEN site_settings — Ahadieth beheerder heeft alleen
  // toegang tot ahadieth-content. directus_files blijft read voor
  // het laden van eventuele media in arabic_text / explanation_short.
  read: [
    "directus_files",
  ],
  // Filtered access: read/update via permissions-filter, create via
  // validation-filter. Beide expressies identiek: type === "hadith".
  filteredAccess: [
    {
      collection: "tv_announcements",
      actions:    ["read", "update"],
      filter:     { type: { _eq: "hadith" } },
    },
  ],
  // Create wordt apart afgehandeld omdat Directus 11 voor create de
  // `validation` parameter gebruikt ipv `permissions`.
  validatedCreate: [
    {
      collection: "tv_announcements",
      validation: { type: { _eq: "hadith" } },
    },
  ],
};

// ─── Hoofd-entry ──────────────────────────────────────────────

export async function setupAhadiethRole(client) {
  console.log("\n📖 Stap 46 · Rol 'Ahadieth beheerder'");

  const existingCollections = await listExistingCollections(client);

  let rolesCreated = 0;
  let rolesExisting = 0;
  let policiesCreated = 0;
  let policiesExisting = 0;
  let permsCreatedOrUpdated = 0;
  let permsSkipped = 0;

  // 1. Rol ensure (op naam)
  const role = await ensureRole(client, ROLE_DEF.role);
  if (role.created) rolesCreated++; else rolesExisting++;

  // 2. Policy ensure (zelfde naam als rol — bestaand patroon)
  const policyName = ROLE_DEF.role.name;
  const policy = await ensurePolicy(client, {
    name:         policyName,
    description:  ROLE_DEF.role.description,
    icon:         ROLE_DEF.role.icon,
    app_access:   true,
    admin_access: false,
  });
  if (policy.created) policiesCreated++; else policiesExisting++;

  // 3. Koppel policy aan rol via /access
  await ensureAccess(client, role.id, policy.id);

  // 4. Manage permissions (CRU, geen delete) op volledige collecties
  for (const collection of ROLE_DEF.manage || []) {
    if (!existingCollections.has(collection)) {
      console.log(`  · ${policyName} → ${collection}: collectie bestaat niet, overgeslagen`);
      permsSkipped += 3;
      continue;
    }
    for (const action of ["create", "read", "update"]) {
      const changed = await ensurePermission(client, {
        policy:      policy.id,
        collection,
        action,
        fields:      ["*"],
        permissions: null,
        validation:  null,
      });
      if (changed) permsCreatedOrUpdated++;
    }
    // BEWUST GEEN delete-action.
  }

  // 5. Read-only permissions
  for (const collection of ROLE_DEF.read || []) {
    if (!existingCollections.has(collection)) {
      console.log(`  · ${policyName} → ${collection}: collectie bestaat niet, overgeslagen`);
      permsSkipped++;
      continue;
    }
    const changed = await ensurePermission(client, {
      policy:      policy.id,
      collection,
      action:      "read",
      fields:      ["*"],
      permissions: null,
      validation:  null,
    });
    if (changed) permsCreatedOrUpdated++;
  }

  // 6. Filtered access (read + update met permissions-filter)
  for (const fa of ROLE_DEF.filteredAccess || []) {
    if (!existingCollections.has(fa.collection)) {
      console.log(`  · ${policyName} → ${fa.collection}: collectie bestaat niet, overgeslagen`);
      permsSkipped += fa.actions.length;
      continue;
    }
    for (const action of fa.actions) {
      const changed = await ensurePermission(client, {
        policy:      policy.id,
        collection:  fa.collection,
        action,
        fields:      ["*"],
        permissions: fa.filter,
        validation:  null,
      });
      if (changed) permsCreatedOrUpdated++;
    }
  }

  // 7. Validated create (create met validation-expressie)
  for (const vc of ROLE_DEF.validatedCreate || []) {
    if (!existingCollections.has(vc.collection)) {
      console.log(`  · ${policyName} → ${vc.collection}: collectie bestaat niet, overgeslagen`);
      permsSkipped++;
      continue;
    }
    const changed = await ensurePermission(client, {
      policy:      policy.id,
      collection:  vc.collection,
      action:      "create",
      fields:      ["*"],
      permissions: null,
      validation:  vc.validation,
    });
    if (changed) permsCreatedOrUpdated++;
  }

  console.log(
    `✓ Stap 46 voltooid · ` +
    `rollen ${rolesCreated} nieuw, ${rolesExisting} bestond al · ` +
    `policies ${policiesCreated} nieuw, ${policiesExisting} bestond al · ` +
    `permissions ${permsCreatedOrUpdated} aangemaakt/bijgewerkt, ${permsSkipped} overgeslagen`
  );
}

// ─── Helpers (gedupliceerd uit stap 25 — zie kop-comment) ──────

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

/**
 * Maakt of update een permission-record. Een policy×collection×action
 * is uniek per Directus-conventie; we zoeken daarop en doen patch of post.
 *
 * Returnt true als er iets is veranderd, false als er niets te doen viel.
 */
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
    const samePerms      = JSON.stringify(existing.permissions || null) === JSON.stringify(p.permissions || null);
    const sameFields     = JSON.stringify(existing.fields || ["*"]) === JSON.stringify(p.fields);
    const sameValidation = JSON.stringify(existing.validation || null) === JSON.stringify(p.validation || null);
    if (samePerms && sameFields && sameValidation) {
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
