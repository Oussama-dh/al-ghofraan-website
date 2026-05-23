// scripts/seed/steps/55-tv-activity-manual-selection.mjs
//
// TV-display correctie:
//
//   1. Nieuw veld `activities.show_on_tv` (boolean, default false).
//      Beheerder vinkt per activiteit aan welke op /gebedstijden/tv
//      verschijnt. Vervangt de eerdere automatische "eerstvolgende
//      activiteit"-logica met handmatige selectie.
//
//   2. Update field-notes op:
//        - site_settings.tv_show_next_activity
//        - site_settings.tv_activity_lookahead_days
//      Veldnamen blijven gelijk (productie heeft ze al via stap 54).
//      Een rename zou data verlies kunnen veroorzaken — bewust gemeden.
//
//   3. (Geen permission-wijziging) — `activities` is geen publieke
//      collectie en de TV-route haalt server-side op met admin-token.
//      Dus géén public read whitelist nodig.
//
// HARDE GARANTIES:
//   - Idempotent (tweede run = no-op).
//   - Geen nieuwe collecties.
//   - Geen rename/verwijdering van bestaande velden.
//   - Geen wijziging aan donation_campaigns of QR-code logica.
//   - Stap 37 + 40 niet aangeraakt.
//   - Geen wijziging aan rol- of policy-permissions.

import { ensureField } from "../lib/helpers.mjs";

/**
 * Patch alleen de `meta.note` van een veld. Idempotent: bij identieke
 * note wordt geen PATCH gedaan. Geen schema-migratie.
 *
 * `ensureFieldOptions` uit helpers.mjs werkt alleen op `meta.options`
 * (interface-specifieke config). Voor `note` (top-level meta) hebben
 * we deze kleine in-step variant.
 */
async function patchFieldNote(client, collection, fieldName, newNote) {
  let field;
  try {
    const res = await client.get(`/fields/${collection}/${fieldName}`);
    field = res?.data;
  } catch (err) {
    console.log(
      `  ⚠ veld "${collection}.${fieldName}" niet gevonden (${err.message}) — note-update overgeslagen`,
    );
    return;
  }
  if (!field || !field.meta) {
    console.log(`  ⚠ veld "${collection}.${fieldName}" heeft geen meta — overgeslagen`);
    return;
  }
  if ((field.meta.note ?? "") === newNote) {
    console.log(`  · veld "${collection}.${fieldName}" note al up-to-date`);
    return;
  }
  try {
    await client.patch(`/fields/${collection}/${fieldName}`, {
      meta: { note: newNote },
    });
    console.log(`  ↻ veld "${collection}.${fieldName}" note bijgewerkt`);
  } catch (err) {
    console.log(`  ⚠ PATCH note voor "${collection}.${fieldName}" faalde: ${err.message}`);
  }
}

export async function setupTvActivityManualSelection(client) {
  console.log("\n📺 Stap 55 · TV-activiteit handmatige selectie + HTML strip");

  // ─── 1. activities.show_on_tv ─────────────────────────────────
  await ensureField(client, "activities", {
    field: "show_on_tv",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Aan = deze activiteit verschijnt als slide op /gebedstijden/tv " +
        "(als die slide onder Site Settings → 'tv_show_next_activity' " +
        "aan staat). Bij meerdere activiteiten met deze toggle aan " +
        "wint de eerstvolgende op datum. Verlopen activiteiten worden " +
        "automatisch overgeslagen, dus je hoeft de toggle niet zelf " +
        "uit te zetten na afloop. Tip: voor één-tegelijk weergave kun " +
        "je deze toggle bewust op slechts één activiteit aanzetten.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  // ─── 2. Field-notes herzien op site_settings ──────────────────
  // Alleen `meta.note` patchen — schema/type/default blijven ongewijzigd.
  await patchFieldNote(
    client,
    "site_settings",
    "tv_show_next_activity",
    "Master-toggle voor activiteit-slide op /gebedstijden/tv. " +
    "Aan = slide verschijnt zodra er een activiteit is met " +
    "'show_on_tv=true' die nog niet verlopen is. Uit = blok " +
    "onzichtbaar, ongeacht activiteit-instellingen. " +
    "(Veldnaam is historisch — toont nu een door de beheerder " +
    "gekozen activiteit, niet automatisch de eerstvolgende.) " +
    "Werkwijze: 1) zet deze toggle aan, 2) open de gewenste " +
    "activiteit en zet daar 'show_on_tv' aan. " +
    "Default: uit.",
  );

  await patchFieldNote(
    client,
    "site_settings",
    "tv_activity_lookahead_days",
    "Toon de op TV gekozen activiteit (zie 'show_on_tv' per " +
    "activiteit) alleen als deze binnen X dagen plaatsvindt. " +
    "0 = altijd tonen, ook activiteiten ver in de toekomst. " +
    "Default: 7. Verlopen activiteiten worden hoe dan ook " +
    "automatisch overgeslagen — deze instelling is alleen voor " +
    "de bovenkant van het venster.",
  );

  console.log("✓ Stap 55 voltooid");
}
