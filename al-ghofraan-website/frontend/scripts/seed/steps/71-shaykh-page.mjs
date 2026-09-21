// scripts/seed/steps/71-shaykh-page.mjs
//
// Pagina over Shaykh Brahim Moumen, onder "Over ons".
//
//   1. Veld `page_content.profile_photo` (portretfoto; upload in Directus).
//      Wordt op elke CMS-pagina getoond zodra het gevuld is.
//   2. CMS-pagina `shaykh-brahim-moumen` (tekst uit deze stap; daarna in
//      Directus aan te passen).
//   3. Menu-item "Shaykh Brahim Moumen" als child onder "Over ons".
//
// Bewust veilig gelanceerd: pagina op "draft" en menu-item inactief, zodat er geen
// dode link ontstaat en de beheerder eerst de foto kan uploaden. Publiceren =
// pagina op "Gepubliceerd" zetten én het menu-item op actief.
//
// Idempotent en niet-destructief: bestaat de pagina of het menu-item al, dan wordt
// NIETS gewijzigd (ook niet als de beheerder de tekst heeft aangepast).

import { ensureField, softCreateItem } from "../lib/helpers.mjs";

const SLUG = "shaykh-brahim-moumen";
const NAV = "navigation_items";

const BODY = [
  "Shaykh Brahim Moumen is imaam, vrijdagprediker en docent in de Islamitische wetenschappen en de Arabische taal. Hij werd geboren op 30 december 1989 in Témara, Marokko.",
  "Hij begon op jonge leeftijd met het vergaren van Islamitische kennis en memoriseerde de Heilige Qoraan. Vervolgens verdiepte hij zich in verschillende Islamitische wetenschappen, waaronder al-ʿAqiedah, de Maaliki fiqh, oesoel al-fiqh, de Qoraanwetenschappen en tafsier, hadith en hadithwetenschappen, tajwied en qiraaʾaat.",
  "Daarnaast bestudeerde hij verschillende disciplines van de Arabische taal, waaronder nahw, sarf, balaghah, Arabische literatuur en fiqh al-loeghah.",
  "Hij bracht vijf jaar door in Mauritanië voor een intensieve studie van verschillende Islamitische wetenschappen en de Arabische taal. Vervolgens zette hij zijn academische opleiding voort aan de Islamitische Universiteit van Medina, waar hij een bachelor in de Arabische taal behaalde. Tijdens zijn verblijf in Saoedi-Arabië volgde hij daarnaast verschillende wetenschappelijke cursussen in Medina en Riyad.",
  "Naast zijn studie heeft hij meerdere jaren ervaring als imam, vrijdagprediker en docent. Hij heeft onder meer de vijf dagelijkse gebeden geleid, vrijdagpreken verzorgd en onderwijs gegeven in de Qoraan, tajwied, Maaliki fiqh, al-ʿAqiedah en de Arabische taal. Ook heeft hij zich beziggehouden met Qoraanonderwijs, begeleiding en verzoening binnen de gemeenschap.",
].map((p) => `<p>${p}</p>`).join("\n");

export async function setupShaykhPage(client) {
  console.log("\n🎓 Stap 71 · Pagina Shaykh Brahim Moumen (onder Over ons)");

  // 1. Fotoveld (zelfde patroon als hero_background_image / mosque_logo)
  await ensureField(client, "page_content", {
    field: "profile_photo",
    type:  "uuid",
    meta: {
      width:     "full",
      interface: "file-image",
      special:   ["file"],
      note:
        "Optionele portretfoto, getoond boven de tekst op de pagina. Aanbevolen: staand of vierkant portret, " +
        "minimaal 600 px breed. Leeg = geen foto (het pagina-icoon wordt dan getoond).",
    },
    schema: { foreign_key_table: "directus_files" },
  });

  // 2. Pagina (draft)
  await softCreateItem(client, "page_content", "slug", SLUG, {
    title:           "Shaykh Brahim Moumen",
    subtitle:        "Imaam, vrijdagprediker en docent",
    body:            BODY,
    seo_title:       "Shaykh Brahim Moumen",
    seo_description: "Shaykh Brahim Moumen is imaam, vrijdagprediker en docent in de Islamitische wetenschappen en de Arabische taal.",
    status:          "draft",
  });

  // 3. Menu-item onder "Over ons" (inactief)
  const parent = (
    await client.get(`/items/${NAV}?filter[label][_eq]=${encodeURIComponent("Over ons")}&filter[parent][_null]=true&fields=id&limit=1`)
  )?.data?.[0];
  if (!parent) {
    console.log('  ! menu-item "Over ons" niet gevonden — menu-item niet aangemaakt (voeg het handmatig toe)');
  } else {
    const href = `/${SLUG}`;
    const existing = (
      await client.get(`/items/${NAV}?filter[href][_eq]=${encodeURIComponent(href)}&fields=id&limit=1`)
    )?.data?.[0];
    if (existing) {
      console.log(`  · menu-item ${href} bestaat al — niet gewijzigd`);
    } else {
      await client.post(`/items/${NAV}`, {
        label:     "Shaykh Brahim Moumen",
        href,
        parent:    parent.id,
        sort:      54,
        highlight: false,
        external:  false,
        active:    false,
        location:  "header",
      });
      console.log(`  ✓ menu-item "Shaykh Brahim Moumen" aangemaakt onder "Over ons" (nog inactief)`);
    }
  }

  console.log("✓ Stap 71 voltooid");
}
