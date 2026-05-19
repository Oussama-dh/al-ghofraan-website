# CMS-beheer — Al-Ghofraan website

Deze handleiding legt uit hoe je inhoud van de website aanpast via Directus.

> 🔗 Directus admin: **http://localhost:8055**
> 🌍 Website lokaal: **http://localhost:3000**

---

## Algemeen — Wanneer is een refresh genoeg?

| Wat je wijzigt          | Hoe zichtbaar maken             |
|-------------------------|----------------------------------|
| Tekst, menu, FAQ, secties | Pagina **refreshen** in browser  |
| Iconen, contentblokken  | Pagina **refreshen** in browser  |
| Logo / favicon          | Harde refresh (Ctrl+Shift+R)     |
| Gebedstijden CSV        | Refreshen (max 1u in productie)  |
| Nieuwe pagina aangemaakt | Refreshen — werkt direct         |

In ontwikkelmodus zie je wijzigingen **direct** na een refresh.

---

## 1. ⭐ Een nieuwe pagina maken

Je kunt zelf nieuwe pagina's toevoegen, zoals `/jongeren` of `/cursussen`, zonder code te wijzigen.

### Stap 1 — Pagina-content aanmaken

1. Directus → **Page Content** → klik **+** rechtsboven
2. Vul in:
   - `slug` — de URL na het domein (bv. `jongeren` → wordt http://localhost:3000/jongeren)
   - `title` — de hoofdtitel
   - `subtitle` — optionele ondertitel
   - `intro` — korte introductietekst (verschijnt boven de body)
   - `body` — rich text (opmaak, links, koppen)
   - `icon` — optioneel icoon (zie [ICONS.md](./ICONS.md))
   - `seo_title`, `seo_description` — optioneel voor zoekmachines
   - `status` — zet op **`published`** om de pagina live te zetten
3. Save

### Stap 2 — Sections toevoegen aan de pagina (optioneel)

Volg de instructies in **sectie 6** hieronder, met `page_slug` = je nieuwe slug.

### Stap 3 — Pagina aan menu toevoegen

1. Directus → **Navigation Items** → klik **+**
2. Vul in:
   - `label` — bv. "Jongeren"
   - `href` — `/jongeren` (zelfde slug als hierboven)
   - `sort` — bepaalt volgorde (lager = eerder)
   - `active` = aan
   - `location` = `header`, `footer`, of `both`
3. Save

### ⚠️ Slugs die je NIET mag gebruiken

Deze slugs zijn al in gebruik door vaste app-routes. Gebruik ze niet:

- `agenda`
- `gebedstijden`
- `doneren`
- `dawahcommissie`
- `onderwijs`
- `api`
- `_next`

De website blokkeert deze automatisch — je krijgt geen "pagina niet gevonden" maar de juiste vaste pagina.

---

## 1b. ⭐ Paginaheader (titel + Arabische titel + subtitel) bewerken

De **hero/header** van zowel je zelfgemaakte pagina's *als* de vaste route-pagina's
(zoals `/agenda`, `/onderwijs`, `/artikelen`, `/gebedstijden`, `/doneren`,
`/contact`, `/videos`, `/privacy`, `/dawahcommissie` en `/`) wordt beheerd
via Directus → **Page Content**.

### Welke velden worden in de hero gebruikt?

| Veld          | Waar verschijnt het op de pagina                                 |
|---------------|------------------------------------------------------------------|
| `arabic_title` | Arabische tekst **boven** de hoofdtitel (bv. "اتصل بنا")        |
| `title`        | De grote hoofdtitel                                             |
| `subtitle`     | Korte zin onder de titel                                        |
| `intro`        | Introductietekst — gebruikt op pagina's die er ruimte voor hebben |

`arabic_title` is **gewone tekst** (geen HTML). Plak gewoon de Arabische woorden.

### Voor een vaste route bewerken

1. Directus → **Page Content** → zoek het record met de juiste slug:
   - `/agenda` → slug `agenda`
   - `/onderwijs` → slug `onderwijs`
   - `/artikelen` → slug `artikelen`
   - `/gebedstijden` → slug `gebedstijden`
   - `/doneren` → slug `doneren`
   - `/contact` → slug `contact`
   - `/videos` → slug `videos`
   - `/privacy` → slug `privacy`
   - `/dawahcommissie` → slug `dawahcommissie`
   - `/` → slug `home`
2. Pas `title`, `arabic_title`, `subtitle`, eventueel `seo_title`/`seo_description` aan
3. Klik **Save** en refresh de pagina

> 💡 **Tip:** als een veld leeg is, valt de pagina terug op een sensible
> default in code. Niets stuk — gewoon weer invullen om de waarde aan te passen.

### Bestaat het page_content-record nog niet?

Voor vaste routes worden defaults bij de eerste seed automatisch aangemaakt.
Als je een record in Directus verwijderd hebt en opnieuw `npm run seed` draait,
wordt 't opnieuw aangemaakt. Bestaande records blijven onaangeroerd
(`soft-create`).

---

## 2. Header aanpassen

**Logo & moskeenaam**: Directus → **Site Settings**
- `site_name` — naam in de header
- `logo` — upload PNG/SVG (transparant, vierkant, bv. 128×128)

**Menu-items**: Directus → **Navigation Items**
- `label`, `href`, `sort`, `active`
- `highlight` — `true` voor CTA-knop ("Doneren")
- `external` — `true` voor externe links (opent nieuw tabblad)
- `location` — `header`, `footer`, of `both`

---

## 3. Footer aanpassen

De volledige footer is beheerbaar via Directus → **Site Settings**.

### Footer-branding (links onderaan)

| Veld                   | Wat het doet                                                                |
|------------------------|------------------------------------------------------------------------------|
| `footer_logo`          | Logo specifiek voor de footer. Als leeg, valt de site terug op `logo`.       |
| `footer_title`         | Latijnse titel naast/onder het logo (bv. "Al-Ghofraan"). Default: site_name. |
| `footer_arabic_title`  | Arabische titel daaronder (bv. "المسجد الغفران").                             |
| `footer_description`   | Beschrijvende tekst onder de titel.                                          |

> ℹ️ `footer_text` blijft als verouderd alias bestaan en wordt gebruikt als
> `footer_description` leeg is — voor backwards compatibility.

### Verschil tussen `logo` en `footer_logo`

- **`logo`** — verschijnt in de header linksboven. PNG/SVG met
  **transparante achtergrond** werkt het beste op de witte header.
- **`footer_logo`** — verschijnt onderaan op de donkere
  achtergrond. Vaak werkt een lichte/witte variant van het logo daar
  beter. Als je geen apart footer-logo uploadt, gebruikt de footer
  automatisch `logo` op een lichte container.

Beide velden zijn echte File-uploads in Directus → klik op het veld om
een afbeelding te uploaden of te selecteren uit de bibliotheek.

### Algemene footer-instellingen

| Veld             | Wat het doet                                                            |
|------------------|--------------------------------------------------------------------------|
| `footer_enabled` | Uit = footer volledig verbergen                                          |
| `copyright_text` | Vrije tekst onderaan. Leeg = automatisch met huidige jaar + site-naam    |
| `address`        | Adres in contact-kolom (meerdere regels OK)                              |
| `contact_email`  | E-mailadres in contact-kolom                                             |
| `phone`          | Telefoon in contact-kolom                                                |
| `social_links`   | JSON met links naar Facebook/Instagram/YouTube/WhatsApp (zie hieronder)  |

Voorbeeld `social_links`:
```json
{ "facebook": "https://facebook.com/...", "instagram": "https://instagram.com/...", "youtube": "", "whatsapp": "" }
```

Lege strings of ontbrekende keys = die social-link wordt niet getoond.

### Footer-menu

Komt uit **Navigation Items** met `location` = `footer` of `both`.
Zie sectie 1, stap 3 voor hoe je items toevoegt.

### Wat als de footer-afbeelding niet zichtbaar is?

1. **Refresh hard** (Cmd/Ctrl+Shift+R) — afbeelding kan gecached zijn
2. **Check Directus** → Site Settings → klik op `footer_logo` → is het
   bestand zichtbaar in de preview?
3. **Check rechten** → het bestand moet niet als "private" gemarkeerd zijn
4. **Veld-interface** → het veld moet de Image-uploadknop tonen, niet
   een tekst-input. Zo niet:
   - Draai `npm run seed` opnieuw — stap 1i en 1j patchen oude UUID-input
     velden automatisch naar correcte `file-image` interface
   - Werkt dat niet? Volg de handmatige fix hieronder.

### Handmatige fix als een File-field als gewone Input verschijnt

Soms staat een veld in Directus weergegeven als simpele tekst-input in
plaats van een upload-knop. Stappen om het te repareren:

1. Directus → **Settings** (tandwiel-icoon links onder)
2. **Data Model** → kies de collectie (bv. `site_settings`, `activities`,
   `education_programs`, `prayer_time_files`)
3. Klik op het veld dat verkeerd staat (bv. `logo`, `footer_logo`, `image`,
   `file`)
4. Aan de rechterkant zie je **Interface** → klik op het potlood-icoon
5. Kies:
   - Voor afbeeldingen: **Image** (`file-image`)
   - Voor andere bestanden (bv. CSV): **File** (`file`)
6. Klik **Save**

Bestand-data wordt **niet** verwijderd door deze actie — alleen de
admin-weergave verandert. Refresh de Directus admin (Ctrl+Shift+R)
om het nieuwe veld te zien.

> 💡 Velden die deze stap soms nodig hebben: `site_settings.logo`,
> `site_settings.footer_logo`, `prayer_time_files.file`,
> `activities.image`, `education_programs.image`,
> `page_sections.image`, `page_section_items.image`.

---

## 4. Favicon, logo en og-image

Directus → **Site Settings** → upload bestanden in de juiste velden.

### Logo (header linksboven)

- **Veld:** `logo`
- **Aanbevolen formaat:** PNG of SVG met **transparante achtergrond**
- **Aanbevolen verhouding:** rechthoekig of vierkant — wordt op de site
  weergegeven met een vaste hoogte van 40px (mobiel) / 48px (desktop) en
  schaalt evenredig in de breedte (max 160px)
- **Plaatsing:** verschijnt linksboven in de header, naast de site-naam
- **Klikgedrag:** logo blijft klikbaar naar de homepage (`/`)
- **Geen logo geüpload?** Dan toont de site automatisch een fallback-icoon —
  bezoekers zien dus altijd iets

> 💡 SVG is meestal de beste keuze: scherp op alle schermen, ook op
> retina-displays. Geen logo bij de hand? Tip: laat een ontwerper een
> transparante SVG maken op een vierkant canvas (bv. 256×256px).

### Site-subtitel (klein tekstje onder de site-naam in de header)

- **Veld:** `site_subtitle`
- **Default:** "DawahCommissie"
- Leeg laten = subtitel verbergen

### Favicon

- **Veld:** `favicon`
- **Formaat:** 32×32 of 64×64 PNG, ICO of SVG
- Verschijnt op het tabblad in de browser

### Og-image (social preview)

- **Veld:** `og_image`
- **Formaat:** 1200×630 PNG
- Wordt getoond als preview-afbeelding wanneer iemand een link naar de site
  deelt op WhatsApp, Facebook, LinkedIn, etc.

---

## 5. SEO instellen

**Voor de hele site** (Site Settings):
- `default_seo_title`, `default_seo_description`

**Per pagina** (Page Content):
- `seo_title`, `seo_description` — overschrijven defaults

---

## 6. ⭐ Contentblokken (page_sections)

Sections zijn herbruikbare blokken die je op elke pagina kunt zetten.

### Beschikbare sectie-types

| Type            | Waar voor                                                           |
|-----------------|----------------------------------------------------------------------|
| `split_feature` | Twee kolommen: items met iconen links + afbeelding óf Arabisch blok rechts |
| `card_grid`     | Grid van 1/2/3 kaartjes naast elkaar                                |
| `simple_text`   | Eenvoudig blok met titel + tekst (+ optionele afbeelding)           |
| `cta`           | Oproep met titel, tekst en 1-2 knoppen (donkerblauw)                |

### Op welke pagina's kunnen sections?

- `home` (homepagina)
- `dawahcommissie`
- `doneren`
- `gebedstijden`
- **Elke dynamische pagina** die je via Page Content aanmaakt

### ⭐ Hoe `page_slug` werkt

`page_slug` is een **vrij tekstveld** — typ exact de slug van de pagina waar de sectie moet verschijnen. De waarde moet exact overeenkomen met de URL.

| URL                                  | `page_slug` waarde   |
|--------------------------------------|----------------------|
| http://localhost:3000/               | `home`               |
| http://localhost:3000/dawahcommissie | `dawahcommissie`     |
| http://localhost:3000/doneren        | `doneren`            |
| http://localhost:3000/gebedstijden   | `gebedstijden`       |
| http://localhost:3000/jongeren       | `jongeren`           |
| http://localhost:3000/cursussen      | `cursussen`          |

**Regels:**
- Alleen kleine letters, cijfers, streepjes
- Geen spaties, geen hoofdletters, geen schuine streep `/`
- Voor de homepage gebruik je letterlijk `home` (niet `/`)
- Voor `/dawahcommissie` gebruik je `dawahcommissie` (zonder schuine streep)
- Voor toekomstige pagina's verzin je een eigen slug en die zet je ook in **Page Content** als nieuwe pagina (zie sectie 1)

### Een sectie maken

**Stap 1 — De sectie zelf**

1. Directus → **Page Sections** → **+**
2. Vul in:
   - `page_slug` — typ de slug van de pagina (bv. `home`, `dawahcommissie`, `jongeren`)
   - `key` — unieke korte naam (bv. `services`, `what_we_do`) — letters/streepjes, geen spaties
   - `type` — kies een van de vier types
   - `label` — interne naam voor in deze admin
   - `title`, `intro` — wat je wilt tonen
   - `eyebrow_ar` — optioneel klein Arabisch woord
   - `icon` — optioneel hoofdicoon (zie ICONS.md)
   - `image` — optionele afbeelding
   - `button_text`, `button_url` — optionele hoofdknop
   - `secondary_button_text`, `secondary_button_url` — optionele tweede knop
   - `max_items` — toon max N items (leeg of 0 = alle)
   - `background_variant` — kies achtergrond:
     - `default` — warm beige (standaard)
     - `white` — wit
     - `sand` — donkerder beige
     - `slate-mosque` — donkerblauw met witte tekst
   - `sort` — volgorde (lager = eerder)
   - `active` — aan/uit
3. **Voor `split_feature`** kun je ook invullen:
   - `card_title_ar` — Arabisch hoofdwoord op de illustratie-kaart
   - `card_subtitle` — kleine ondertitel
   - `card_tags` — Arabische tag-woorden
   - of upload een `image` — afbeelding krijgt voorrang boven het Arabische blok
4. **Voor `cta`** vul in (in plaats van button_text/url):
   - `primary_cta_label` + `primary_cta_href`
   - `secondary_cta_label` + `secondary_cta_href`
5. Save

**Stap 2 — Items aan de sectie toevoegen** (alleen voor `split_feature` en `card_grid`)

1. Directus → **Page Section Items** → **+**
2. Vul in:
   - `page_slug` — **moet exact gelijk zijn** aan de page_slug van de sectie
   - `section_key` — **moet exact gelijk zijn** aan de `key` van de sectie
   - `title` — kop van het vakje
   - `description` — tekst
   - `icon` — icoon-naam (zie ICONS.md)
   - `image` — optionele afbeelding (vervangt het icoon in card_grid)
   - `button_text`, `button_url` — optionele knop
   - `href` — alternatief voor button_url; maakt het hele vakje klikbaar
   - `sort`, `active`
3. Save

> ⚠️ **Cruciaal**: `page_slug` + `section_key` moeten exact matchen tussen sectie en items.

### Volgorde, zichtbaarheid, verwijderen

- **Volgorde**: wijzig `sort`-waarde (lager = eerder)
- **Tijdelijk verbergen**: zet `active` op `false`
- **Verwijderen**: prullenbak in Directus

### Onbekend type opgegeven?

Als iemand in Directus een type invult dat niet bestaat (bv. een typfout), wordt die sectie automatisch overgeslagen. De rest van de pagina blijft werken.

---

## 7. Iconen aanpassen

Zie [ICONS.md](./ICONS.md). Korte versie:
- Centrale UI-iconen → **Icon Settings**
- Pagina-icoon → `page_content.icon`
- Sectie-icoon → `page_sections.icon`
- FAQ-icoon → `faq_items.icon`
- Sectie-item icoon → `page_section_items.icon`

---

## 8. FAQ aanpassen

Directus → **FAQ Items**:
- `question`, `answer`, `category`, `sort`, `published`, `icon`

---

## 9. Activiteiten aanpassen

Directus → **Activities** → klik **+**:
- `title`, `slug`, `description`, `start_date`, `end_date`, `location`, `image`
- `featured` = `true` toont op homepage
- `status` = `published`

---

## 10. Gebedstijden uploaden

1. CSV met kolommen: `datum`, `dag`, `fajr`, `shuruq`, `dhuhr`, `asr`, `maghrib`, `isha`
2. Directus → **Prayer Time Files** → **+**
3. `title`, `file` (upload CSV), `year`, `active = true`
4. Save

⚠️ Slechts één CSV mag tegelijk `active = true` zijn.

---

## 11. Onderwijsaanbod (`/onderwijs`)

De onderwijs-pagina toont alle gepubliceerde lessen, cursussen en studiekringen.
Elk programma heeft een eigen detailpagina op `/onderwijs/<slug>`.

### Een nieuw onderwijsprogramma toevoegen

Directus → **Education Programs** → klik **+** rechtsboven:

| Veld                   | Toelichting                                                              |
|------------------------|--------------------------------------------------------------------------|
| `title`                | Titel zoals zichtbaar op de site (bv. "Qur'aan-recitatie voor beginners")|
| `slug`                 | URL-segment, automatisch uit titel — wordt `/onderwijs/<slug>`          |
| `description`          | Rich text — verschijnt op de detailpagina                                |
| `teacher`              | Naam van de docent (optioneel)                                           |
| `target_group`         | Doelgroep, bv. "Vrouwen" of "Beginners 16+" (optioneel)                  |
| `schedule`             | Vrije tekst, bv. "Elke zaterdag 14:00–15:30" (optioneel)                 |
| `location`             | Locatie (optioneel)                                                      |
| `start_date`           | Startdatum (optioneel)                                                   |
| `end_date`             | Einddatum (optioneel)                                                    |
| `image`                | Hero-afbeelding (optioneel)                                              |
| `registration_enabled` | **Aan** = inschrijfformulier verschijnt op detailpagina                  |
| `target_gender`        | Doelgroep op geslacht — zie [sectie 11.1](#111-doelgroep-op-geslacht-instellen) |
| `max_participants`     | Informatief — niet automatisch afgedwongen (optioneel)                   |
| `sort`                 | Lager getal = bovenaan op `/onderwijs`                                   |
| `status`               | Zet op **`published`** om live te zetten                                 |

> 💡 Tip: zet `sort` met stappen van 10 (10, 20, 30…) zodat je later makkelijk een
> nieuw item ertussen kunt schuiven.

### Inschrijving aan/uit zetten

Op het programma:
- **`registration_enabled = true`** → het formulier verschijnt op de detailpagina
- **`registration_enabled = false`** → bezoekers zien "Inschrijven is momenteel gesloten"

Hetzelfde principe geldt voor activiteiten in **Activities** (de agenda).

### 11.1 Doelgroep op geslacht instellen

Het veld `target_gender` is beschikbaar op zowel **Education Programs** als
**Activities** en bepaalt wie het inschrijfformulier ziet en mag versturen.

| Waarde   | Wat de bezoeker ziet                                  | Wat de server toelaat       |
|----------|-------------------------------------------------------|------------------------------|
| `mixed` (of leeg) | Keuze tussen "Man" en "Vrouw"                | Beide                       |
| `male`            | Alleen "Man" + banner: "Deze inschrijving is alleen voor mannen." | Alleen male       |
| `female`          | Alleen "Vrouw" + banner: "Deze inschrijving is alleen voor vrouwen." | Alleen female   |

> ⚠️ Geslacht is **verplicht** voor elke inschrijving. Zonder geslacht kan de
> bezoeker het formulier niet versturen, en weigert de server het verzoek.

**Voorbeeld:** je biedt een Fiqh-cursus alleen voor vrouwen aan. Zet
`target_gender = female` — dan kan een mannelijke bezoeker zich niet per
ongeluk inschrijven, ook niet via direct knutselen aan de URL of formulier.

---

## 12. Inschrijvingen bekijken en beheren

Alle inschrijvingen — voor zowel activiteiten als onderwijs — komen binnen in
**dezelfde** collectie zodat je ze op één plek kunt beheren.

### Inschrijvingen openen

Directus → **Registrations**

Sortering staat standaard op nieuwste eerst. Filter op `type` om alleen
activiteit- of onderwijs-inschrijvingen te zien.

### Velden per inschrijving

| Veld              | Inhoud                                                            |
|-------------------|-------------------------------------------------------------------|
| `type`            | `activity` of `education` (automatisch ingevuld)                  |
| `source_title`    | Titel van de activiteit/cursus zoals die was bij inschrijven      |
| `source_slug`     | Slug — handig om snel naar de pagina te navigeren                 |
| `name`, `email`   | Contactgegevens                                                   |
| `phone`           | Telefoon (indien opgegeven)                                       |
| `gender`          | `male` of `female` — **verplicht** voor nieuwe inschrijvingen     |
| `age`             | Leeftijd (optioneel)                                              |
| `notes`           | Vrij tekstveld dat de bezoeker invulde                            |
| `status`          | Zie hieronder                                                     |
| `created_at`      | Tijdstip van inschrijving (automatisch)                           |

> ℹ️ **Bestaande inschrijvingen van vóór deze update** kunnen nog oude
> waarden hebben in `gender` (zoals `m`, `f`, `other` of leeg). Die blijven
> staan zoals ze zijn — alleen *nieuwe* inschrijvingen worden afgedwongen
> op `male` / `female`.

### Inschrijvingen filteren op geslacht

In Directus → **Registrations**:

1. Klik bovenaan op het filter-icoon
2. Kies veld `gender` → operator `Is equal to` → waarde `male` of `female`
3. Combineer eventueel met `type` (activity/education) of `source_slug`
   om bijvoorbeeld alleen vrouwen voor één specifieke cursus te zien

Sla de filter op als een preset (drie puntjes rechtsboven → Save preset)
zodat je dezelfde view later snel terugvindt.

### Status beheren

De `status` is een dropdown met vijf opties:

| Status         | Wanneer te gebruiken                                  |
|----------------|-------------------------------------------------------|
| `new`          | Net binnengekomen — nog geen actie ondernomen         |
| `contacted`    | We hebben contact opgenomen, wachten op respons       |
| `confirmed`    | Definitief ingeschreven                               |
| `waiting_list` | Vol — op de wachtlijst geplaatst                      |
| `cancelled`    | Inschrijving geannuleerd                              |

Wijzig de status door op de inschrijving te klikken en de dropdown aan te passen.

### Verschil tussen `education_programs` en `registrations`

- **Education Programs** = het *aanbod* dat je publiceert (cursussen, lessen).
  Eén item per cursus. Beheer je via de "Education Programs" collectie.
- **Registrations** = de *inschrijvingen* die bezoekers indienen via het
  formulier. Eén item per persoon die zich inschrijft. Komt automatisch binnen.

Activiteiten (`activities`) werken hetzelfde: het zijn de aankondigingen op
de agenda. Inschrijvingen daarop landen óók in **Registrations** met
`type = activity`.

### Veiligheid

- Bezoekers kunnen `registrations` **niet** lezen of opvragen via de website —
  alleen redacteuren in Directus.
- Het formulier op de website schrijft via een server-side API-route
  (`/api/inschrijven`) die het admin-token gebruikt. Daar is geen
  Directus-account voor nodig voor de bezoeker.

> ⚠️ **Belangrijk:** voor productie moet `DIRECTUS_TOKEN` in `.env` staan met
> een geldig server-token (Directus → Settings → Access Tokens). Zonder dat
> token werkt het inschrijfformulier niet en krijgt de bezoeker een vriendelijke
> foutmelding.

### 12.1 Inschrijvingen bekijken per cursus of activiteit

Inschrijvingen worden centraal beheerd in de **Registrations**-collectie.
Elke inschrijving bevat de bron-info als platte tekst:

| Veld              | Inhoud                                                                |
|-------------------|------------------------------------------------------------------------|
| `type`            | `education` of `activity`                                              |
| `source_slug`     | Slug van de cursus of activiteit (bv. `fiqh-vrouwen`)                  |
| `source_title`    | Titel zoals die was op het moment van inschrijven                      |
| `source_id`       | Interne ID van de cursus of activiteit                                 |

> ℹ️ Eerdere versies probeerden ook **relationele velden** (`education_program`
> en `activity`) toe te voegen voor een gekoppeld "Inschrijvingen"-tabblad
> per cursus. Dat is uit de seed verwijderd, omdat het in Directus 11
> leidde tot twee verschillende fouten:
>
> 1. `column activities.registrations does not exist` — kapot alias-veld
> 2. `invalid input syntax for type uuid: "3"` — type-mismatch tussen UUID-relatie en integer-IDs
>
> Filteren gaat nu via de bovenstaande tekstvelden — robuust en eenvoudig.

**Filteren op één specifieke cursus of activiteit:**

1. Directus → **Registrations**
2. Klik bovenaan op het filter-icoon
3. Kies veld `source_slug` → operator `Is equal to` → typ de slug
   (bv. `fiqh-vrouwen` of `open-iftar-2025`)
4. (Optioneel) sla op als preset via de drie puntjes rechtsboven →
   "Save preset" → naam: bv. "Fiqh-cursus inschrijvingen"

> 💡 De slug zie je in de browser-URL van de cursus/activiteit:
> `/onderwijs/fiqh-vrouwen` → slug = `fiqh-vrouwen`

**Snel een hele kolom inschrijvingen vinden:**

| Wil je zien…                                 | Filter zo                                                |
|----------------------------------------------|----------------------------------------------------------|
| Alle onderwijs-inschrijvingen                | `type = education`                                       |
| Alle activiteit-inschrijvingen               | `type = activity`                                        |
| Inschrijvingen voor één cursus/activiteit    | `source_slug = <slug>`                                   |
| Alleen vrouwen voor een cursus               | combineer `source_slug = X` met `gender = female`        |
| Alleen mannen voor een activiteit            | combineer `source_slug = X` met `gender = male`          |
| Nieuwe (onbehandelde) inschrijvingen         | `status = new`                                           |
| Bevestigde aanmeldingen                      | `status = confirmed`                                     |

Je kunt meerdere filters combineren — bijvoorbeeld "alle vrouwen voor de
Fiqh-cursus die nog op `new` staan". Sla die als preset op zodat je 'm
later snel terugvindt.

> 💡 **Slug-naam gewijzigd?** `source_slug` op bestaande inschrijvingen
> wordt **niet** automatisch bijgewerkt — die blijft de oude waarde houden,
> zodat het historisch correct blijft. Filter dan op `source_id` om alle
> inschrijvingen onder de oude én nieuwe slug te zien.

---

## 13. Donaties bekijken en beheren

Donaties komen binnen via Stripe Checkout (iDEAL of creditcard) en worden
automatisch geregistreerd in Directus → **Donations**.

> 💡 **Stripe Dashboard blijft de bron van waarheid** voor betalingen,
> refunds en abonnementsbeheer. De Donations-collectie is een overzicht
> voor de DawahCommissie — geen vervanging van Stripe.

### Donaties openen

Directus → **Donations**. Sortering staat op nieuwste eerst. Filter op
`type` (eenmalig/maandelijks) of `status` om snel te vinden wat je zoekt.

### Velden per donatie

| Veld                       | Inhoud                                                                  |
|----------------------------|--------------------------------------------------------------------------|
| `type`                     | `one_time` (eenmalig) of `monthly` (maandelijks)                         |
| `status`                   | Zie tabel hieronder                                                      |
| `amount_display`           | **Leesbare weergave** van het bedrag, bv. "€25,00"                       |
| `amount`                   | Bedrag in **eurocenten** (bv. 2500 = €25,00) — 1-op-1 met Stripe         |
| `currency`                 | Altijd `eur`                                                              |
| `donor_name`               | Naam van de donor — **verplicht** bij elke nieuwe donatie                |
| `donor_email`              | E-mail — **verplicht**, gebruikt voor Stripe-bevestiging                 |
| `message`                  | Bericht/notitie van de donor (indien ingevuld)                           |
| `stripe_session_id`        | Stripe Checkout-id — om snel terug te vinden in Stripe                   |
| `stripe_payment_intent_id` | Voor eenmalige donaties                                                  |
| `stripe_subscription_id`   | Voor maandelijkse donaties                                               |
| `created_at` / `paid_at`   | Tijdstip aanmaak en betaling                                             |
| `raw_event`                | Laatste Stripe-payload — alleen voor diagnostiek                         |

> 💡 **Twee bedragvelden — waarom?**
> - `amount` slaat het bedrag op in **eurocenten** als integer. Dat klopt
>   exact met wat Stripe gebruikt en voorkomt afrondings­fouten. Niet
>   bewerken — dit is de bron van waarheid.
> - `amount_display` is de leesbare versie ("€25,00"), automatisch ingevuld
>   door de website. Handig voor lijstweergave en e-mailtjes.

> ℹ️ **Naam en e-mail zijn verplicht** voor nieuwe donaties. Het
> donatieformulier accepteert geen lege of alleen-spaties naam, en de
> server-route weigert het verzoek met een 400-fout. Hierdoor heeft elke
> nieuwe donatie altijd een herleidbare donor.

### Status uitgelegd

| Status      | Betekenis                                                            |
|-------------|----------------------------------------------------------------------|
| `pending`   | Donor is doorgestuurd naar Stripe, maar betaling is nog niet rond    |
| `paid`      | Eenmalige donatie is succesvol betaald                               |
| `active`    | Maandelijkse donatie loopt — er komen elke maand betalingen binnen   |
| `failed`    | Een betaling is mislukt (bv. afgekeurde kaart bij maandelijks)       |
| `cancelled` | Checkout-sessie is verlopen (donor heeft niet betaald)               |
| `ended`     | Maandelijkse donatie is opgezegd                                     |

> ⚠️ **Niet handmatig wijzigen:** statussen worden automatisch bijgewerkt
> via Stripe webhooks. Een handmatige wijziging wordt mogelijk overschreven
> bij een volgend Stripe-event. Bij twijfel: open de donatie in het Stripe
> Dashboard via `stripe_session_id`.

### Verschil eenmalig vs. maandelijks

- **Eenmalig** (`type = one_time`): één betaling, status gaat van `pending`
  → `paid`. Daarna gebeurt er niets meer met dit record.
- **Maandelijks** (`type = monthly`): Stripe maakt een abonnement aan en
  schrijft elke maand automatisch af. Status gaat van `pending` → `active`.
  Bij een mislukte maandelijkse incasso komt er een aparte event binnen
  en kan de status tijdelijk op `failed` staan. Bij opzegging wordt het
  record `ended`.

### Een donatie terugzoeken in Stripe

1. Open de donatie in Directus
2. Kopieer `stripe_session_id`
3. Stripe Dashboard → zoekbalk bovenaan → plak het id
4. Daar zie je: betaalmethode, kaart-fingerprint (geanonimiseerd),
   refunds, factuur, etc.

### Refunds en opzeggingen

Doe deze acties **altijd in Stripe**, niet in Directus:

- **Refund** (eenmalig): Stripe Dashboard → Payments → Refund
- **Maandelijkse donatie stopzetten**: Stripe Dashboard → Customers →
  Subscriptions → Cancel

Stripe stuurt automatisch het bijbehorende webhook-event, en de status in
Directus wordt automatisch bijgewerkt.

### Veiligheid

- Bezoekers kunnen `donations` **niet** lezen of opvragen via de website
- Stripe Checkout hosted op `checkout.stripe.com` — geen kaartgegevens
  raken onze server of database
- De webhook-route verifieert élke binnenkomende request met de Stripe
  signing secret — fake events worden geweigerd
- Voor de eerste keer instellen van Stripe: zie **`docs/STRIPE_SETUP.md`**

---

## 14. Donatiedoelen (campagnes)

Naast algemene donaties kun je specifieke doelen aanmaken — bv. *Onderhoud
moskee*, *Ramadan iftar*, *Maandelijkse moskee steun*. Donateurs kiezen
het doel op `/doneren` voordat ze betalen.

### Een campagne aanmaken

Directus → **Donation Campaigns** → klik **+** rechtsboven:

| Veld                  | Wat het doet                                                              |
|-----------------------|----------------------------------------------------------------------------|
| `title`               | Naam van het doel (bv. "Ramadan iftar 2026")                              |
| `slug`                | URL-segment, automatisch uit titel                                         |
| `description`         | Rich text — uitleg waarom dit doel belangrijk is                          |
| `image`               | Optionele afbeelding                                                       |
| `goal_amount`         | Doelbedrag in **eurocenten** (bv. 500000 = €5.000). Optioneel             |
| `goal_amount_display` | Leesbare weergave (bv. "€5.000"). Vrij in te vullen                       |
| `allow_one_time`      | Sta eenmalige donaties toe voor dit doel                                  |
| `allow_monthly`       | Sta maandelijkse donaties toe voor dit doel                               |
| `suggested_amounts`   | JSON array met euro-bedragen, bv. `[5, 10, 25, 50, 100]`. Leeg = standaard|
| `default_amount`      | Voorgeselecteerd bedrag in **euro's** (bv. 25). Optioneel                 |
| `featured`            | Toon extra prominent (`★ uitgelicht` label)                                |
| `sort`                | Lager getal = bovenaan. Stappen van 10 aanbevolen                          |
| `status`              | Zet op **`published`** om live te zetten                                   |

### Eenmalig vs. maandelijks toestaan

- **`allow_one_time = true`, `allow_monthly = false`** → donor kan alleen
  eenmalig doneren voor dit doel
- **`allow_one_time = false`, `allow_monthly = true`** → alleen maandelijks
  (handig voor "Maandelijkse moskee steun")
- **Beide `true`** → donor kiest zelf
- **Beide `false`** → de campagne is niet zichtbaar op `/doneren`
  (Directus laat 'm wel staan, want hij is misschien tijdelijk uitgezet)

### Suggested amounts uitleg

Vul een JSON array in **euro's**, bv:

```json
[10, 25, 50, 100, 250]
```

Dit zijn de knoppen die de donor ziet. Vrij bedrag blijft altijd mogelijk
naast de presets. Laat het veld leeg om de standaard set
(€5/€10/€25/€50/€100) te gebruiken.

### Donaties per campagne bekijken

Directus → **Donations** → filter:
1. Filter-icoon → veld `campaign` → operator `Is equal to` → kies de campagne
2. Of filter op `campaign_slug = ramadan-iftar-2026`
3. Sla op als preset voor hergebruik

> 💡 **`campaign_title` blijft historisch correct.** Wijzig je later de titel
> van een campagne, dan houden bestaande donaties de oude titel aan zodat
> je rapportage klopt over tijd. Filter op `campaign` (relatie) om alle
> donaties onder de huidige én oude titel te zien.

### Status beheren

- **`draft`** — nog niet zichtbaar op de website
- **`published`** — actief, donateurs kunnen dit doel kiezen
- **`archived`** — uit de zichtbare lijst; bestaande donaties blijven gekoppeld

---

## 15. Artikelen

`/artikelen` is de overzichtspagina. Elk artikel heeft een eigen detailpagina
op `/artikelen/<slug>`.

### Een artikel schrijven

Directus → **Articles** → klik **+**:

| Veld              | Wat het doet                                                       |
|-------------------|---------------------------------------------------------------------|
| `title`           | Titel van het artikel                                               |
| `slug`            | URL-segment, automatisch uit titel                                  |
| `excerpt`         | Korte samenvatting (1-2 zinnen) voor overzicht en social previews   |
| `body`            | Hoofdtekst — rich text met opmaak                                   |
| `image`           | Hero-afbeelding (optioneel)                                         |
| `author_name`     | Auteursnaam                                                          |
| `category`        | Vrij tekstveld, bv. "Lezing", "Nieuws", "Reflectie"                 |
| `tags`            | Komma-gescheiden, bv. `ramadan,gemeenschap,jongeren`                |
| `published_at`    | Datum waarop het artikel als gepubliceerd telt (sortering)          |
| `seo_title`       | Optioneel — overschrijft default SEO-titel                          |
| `seo_description` | Optioneel — voor preview op Google en social media                  |
| `featured`        | Uitgelichte artikelen verschijnen bovenaan op `/artikelen`          |
| `sort`            | Voor handmatige volgorde wanneer `published_at` gelijk is           |

### Status (draft/published/archived)

- **`draft`** — niet publiek zichtbaar; alleen in Directus
- **`published`** — verschijnt op `/artikelen` en heeft een eigen detailpagina
- **`archived`** — niet publiek; gebruik dit om oude artikelen te bewaren
  zonder ze te verwijderen

### Afbeelding toevoegen

Klik op het `image`-veld → **Choose Existing** of **Upload File** →
selecteer/upload een afbeelding. Aanbevolen: ≥1200×630px voor scherpe
weergave op desktop én social previews.

### SEO invullen

`seo_title` en `seo_description` zijn alleen nodig als je de defaults wilt
overschrijven. Houd `seo_description` onder de 160 tekens — Google knipt
langere teksten af.

### Een artikel publiceren

1. Vul minimaal `title`, `slug`, `body` en `published_at` in
2. Zet `status` op **`published`**
3. **Save**
4. `/artikelen` toont 'm direct (in dev mode) of na cache-refresh (productie)

---

## 16. Contactpagina en contactberichten

### Waar de contactpagina-tekst staat

Directus → **Page Content** → zoek `slug = contact`. Daar bewerk je:
- `title`, `subtitle`, `intro` — boven het formulier
- `body` — onder het formulier (rich text, optioneel)
- `seo_title` en `seo_description`
- `status` (laat op `published` staan)

### Waar de contactgegevens staan

Directus → **Site Settings**:
- `contact_email`
- `phone`
- `address` (meerregelig OK)
- `whatsapp_number` — zie hieronder
- `whatsapp_default_message` — zie hieronder

Deze velden gebruikt zowel de footer als de contactpagina.

### WhatsApp-knop

Op `/contact` verschijnt een groene **"Stuur ons een WhatsApp"**-knop —
maar **alleen** als `whatsapp_number` is ingevuld in Site Settings.

| Veld                         | Wat het doet                                                              |
|------------------------------|----------------------------------------------------------------------------|
| `whatsapp_number`            | Internationaal formaat. `+31 6 12345678` óf `31612345678` werkt allebei — spaties, plus en streepjes worden automatisch verwijderd |
| `whatsapp_default_message`   | Optionele tekst die voor­ingevuld wordt in het WhatsApp-gesprek           |

Klik op de knop → opent in nieuw tabblad → `https://wa.me/31612345678?text=...`

> 💡 Geen WhatsApp-API nodig. De knop is een gewone link.
> Vul je `whatsapp_number` weer leeg, dan verdwijnt de knop op `/contact`.

### Waar contactberichten binnenkomen

Directus → **Contact Messages**. Sortering staat op nieuwste eerst.

| Veld         | Inhoud                                                              |
|--------------|----------------------------------------------------------------------|
| `name`       | Naam van de afzender                                                 |
| `email`      | E-mailadres — antwoord hier op vanuit je eigen mail-app              |
| `phone`      | Telefoon (optioneel)                                                 |
| `subject`    | Onderwerp                                                            |
| `message`    | De daadwerkelijke vraag/opmerking                                    |
| `status`     | `new` / `read` / `replied` / `archived`                              |
| `created_at` | Tijdstip van binnenkomst                                             |

### Status uitgelegd

- **`new`** — nog niet gelezen
- **`read`** — gelezen, antwoord nog niet verstuurd
- **`replied`** — beantwoord
- **`archived`** — afgehandeld, verbergen uit standaardweergave

> ⚠️ **Spam-bescherming**: het formulier bevat een verborgen *honeypot*-veld
> dat bots invullen maar mensen niet. Berichten waar dat veld ingevuld is,
> worden geweigerd zonder dat ze in de Contact Messages-collectie terechtkomen.
> Geen captcha nodig — bots worden grotendeels gefilterd.

---

## 17. Privacyverklaring

De privacyverklaring staat op `/privacy` en is een gewone pagina via
`page_content`. Footer-link verwijst er automatisch naar.

### Waar de tekst beheerd wordt

Directus → **Page Content** → zoek `slug = privacy`. Daar bewerk je:

| Veld              | Wat het doet                                                        |
|-------------------|----------------------------------------------------------------------|
| `title`           | "Privacyverklaring" — staat in de hero-banner en in de browser-tab  |
| `subtitle`        | Korte ondertitel boven de tekst                                     |
| `intro`           | Inleidende alinea boven de body                                     |
| `body`            | De volledige privacy-tekst (rich text)                              |
| `seo_title`       | Optioneel — overschrijft default SEO-titel                          |
| `seo_description` | Voor Google/social previews                                         |
| `status`          | Laat op `published` staan om de pagina online te houden             |

### Wanneer aanpassen?

Werk de privacyverklaring bij wanneer:

- Je een nieuwe verwerker toevoegt (bv. een mailservice of analytics-tool)
- Bewaartermijnen wijzigen
- De wettelijke vereisten veranderen (bv. AVG-aanpassingen)
- Je nieuwe gegevens gaat verzamelen via een nieuw formulier

> 💡 **Datum bovenaan bijwerken.** Update de zin "Laatst bijgewerkt:" in
> de body wanneer je de tekst aanpast — dat geeft bezoekers vertrouwen
> dat de tekst recent is.

### Hoe formulieren ernaar verwijzen

De drie formulieren met een verplichte privacy-akkoord linken naar `/privacy`:

- **Contactformulier** (`/contact`)
- **Inschrijfformulier** (`/onderwijs/<slug>`, `/agenda/<slug>`)
- **Donatieformulier** (`/doneren`) — accepteert privacyverklaring impliciet
  bij doorgaan naar Stripe

Alle drie openen `/privacy` in een nieuw tabblad zodat de bezoeker zijn
formulier-invoer niet kwijtraakt.

### Cookiebanner — niet nodig

Deze website gebruikt **geen tracking cookies en geen analytics**. Daarom
is een cookiebanner niet nodig. Mocht je in de toekomst Google Analytics,
Meta Pixel of vergelijkbaar toevoegen, dan moet je:

1. De privacyverklaring uitbreiden met een sectie over die tool
2. Een cookiebanner met opt-in toevoegen vóór die scripts laden
3. Documenteren welke cookies/trackers worden ingezet

Tot die tijd: niets nodig.

### Privacy-pagina verbergen of opnieuw opbouwen

- **Verbergen** → zet `status` op `draft` of `archived`. De pagina wordt
  dan een 404. De footer-link blijft staan maar leidt naar 404 — verwijder
  ook de footer-link in **Navigation Items** als je dit langer dan een dag
  doet.
- **Opnieuw opbouwen** → verwijder de page_content rij + footer-nav-item
  in Directus, daarna `npm run seed`. De seed maakt beide opnieuw aan met
  de standaard-tekst.

> ⚠️ **Belangrijk:** zodra je de tekst handmatig hebt aangepast in Directus,
> overschrijft `npm run seed` jouw wijzigingen NIET meer. De seed maakt de
> rij alleen aan als hij nog niet bestaat.

---

## 18. Video's (`/videos`)

De `videos`-collectie laat je YouTube-video's tonen op `/videos`. Geen
YouTube-API, geen automatische sync — je beheert zelf welke video's zichtbaar zijn.

### Een nieuwe video toevoegen

1. Ga naar **Content → Videos → Create item**
2. Vul in:
   - **status**: `Concept` (terwijl je werkt) of `Gepubliceerd` (zichtbaar op /videos)
   - **title**: titel die onder de video verschijnt
   - **description**: 1-3 zinnen (optioneel)
   - **youtube_url**: plak de volledige YouTube-URL — alle vormen werken:
     - `https://www.youtube.com/watch?v=VIDEO_ID`
     - `https://youtu.be/VIDEO_ID`
     - `https://youtube.com/shorts/VIDEO_ID`
     - `https://www.youtube.com/shorts/VIDEO_ID`
   - **featured**: aanvinken voor prominent bovenaan
   - **sort**: lager getal = eerder (binnen featured/non-featured groep)
   - **published_at**: datum waarop je hem live wilt zetten
3. Klik **Save**

### Sortering op /videos

1. Featured-video's eerst
2. Dan op `sort` oplopend
3. Dan op `published_at` aflopend (recentste eerst)

### Wat als de URL ongeldig is?

De pagina slaat video's met een onherkenbare YouTube-URL stilletjes over —
geen kapotte iframes of crashes. Controleer dus zelf even of je de URL
correct hebt gekopieerd.

### Privacy

Video's worden ingebed via `youtube-nocookie.com` — YouTube zet pas een
tracking-cookie als de bezoeker daadwerkelijk op play drukt.

---

## 19. Artikelcategorie-filtering (`/artikelen?category=...`)

De artikelen-pagina toont automatisch filterknoppen op basis van de
`category`-veldwaardes van **gepubliceerde** artikelen.

### Hoe het werkt

- Het filter wordt **dynamisch** opgebouwd uit alle published artikelen
- Een categorie verschijnt alleen als er minstens 1 gepubliceerd artikel
  in die categorie staat
- Zet je het laatste artikel van een categorie op `draft` of `archived`,
  dan **verdwijnt die categorie automatisch** uit het filter
- Categorieën worden alfabetisch gesorteerd
- "Alle" staat altijd vooraan

### Een nieuwe categorie introduceren

Geen aparte stap — typ gewoon de categorie in het `category`-veld bij
een artikel en zet hem op `published`. De knop verschijnt vanzelf op
`/artikelen` na een refresh.

### Categorieën consistent houden

`category` is een vrij tekstveld. Wees consistent met hoofdletters/spaties
zodat "Lezing" en "lezing" niet als twee aparte categorieën worden gezien
(de matching is case-insensitive in de URL, maar het label op de knop
gebruikt de waarde uit het eerste artikel dat je tegenkomt).

### URL-formaat

`/artikelen?category=fiqh` → toont alle published artikelen met
`category` = "Fiqh" (case-insensitive). Als de gevraagde categorie niet
(meer) bestaat, valt de pagina simpelweg terug op alle artikelen.

---

## 20. Productie — fallback-content & wat de site toont bij lege Directus

De website is zo gebouwd dat álle inhoud uit Directus komt. Voor het zeldzame
geval dat Directus offline is of een veld leeg, gebruikt de frontend een
beperkte set neutrale fallbacks. Belangrijk voor productie:

| Onderdeel                        | Bij lege Directus / offline                                                  |
|----------------------------------|------------------------------------------------------------------------------|
| Header logo                      | Eenvoudige SVG-mosque                                                        |
| Footer logo / titel / beschrijving | Generieke Al-Ghofraan branding-tekst                                       |
| Site-naam / SEO-titels           | "DawahCommissie Al-Ghofraan" als merknaam-fallback                           |
| Contact-email in footer          | **Niet getoond** — alleen zichtbaar als `site_settings.contact_email` is ingevuld |
| Activiteiten op homepage         | **Sectie wordt verborgen** (geen demo-data meer)                             |
| Gebedstijden — vandaag-card      | Productie: **nette melding** "tijdelijk niet beschikbaar". Lokaal dev: demo-card |
| Artikelen / onderwijs / agenda   | Lege staat met neutrale tekst                                                |
| Video's                          | Lege staat ("Er zijn momenteel geen video's beschikbaar")                    |
| FAQ                              | Verborgen als geen items                                                     |

> ✅ **Geen fake data meer in publieke views.** Demo-tijden, demo-activiteiten
> en placeholder-emails verschijnen NOOIT op productie.

### Wat moet er minimaal in Directus staan voor een nette site?

1. **Site Settings**: `site_name`, `logo`, `contact_email`, `default_seo_title`/`description`
2. **Page content**: minimaal `home`, `dawahcommissie`, `doneren`, `privacy` op `published`
3. **Navigation items**: header- en footer-menu's
4. **Prayer time files**: minstens één CSV als `active`
5. **Activities** *(optioneel)* — zonder deze blijft de homepage-activiteiten-sectie verborgen
6. **Donation campaigns** *(optioneel)* — zonder deze toont DonationForm alleen "Algemene donatie"

### Idempotente seed — wat overschrijft het?

`npm run seed` is veilig om opnieuw te draaien. De seed:

- ✅ Maakt collecties, velden en permissies aan als ze ontbreken
- ✅ Maakt **éénmalig** standaard-pagina's aan (home, dawahcommissie, doneren,
  contact, privacy) — daarna nooit meer overschreven
- ✅ Vult lege velden in `site_settings` met defaults — overschrijft géén
  bestaande waarden
- ❌ Maakt **geen** voorbeeldactiviteiten meer aan
- ❌ Overschrijft **geen** handmatige content

Resultaat: na de eerste seed kun je gerust weer `npm run seed` draaien voor
schemawijzigingen, zonder dat je beheerderswerk verloren gaat.

---

1. Wijzig in Directus → klik **Save**
2. Vernieuw de pagina in de browser
3. De nieuwe content moet meteen zichtbaar zijn

In ontwikkelmodus is de cache uitgeschakeld — geen container-restart nodig.

Als iets niet werkt:
- Staat `status` op `published` (voor pagina's) of `active` op `true` (voor secties/items/menu's)?
- Matchen `page_slug` en `section_key` exact?
- Staat de slug niet in de gereserveerde lijst (sectie 1)?

Hulp nodig: neem contact op met de webbeheerder van de DawahCommissie.

---

## 21. Contactverzoeken en inschrijvingen opvolgen

> **Belangrijk:** de website verstuurt **geen automatische e-mails**. Antwoorden gebeurt voorlopig via je eigen mailprogramma (Outlook, Gmail, Apple Mail, etc.). Directus gebruik je voor **status, notities en conceptreacties** — zo houdt iedereen overzicht over wat is opgevolgd.

### 21.1 Contactberichten (`contact_messages`)

Elk bericht via `/contact` belandt in de collectie **Contact Messages** in Directus. Naast de basisvelden (naam, e-mail, onderwerp, bericht) zijn er opvolgvelden beschikbaar:

| Veld                | Wat doe je ermee?                                                                  |
|---------------------|------------------------------------------------------------------------------------|
| `status`            | Nieuw → Gelezen → Beantwoord → Gearchiveerd                                         |
| `internal_notes`    | Interne notitie voor de DawahCommissie. Niet zichtbaar voor de afzender.           |
| `last_contacted_at` | Wanneer er voor het laatst contact is geweest. Handmatig invullen na een reactie. |
| `handled_by`        | Naam of initialen van wie het opvolgt (bv. "AH"). Voorkomt dubbele opvolging.    |
| `reply_subject`     | Conceptonderwerp voor je antwoord — kopieer naar je mailclient.                    |
| `reply_draft`       | Conceptantwoord. Bouw je tekst rustig op en kopieer hem als je tevreden bent.     |

#### Aanbevolen werkwijze

1. **Open** een nieuw bericht (status `new`).
2. **Lees** het door en zet `status` op `read`.
3. **Vul `handled_by`** in zodat collega's weten dat je ermee bezig bent.
4. **Schrijf je antwoord** in `reply_draft` (eventueel `reply_subject` ook). Sla op.
5. **Kopieer** de tekst naar je eigen e-mailprogramma → verstuur naar de afzender.
6. **Vul `last_contacted_at`** in (datum/tijd) en zet `status` op `replied`.
7. Eventuele context voor later (bv. "telefonisch nagebeld") in `internal_notes`.
8. Klaar? Zet `status` op `archived` zodra de zaak afgerond is.

> 💡 Tip: in Directus kun je via **Layout → Card View** of **Filter → Status = new** snel zien wat er nog open staat.

### 21.2 Inschrijvingen (`registrations`)

Inschrijvingen via `/onderwijs/[slug]` of `/agenda/[slug]` belanden in **Registrations**. Naast `name`, `email`, `phone`, `age` en `gender` heb je dezelfde opvolgvelden als bij contactberichten — plus de bestaande statusflow:

| Status         | Betekenis                                       |
|----------------|-------------------------------------------------|
| `new`          | Net binnengekomen, nog niet bekeken             |
| `contacted`    | Er is contact geweest, wacht op bevestiging     |
| `confirmed`    | Definitief ingeschreven                          |
| `waiting_list` | Op de wachtlijst                                |
| `cancelled`    | Geannuleerd door inschrijver of beheerder       |

De velden `internal_notes`, `last_contacted_at`, `handled_by`, `reply_subject` en `reply_draft` werken precies hetzelfde als bij contactberichten (zie 21.1).

#### Speciaal voor onderwijs

Bij onderwijs zijn er vaak **meerdere stappen**: eerste contact → intake-gesprek → bevestiging → start. Gebruik `internal_notes` als een mini-logboek:

```
12-05  AH gebeld, intake gepland 15-05 19:00
15-05  AH intake gedaan, geschikt voor groep 3
16-05  AH bevestiging gestuurd, status → confirmed
```

### 21.3 Wat niet (nog niet) automatisch is

- ❌ Geen automatische bevestigingsmail naar de afzender bij ontvangst.
- ❌ Geen automatische verzending van `reply_draft` — dat blijft een **conceptveld**.
- ❌ Geen SMTP / mailprovider gekoppeld.
- ❌ Geen Directus extension actief.

Als hier in de toekomst behoefte aan ontstaat, kan dat in een aparte release toegevoegd worden. Voor nu blijft het bewust handmatig — minder onderhoud, geen risico op spam-mails bij Directus-bugs.

---

## 22. TV-display gebedstijden (`/gebedstijden/tv`)

Voor het grote tv-scherm in de moskee is er een aparte fullscreen-pagina:

```
https://al-ghofraan.com/gebedstijden/tv
```

Deze toont:
- de naam van de moskee + datum
- een live klok
- de gebedstijden van vandaag (uit dezelfde CSV als `/gebedstijden`)
- het eerstvolgende gebed met countdown
- roterend onderaan: mededelingen, ahadith en reminders

> 💡 Open de pagina op de tv en zet de browser in **fullscreen-modus** (F11 op de meeste browsers). Geen apparaatkoppeling of API-key nodig.

### 22.1 Werking in het kort

- Tijdzone is altijd **Europe/Amsterdam** — onafhankelijk van de browser-instellingen.
- Klok loopt elke seconde, countdown verschuift mee.
- Bij dagwisseling (om middernacht NL-tijd) ververst de pagina automatisch zodat de nieuwe dag verschijnt.
- Als safety-net herlaadt de pagina ook elke 30 minuten zelf.
- Als er **geen CSV** is geüpload, toont de pagina een nette melding ("Gebedstijden zijn tijdelijk niet beschikbaar"). Er worden **nooit nep-tijden** getoond.
- Als er geen mededelingen zijn, blijft de pagina werken — alleen gebedstijden zijn dan zichtbaar.

### 22.2 Mededelingen toevoegen — `tv_announcements`

Open in Directus de collectie **TV Announcements**. Voor elk item:

| Veld            | Wat is het?                                                                          |
|-----------------|--------------------------------------------------------------------------------------|
| `status`        | `published` om te tonen op tv. `draft` = niet zichtbaar.                              |
| `type`          | `announcement` (mededeling), `hadith`, `reminder`, `event`, `donation`               |
| `title`         | Korte titel (verschijnt vet bovenaan)                                                |
| `body`          | Hoofdtekst (1-3 zinnen) — leesbaar op afstand                                       |
| `arabic_text`   | Optioneel — Arabische tekst (vooral voor hadith). Wordt in Arabisch lettertype getoond. |
| `translation`   | Optioneel — Nederlandse vertaling. Komt onder de Arabische tekst.                    |
| `source`        | Bron (bv. "Sahieh al-Boekhari") — verplicht bij hadith                              |
| `reference`     | Hadith-nummer of -referentie (bv. "6018")                                            |
| `grade`         | Hadith-status (bv. "Sahieh", "Hasan", "Mutawatir")                                   |
| `display_from`  | Optioneel — toon vanaf datum/tijd. Leeg = direct.                                    |
| `display_until` | Optioneel — verberg na datum/tijd. Leeg = onbeperkt.                                  |
| `active`        | Snelle aan/uit-schakelaar. `false` = niet tonen, ook bij `published`.                |
| `show_on_tv`    | Aparte vlag — laat staan op `true`.                                                  |
| `sort`          | Lager getal verschijnt eerder in de rotatie.                                         |

#### Wat zie ik op het scherm?

- **Voor `hadith`**: titel, Arabische tekst (groot), vertaling, daaronder bron + referentie + grade in cursief.
- **Voor de andere types**: titel + body. Eventueel `arabic_text` als je dat wilt tonen.
- Items roteren elke **18 seconden**. Onderaan verschijnen kleine streepjes als rotatie-indicator.

#### Voorbeeld — een hadith

| Veld          | Waarde                                                                         |
|---------------|--------------------------------------------------------------------------------|
| `status`      | `published`                                                                    |
| `type`        | `hadith`                                                                       |
| `title`       | De waarde van een glimlach                                                     |
| `arabic_text` | تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ                                         |
| `translation` | "Een glimlach naar je broeder is een aalmoes."                                |
| `source`      | Jami` at-Tirmidhi                                                             |
| `reference`   | 1956                                                                           |
| `grade`       | Sahieh                                                                         |
| `active`      | `true`                                                                          |
| `sort`        | 10                                                                             |

#### Voorbeeld — een mededeling

| Veld     | Waarde                                                              |
|----------|---------------------------------------------------------------------|
| `status` | `published`                                                         |
| `type`   | `announcement`                                                      |
| `title`  | Vrijdaggebed verplaatst                                             |
| `body`   | Aanstaande vrijdag start de Khoetbah om 13:30 i.v.m. werkzaamheden. |
| `active` | `true`                                                              |
| `sort`   | 0                                                                   |

### 22.3 Ahadith — handmatig invoeren, altijd verifiëren

> ⚠️ **Belangrijk**: ahadith voer je **altijd handmatig** in. Er is bewust geen externe hadith-API gekoppeld omdat:
>
> - de bron en grade **gecontroleerd** moeten zijn voor je het op een tv-scherm zet
> - automatische import zou kunnen leiden tot zwakke of vervalste overleveringen
> - het past bij de stijl van de site: rustig, beheerd, niet vol met content

Bron + referentie + grade altijd zelf invullen, bij voorkeur uit een betrouwbare verzameling (Sahieh al-Boekhari, Sahieh Moeslim, Sunan-werken, Riyad as-Salihien etc.). Bij twijfel: niet plaatsen.

### 22.4 Tijdelijke mededelingen plannen

Wil je een mededeling die **alleen volgende week** verschijnt? Vul `display_from` en `display_until` in:

- `display_from = 2026-05-15 00:00`
- `display_until = 2026-05-22 23:59`

De pagina filtert items automatisch op het tijdvenster. Buiten dat venster wordt het item niet getoond, ook als `status=published` is.

### 22.5 Wat NIET in tv_announcements hoort

- ❌ Persoonlijke namen of telefoonnummers (komt op groot scherm in de gemeenschap)
- ❌ Lange teksten — houd het bij 1-3 zinnen, leesbaar op afstand
- ❌ Externe links of QR-codes (die kun je beter naar `/dawahcommissie` of `/contact` verwijzen)
- ❌ Iconen, emoji's of opmaak in de tekst — de layout doet dit zelf

### 22.6 Slideshow-snelheid en refresh-interval instellen

In **Site Settings** kun je drie velden aanpassen om het tempo en de versheid van de TV-display te tunen:

| Veld                       | Eenheid  | Default | Wat doet het?                                                                  |
|----------------------------|----------|---------|--------------------------------------------------------------------------------|
| `tv_prayer_slide_seconds`  | seconden | 25      | Hoe lang de gebedstijden-slide te zien is voordat de volgende mededeling komt   |
| `tv_item_slide_seconds`    | seconden | 15      | Hoe lang elke mededeling/hadith/reminder te zien is                             |
| `tv_refresh_minutes`       | minuten  | 5       | Hoe vaak de TV-pagina nieuwe data ophaalt vanaf de server (announcements/CSV)   |

Veilige grenzen:

- prayer/item slide-duur worden geclamp naar minimaal 5 / 3 seconden en maximaal 600 (10 min). Hierdoor kun je niet per ongeluk de TV onleesbaar snel zetten.
- refresh-interval wordt geclamp naar minimaal 1 en maximaal 240 minuten.
- Leeg laten of een ongeldige waarde → fallback naar default.

Wijzigingen worden zichtbaar zodra de TV de pagina opnieuw laadt — wacht hier maximaal `tv_refresh_minutes` op, of laad de pagina handmatig opnieuw.

> 💡 Tip: voor een rustige tv-ervaring werken `25` / `15` / `5` prima. Wil je een drukkere mededelingen-cyclus tijdens een evenement? Zet bv. `tv_item_slide_seconds = 10` zodat de carousel sneller doorrolt. Voor heel kort iets aankondigen kan `tv_refresh_minutes = 1` zodat het direct verschijnt.


---

## 23. Islamitische kalender (`hijri_date_overrides`)

Op `/gebedstijden/overzicht` staat naast de gewone gregoriaanse datum nu ook de **Hidjri-datum** in een aparte kolom rechts. Bovenaan zie je de Hidjri-range van de geselecteerde maand (bv. *21 Dhul-Qi'dah 1447 — 21 Dhul-Hidjja 1447*).

Op `/gebedstijden` zie je naast de "Vandaag — woensdag 08-05" header een klein chip met de Hidjri-datum van vandaag.

### 23.1 Werking

- Standaard wordt de Hidjri-datum berekend volgens **Umm al-Qura** (de Saoedische berekeningsmethode), via de native browser/Node API. Dit werkt zonder externe API of dependency.
- De berekening is consistent met wat gangbaar is in NL-moskeeën.

### 23.2 Wanneer overrides nodig zijn

Soms wijkt een lokaal vastgestelde datum (bv. **start Ramadan na maanwaarneming**) af van Umm al-Qura. Dan kun je voor specifieke dagen een handmatige override invoeren in **Hijri Date Overrides**.

| Veld              | Wat is het?                                                       |
|-------------------|--------------------------------------------------------------------|
| `gregorian_date`  | De gregoriaanse datum die je wilt overrulen (uniek — één per dag) |
| `hijri_day`       | Hidjri-dag (1–30)                                                  |
| `hijri_month`     | Hidjri-maand (1–12, dropdown met namen)                            |
| `hijri_year`      | Hidjri-jaar (bv. 1447)                                             |
| `note`            | Optionele toelichting (bv. "Start Ramadan na maanwaarneming")     |
| `active`          | Snel uit te zetten zonder te verwijderen                           |

### 23.3 Voorbeeld

Stel: Umm al-Qura zegt dat 1 Ramadan 1447 valt op 18 februari 2026. Maar lokaal in NL is na maanwaarneming bepaald dat 1 Ramadan 1447 op **19 februari 2026** is. Dan voer je in:

| Veld | Waarde |
|------|--------|
| `gregorian_date` | 2026-02-19 |
| `hijri_day` | 1 |
| `hijri_month` | 9 — Ramadan |
| `hijri_year` | 1447 |
| `note` | Start Ramadan na maanwaarneming Steenbergen |
| `active` | true |

Vanaf dat moment toont het maandoverzicht voor 19 februari "1 Ramadan 1447" in plaats van wat Umm al-Qura zou geven.

### 23.4 Beperkingen

- Overrides werken **per dag** — niet per maand of langere periode. Voor een nieuwe Ramadan-start moet je alleen de eerste dag overruleren; de daaropvolgende dagen worden weer via Umm al-Qura berekend (en kloppen dan automatisch want ze blijven meelopen).
- Heb je liever een hele Ramadan handmatig vastleggen? Dan voeg je 30 (of 29) opeenvolgende overrides toe.

---

## 24. Onderwerpen contactformulier (`contact_subjects`)

Het onderwerp-veld in het contactformulier op `/contact` is nu een **dropdown** in plaats van een vrij tekstveld. Beheer de keuzes via Directus → **Contact Subjects**.

### 24.1 Standaardonderwerpen

Bij eerste seed worden zes onderwerpen aangemaakt (alleen als ze nog niet bestaan — handmatige edits worden nooit overschreven):

- Algemeen
- Onderwijs
- Donaties
- Activiteiten
- Gebedstijden
- Technisch probleem

### 24.2 Een nieuw onderwerp toevoegen

| Veld         | Wat doe je ermee?                                                                |
|--------------|----------------------------------------------------------------------------------|
| `status`     | `published` om te tonen, `draft` om verborgen te houden                          |
| `label`      | Wat de bezoeker ziet, bv. "Vrijdagpreek-suggestie"                               |
| `value`      | Wat in `contact_messages.subject` wordt opgeslagen. Houd kort en uniek.           |
| `description` | Optionele uitleg voor admin (niet zichtbaar voor bezoeker)                       |
| `sort`       | Lager getal = eerder in de dropdown                                              |
| `active`     | Snel uit te zetten zonder de status te wijzigen                                  |

### 24.3 Werking en validatie

- Op `/contact` verschijnen alleen onderwerpen met `status=published` én `active=true`, gesorteerd op `sort` oplopend
- De API valideert het ingestuurde onderwerp tegen de lijst — onbekende waarden worden geweigerd met een nette foutmelding
- In `contact_messages` wordt de **label** opgeslagen (de leesbare versie), niet de `value`. Zo zie je in de admin-mailbox direct wat de bezoeker bedoelde.

### 24.4 Wat als de lijst leeg is?

Mocht je per ongeluk alle onderwerpen op `draft` zetten of de collectie leegmaken, dan valt het formulier automatisch terug op een vrij tekstveld. **Geen lock-out** voor bezoekers. Maar de seed maakt altijd minstens 6 standaardonderwerpen aan, dus dit zou alleen in extreme gevallen gebeuren.


---

## 25. Artikel-categorieën (`article_categories`)

In plaats van een vrij tekstveld op elk artikel kun je nu categorieën centraal beheren via Directus → **Article Categories**. Op `/artikelen` verschijnen alleen categorieën die daadwerkelijk een gepubliceerd artikel hebben.

### 25.1 Een categorie maken

| Veld         | Wat doe je ermee?                                                       |
|--------------|-------------------------------------------------------------------------|
| `status`     | `published` om te tonen, `draft` om verborgen te houden                 |
| `name`       | Wat de bezoeker ziet, bv. "Lezing"                                      |
| `slug`       | Wordt gebruikt in `/artikelen?category=...` URL                          |
| `description` | Optionele uitleg voor admin                                             |
| `sort`       | Lager getal = eerder in de filterlijst                                  |
| `active`     | Snel uit te zetten                                                       |

### 25.2 Een artikel koppelen

In Directus → **Articles** → bij elk artikel zie je het veld `category_ref`. Selecteer een categorie uit de dropdown. Bestaande artikelen die nog de oude `category` (vrij tekstveld) gebruiken blijven werken — die string wordt automatisch als categorienaam getoond. Wil je een oud artikel bijwerken? Vul `category_ref` in en het werkt direct via het nieuwe systeem.

### 25.3 Standaardcategorieën

Bij eerste seed worden vier categorieën aangemaakt (alleen als ze nog niet bestaan): Nieuws, Lezing, Reflectie, Activiteit. Bewerk vrij of voeg eigen categorieën toe.

### 25.4 Wat is er met de oude `category` string?

Het oude veld `articles.category` (vrij tekstveld) is bewust **niet** verwijderd. Het wordt nog gebruikt als fallback voor records die nog geen `category_ref` hebben. Dit voorkomt dat oude content breekt. Op termijn kun je oude artikelen handmatig migreren naar de nieuwe collectie.

---

## 26. Video-categorieën + homepage-video's (`video_categories`)

### 26.1 Categorieën beheren

Zelfde patroon als artikel-categorieën — Directus → **Video Categories**. Standaard worden drie categorieën aangemaakt: Vrijdagpreken, Lezingen, Activiteiten. Op `/videos` verschijnt een filter-balk, en op mobiel kunnen bezoekers nu **horizontaal swipen** door de video's via CSS scroll-snap.

Aan een video koppel je een categorie via het `category_ref` veld in Directus → **Videos**.

### 26.2 Video's op de homepage

Wil je een video uitlichten op `/`? Open de video in Directus en vink **`show_on_homepage`** aan. Optioneel kun je `homepage_sort` invullen (lager = eerder).

- Maximaal 3 video's worden getoond (de eerste 3 op `homepage_sort` oplopend)
- De homepage-sectie verschijnt alleen als er minimaal één homepage-video is — anders blijft de homepage zoals voorheen
- Onder de video's staat een knop "Alle video's" naar `/videos`

### 26.3 Mobile swipe

Op smartphones (`<sm` breakpoint) wordt het video-grid een horizontale carousel met scroll-snap. Bezoekers vegen door de video's. Op tablet en desktop blijft het een normale grid (2 of 3 kolommen). **Geen extra library** — alleen CSS.

---

## 27. Stripe Payment Links per campagne

Voor zichtbaarheid in Stripe Dashboard kun je per donatiecampagne een directe Payment Link configureren. Bezoekers worden dan voor die campagne direct doorgestuurd naar Stripe (in plaats van eerst onze eigen formulier-flow). De technische details staan in `docs/STRIPE_SETUP.md` sectie 12 — hier alleen wat je in Directus doet.

### 27.1 In Directus

Open een campagne → **Donation Campaigns** → vul in:

| Veld                       | Waarde                                              |
|----------------------------|-----------------------------------------------------|
| `use_stripe_payment_link`  | aangevinkt                                           |
| `stripe_payment_link_url`  | de URL uit Stripe Dashboard (begint met `https://buy.stripe.com/`) |
| `stripe_payment_link_id`   | optioneel — Stripe-ID `plink_xxx`                    |

Vanaf dat moment toont het donatieformulier op `/doneren` voor deze campagne een knop "Doorgaan naar Stripe" in plaats van de standaard velden.

### 27.2 Belangrijk om te weten

- **Naam, e-mail, bedrag** worden op de Stripe-pagina ingevuld, niet op onze site
- **Reconciliatie**: wij sturen automatisch `?client_reference_id=<campagne-slug>` mee — daarmee kun je in Stripe Dashboard filteren
- **Webhook werkt nog steeds**: betalingen komen alsnog in Directus → `donations` terecht
- **Beperking**: omdat wij naam/email niet vooraf weten, valt de webhook terug op `customer_details` van Stripe. Iets minder rijk dan onze eigen flow, maar wel volledig functioneel
- **Veiligheid**: alleen URLs van `buy.stripe.com` of `checkout.stripe.com` worden geaccepteerd

### 27.3 Terugzetten

Vink `use_stripe_payment_link` uit. Direct werkt de standaard flow weer. URL-veld mag je laten staan voor later.


---

## 28. Onderwijs-inschrijvingen — meerdere kinderen, studentnummers, voorwaarden

### 28.1 Hoe de flow werkt voor de bezoeker

Bij `/onderwijs/[programma-slug]` ziet de bezoeker eerst alle informatie over het programma — titel, beschrijving, docent, doelgroep, planning, locatie. Daarna komt een blok met "Klaar om in te schrijven?" en een knop **Inschrijven** die naar het formulier scrollt.

In het formulier vult de **ouder/contactpersoon** zijn gegevens in (naam, e-mail, telefoon — exact 10 cijfers verplicht), en daaronder voegt hij **één of meerdere kinderen/studenten** toe. Per kind: naam, geslacht, leeftijd (optioneel), opmerkingen (optioneel).

Twee verplichte vinkjes onderaan:
1. **Privacyverklaring** — bestaande checkbox
2. **Voorwaarden van de organisatie** — nieuwe checkbox

### 28.2 Studentnummers (auto-gegenereerd)

Elk kind krijgt automatisch een uniek **studentnummer** met formaat:

```
JJ-MM-DD-XXXX
```

Bijvoorbeeld: `26-05-08-0001`. Het laatste deel telt op per dag — de tweede inschrijving van vandaag krijgt `0002`, de derde `0003`, etc. Als een ouder drie kinderen tegelijk inschrijft krijgen ze opeenvolgende nummers (bv. `0007`, `0008`, `0009`).

Het studentnummer staat in Directus → **Registrations** → veld `student_number`. Read-only — wordt automatisch gegenereerd.

> **Race condition**: bij twee gelijktijdige inschrijvingen op dezelfde seconde kan in theorie hetzelfde nummer worden uitgegeven. Voor de huidige schaal (kleine moskee) is dit acceptabel. Mocht het ooit voorkomen: bewerk het nummer handmatig in Directus.

### 28.3 Records van één indiening bij elkaar houden

Alle kinderen die in dezelfde indiening worden aangemeld krijgen dezelfde **`registration_group_id`** (een UUID). In Directus → **Registrations** kun je hierop filteren om alle kinderen van één gezin/inzending bij elkaar te zien.

### 28.4 Filteren: onderwijs vs activiteit

In de Registrations collectie staan zowel onderwijsinschrijvingen als activiteit-inschrijvingen. Filter:

- **Onderwijs**: `type = education` (heeft ook `student_number` ingevuld + `parent_*` velden)
- **Activiteiten**: `type = activity` (heeft géén student_number; `parent_*` velden leeg)

Tip: maak in Directus een **gefilterde view** zodat je in het navigatie-paneel direct "Onderwijs-inschrijvingen" en "Activiteit-inschrijvingen" als aparte ingangen hebt.

### 28.5 Beheerbare inschrijfteksten per programma/activiteit

Open een programma (Directus → **Education Programs**) of activiteit (Directus → **Activities**). Onderaan vind je vijf optionele velden voor het inschrijfformulier:

| Veld                            | Waar verschijnt het?                                  |
|---------------------------------|-------------------------------------------------------|
| `registration_intro_title`      | Kop boven het formulier (default: "Inschrijven")     |
| `registration_intro_text`       | Inleidende tekst onder de kop                         |
| `registration_button_text`      | Tekst op de submit-knop (default: "Inschrijving versturen") |
| `registration_success_message`  | Bevestigingstekst na succesvolle inschrijving        |
| `registration_extra_note`       | Extra notitie onderaan het formulier                  |

Laat een veld leeg om de standaardtekst te gebruiken. Bestaande programma's blijven werken zonder dat je deze velden invult.

### 28.6 Voorwaardenlink instellen

Open Directus → **Site Settings** en vul in:

| Veld                          | Waarde                                                                |
|-------------------------------|-----------------------------------------------------------------------|
| `registration_terms_url`      | URL naar voorwaardenpagina (intern als `/voorwaarden` of extern)      |
| `registration_terms_label`    | Eigen tekst voor de checkbox (optioneel — anders default-tekst)       |

De checkbox verschijnt alleen bij onderwijs-inschrijvingen. Als `registration_terms_url` leeg is, toont de checkbox alleen tekst zonder link.

### 28.7 Gedrag bij activiteit-inschrijvingen

De activiteit-flow is bewust **vrijwel ongewijzigd**:
- Geen parent/child-blok — single-student-formulier zoals voorheen
- Telefoon optioneel (maar als gevuld dan 10 cijfers)
- Geen voorwaarden-checkbox (alleen privacy)
- Beheerbare teksten werken óók (registration_intro_title etc. op activities)

Bestaande activiteit-inschrijvingen die vóór deze release zijn ingediend blijven gewoon zichtbaar in Directus.

### 28.8 Wat als er iets misgaat tijdens multi-student opslaan?

Stel: een ouder schrijft 3 kinderen in en bij kind 2 faalt iets. De API:
1. Logt welke kinderen al zijn aangemaakt (met group_id)
2. Geeft een nette foutmelding: "Niet alle inschrijvingen konden worden opgeslagen. Neem contact op met de moskee om uw inschrijving te controleren."
3. Geen automatische rollback — de admin kan in Directus zien welke kinderen al zijn aangemaakt (filter op `registration_group_id`) en handmatig de ontbrekende toevoegen

Voor de huidige schaal (paar inschrijvingen per dag) is dit een acceptabele afweging tegenover een complexe transactie-flow.


---

## 29. Gebedstijden-overzicht: islamitische maand leidend

`/gebedstijden/overzicht` werkt nu **Hijri-eerst**. De bezoeker kiest een Hidjri-maand en Hidjri-jaar, en krijgt:
- Een header-strip met de maandnaam (NL + Arabisch) en de gregoriaanse datum-range
- Een tabel waar elke rij een Hidjri-dag is (`1`, `2`, …, `30`), met daarnaast de gregoriaanse datum + weekdag + 6 gebedstijden

### 29.1 Hoe het rekent

Voor elke gregoriaanse datum in de geüploade CSV bepaalt de site automatisch de bijbehorende Hidjri-datum via Umm al-Qura (native browser API, geen externe call). Daarna selecteert de tabel alleen de dagen die in de gekozen Hidjri-maand vallen.

Een Hidjri-maand is altijd 29 of 30 dagen. Beide werken automatisch — de tabel is gewoon een dag korter of langer.

### 29.2 Beschikbare maanden

In de selector verschijnen alleen Hidjri-maanden die **daadwerkelijk dekking hebben in de geüploade CSV**. Heb je bijvoorbeeld een CSV voor heel 2026, dan verschijnen de Hidjri-maanden van rond Joemaada al-Akhirah 1447 t/m Joemaada al-Oela 1448.

### 29.3 Overrides werken mee

Als je een handmatige Hidjri-override hebt toegevoegd (zie sectie 23), dan wordt die ene dag automatisch in de juiste Hidjri-maand getoond — en kan dus dag 1 van Ramadan een dag verschuiven. Het sterretje (`*`) achter de Hidjri-dag in de tabel geeft aan dat het om een handmatige correctie gaat.

### 29.4 Wat verandert er voor `/gebedstijden` (vandaag-card)?

Niets. De huidige "Vandaag — woensdag 08-05" kop blijft werken zoals voorheen, met de Hidjri-chip ernaast. Alleen `/gebedstijden/overzicht` is Hijri-leidend.


---

## 30. ⭐ Pagina "Onze moskee" en logo van Moskee El Mouahidin

### 30.1 Achtergrond — wie is wat

Al-Ghofraan is **geen aparte moskee**. Al-Ghofraan is de **da'wahcommissie** binnen **Moskee El Mouahidin** (Stichting El Mouahidin) in Den Haag. De pagina `/onze-moskee` is gemaakt om dit aan bezoekers duidelijk te maken, met name aan bezoekers die binnenkort via een redirect van `elmouahidin.nl` op deze website terechtkomen.

**Belangrijk bij het bewerken van teksten**: formuleer altijd correct als _"Al-Ghofraan, de da'wahcommissie van Moskee El Mouahidin"_. Schrijf nooit dat Al-Ghofraan zelf de moskee is.

### 30.2 De pagina bewerken

De pagina is een gewone CMS-pagina. Bewerk hem via Directus:

1. **Content → page_content**
2. Open het record met slug `onze-moskee`
3. Pas `title`, `subtitle`, `intro`, `body` en SEO-velden aan zoals bij elke andere pagina
4. Status laten op `published`

De pagina is bereikbaar via `/onze-moskee` op de site. Standaard is hij **niet** in het hoofdmenu of de footer opgenomen — bezoekers komen er via de externe redirect (zie sectie 32) of via een directe link.

Wil je hem alsnog in het menu? Voeg een navigation_items-record toe met `href=/onze-moskee` (zie sectie 2).

### 30.3 Het logo van Moskee El Mouahidin uploaden

Er is een speciaal veld `mosque_logo` op page_content. Vul dit alleen op het `onze-moskee` record — op andere pagina's wordt het veld niet getoond op de site.

**Stappen**:

1. **Content → page_content → onze-moskee**
2. Scroll naar het veld **Mosque logo**
3. Klik op het upload-veld of sleep een bestand erin
4. Aanbevolen: PNG met transparante achtergrond, breedte 400–800 px
5. Opslaan

**Op de site**: het logo verschijnt gecentreerd op de pagina, tussen de hero en de body, met een maximale breedte van ~384 px. Op kleinere schermen schaalt het automatisch mee.

**Logo verwijderen**: open het record, klik op het kruisje bij het logo-veld, opslaan. De pagina blijft gewoon werken — er verschijnt dan geen afbeelding op die plek.

### 30.4 Wat als ik niets zie?

- **Geen pagina op `/onze-moskee`?** Controleer of het page_content-record bestaat en `status=published` is.
- **Logo niet zichtbaar terwijl ik een bestand heb geüpload?** Sluit de Directus-edit-modal, refresh de pagina in een nieuw tabblad. Als het bestand nog "draft" is in Directus File Library, zet het op published. Hard-refresh (`Ctrl+Shift+R`) in de browser om browser-cache te omzeilen.
- **Te groot of te klein logo?** Het frontend-element heeft `max-w-sm` (~384 px). Voor de scherpste weergave is een PNG van ongeveer 600 px breed ideaal.


---

## 31. E-mailnotificaties (cPanel SMTP)

### 31.1 Wat het doet

Wanneer een bezoeker een formulier indient (contactformulier, activiteit-inschrijving, onderwijs-inschrijving), kan de site **automatisch een interne notificatie-mail** sturen naar het afdelingsadres. Bezoekers krijgen géén bevestigingsmail — alleen de beheerders.

Verzending loopt via **cPanel SMTP** (de mailbox in jullie webhosting-pakket), met nodemailer als verzendlaag.

### 31.2 Vereiste env-variabelen op de server

De SMTP-instellingen staan in het `.env`-bestand op de VPS, niet in Directus. Stel ze in via je hosting-omgeving:

```
SMTP_HOST=mail.al-ghofraan.nl
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@al-ghofraan.nl
SMTP_PASS=<wachtwoord van die cPanel-mailbox>
```

Variant met port 587: `SMTP_PORT=587` + `SMTP_SECURE=false` (STARTTLS). Beide werken op cPanel.

De `SMTP_USER`-mailbox moet **bestaan in cPanel** (Email Accounts → Create). Geadviseerd: maak een dedicated `noreply@al-ghofraan.nl` mailbox aan met een sterk wachtwoord. Dit wachtwoord komt vervolgens in `SMTP_PASS`.

### 31.3 Aan/uit en ontvangstadressen instellen in Directus

Naar **Settings → Site Settings**:

| Veld | Waarde / betekenis |
|---|---|
| `email_notifications_enabled` | Master-switch. Zet op **AAN** om mails te activeren. Op UIT = geen mail wordt verzonden, ongeacht andere instellingen. |
| `email_from_name` | Display-naam in de "Van"-regel van de mail (bv. `Al-Ghofraan website`). Fallback wanneer leeg: `Al-Ghofraan`. |
| `email_from_address` | Wordt als **Reply-To** gebruikt (zie 31.4). Wanneer ontvanger op "Beantwoorden" klikt, gaat de reply naar dit adres. Bijvoorbeeld `info@al-ghofraan.nl`. |
| `notification_email_contact` | Ontvangstadres voor contactformulier-meldingen. |
| `notification_email_education` | Ontvangstadres voor onderwijsinschrijvingen. |
| `notification_email_activities` | Ontvangstadres voor activiteit-inschrijvingen. |
| `notification_email_donations` | **Gereserveerd — niet in gebruik.** Donatie-notificaties worden in deze versie nog niet verzonden. Vul gerust een adres in voor later; er gebeurt nu niets mee. |

Een afdelingsadres mag je per onderwerp verschillen (bv. apart `onderwijs@…` en `activiteiten@…`), maar je mag ook drie keer hetzelfde adres invullen.

**Als een afdelingsadres leeg is**, gaat er voor die afdeling geen mail. Geen fout — gewoon overgeslagen, met een korte log-regel op de server.

### 31.4 Van / Reply-To gedrag

cPanel weigert standaard mails waarvan de "Van"-regel niet matcht met de SMTP-user. Daarom heeft de site het volgende patroon:

- **Van**: `"<email_from_name>" <SMTP_USER>` — voorbeeld: `"Al-Ghofraan website" <noreply@al-ghofraan.nl>`
- **Beantwoorden naar**: `email_from_address` uit Directus — als gevuld

Dit betekent dat een admin die "Beantwoorden" klikt in zijn mailclient, automatisch naar het Reply-To-adres mailt (bijv. `info@al-ghofraan.nl`) — niet naar `noreply@…`. Voor de meeste mail-apps zichtbaar als "antwoord aan info@al-ghofraan.nl".

### 31.5 Wat als mail niet werkt? (fail-soft)

Het versturen van een notificatie kan **nooit een formulier-inzending blokkeren**. Concrete scenario's:

| Situatie | Wat de bezoeker ziet | Wat er in de server-logs staat |
|---|---|---|
| Master-switch staat uit | Normale bevestiging | Niets (stil) |
| Afdelingsadres leeg | Normale bevestiging | `[notify:<dept>] geen ontvanger ingesteld — overgeslagen` |
| SMTP-env-vars onvolledig | Normale bevestiging | `[notify:<dept>] SMTP niet (volledig) geconfigureerd …` |
| SMTP-fout (auth, netwerk) | Normale bevestiging | `[notify:<dept>] SMTP-verzending mislukt (genegeerd): <reden>` |
| Mail succesvol | Normale bevestiging | `[notify:<dept>] mail verzonden naar j***@…` |

In alle gevallen wordt de inschrijving / het contactbericht **gewoon in Directus opgeslagen**. Als de mail-notificatie faalt, ziet de admin het bericht alsnog in de Directus admin-lijst.

### 31.6 Donatie-notificaties

Stand van zaken: het veld `notification_email_donations` bestaat in Site Settings en is voorbereid, maar er wordt **op dit moment geen donatie-notificatie verzonden**. Donaties komen wel binnen in Directus (collectie `donations`) en zijn daar zichtbaar; Stripe stuurt zelf een ontvangstbevestiging naar de donor. Wanneer in een latere release ook interne donatie-notificaties gewenst zijn, kan dit op het bestaande `notification_email_donations`-veld worden aangesloten.


---

## 32. Externe domein-redirect — `elmouahidin.nl`

### 32.1 Wat en waarom

Het domein `elmouahidin.nl` (en `www.elmouahidin.nl`) zal binnenkort als 301-redirect naar `https://al-ghofraan.nl/onze-moskee` worden ingesteld. Doel: bezoekers die naar de "moskee-naam" zoeken komen direct op de pagina die uitlegt dat Al-Ghofraan de da'wahcommissie van Moskee El Mouahidin is, en zien daar het logo van de moskee.

### 32.2 Waar wordt de redirect ingesteld?

**Buiten de Next.js-app**, op het Caddy-niveau (reverse proxy / webserver). De Caddy-config van de VPS krijgt een regel zoals:

```caddy
elmouahidin.nl, www.elmouahidin.nl {
    redir https://al-ghofraan.nl/onze-moskee permanent
}
```

`permanent` = HTTP 301, wordt door browsers en zoekmachines gecached.

### 32.3 Wat moet er in de site-code gebeuren?

Voor de redirect zelf: **niets**. De pagina `/onze-moskee` bestaat al op `al-ghofraan.nl` en is een normale CMS-pagina. De redirect gebeurt vóór het verzoek bij Next.js aankomt.

DNS-zijde: zorg dat `elmouahidin.nl` (en `www.`) naar dezelfde server als `al-ghofraan.nl` wijzen, anders bereikt de redirect-regel het niet.

### 32.4 Testen na inschakeling

1. Open een incognito-venster
2. Ga naar `https://elmouahidin.nl/`
3. Verwacht: automatische redirect naar `https://al-ghofraan.nl/onze-moskee`
4. Controleer in DevTools → Network dat de eerste response status `301` is

Als de redirect-loop, of een 404, of "site can't be reached" verschijnt: DNS of Caddy-config eerst controleren. De Next.js-app is dan niet aan de beurt.


---

## 33. SEO — vindbaarheid via Google

De technische SEO-basis is ingericht. Hieronder hoe je per pagina kan bijsturen, en hoe Google de site indexeert.

### 33.1 SEO-titel en -beschrijving per pagina

Voor elke CMS-pagina (in `page_content`) kun je twee SEO-velden invullen:

| Veld | Wat het doet |
|---|---|
| `seo_title` | De titel die Google in de zoekresultaten toont. Houd onder ~60 tekens. Laat leeg = de gewone pagina-titel wordt gebruikt. |
| `seo_description` | De korte beschrijving onder de titel in Google. Houd ~150–160 tekens. Laat leeg = de `intro` van de pagina wordt gebruikt, of als die ook leeg is de site-brede default uit Site Settings. |

**Site-brede defaults** staan in **Settings → Site Settings**:

- `default_seo_title` — fallback-titel voor pagina's zonder eigen seo_title
- `default_seo_description` — fallback-beschrijving

### 33.2 OpenGraph (social preview)

Wanneer iemand een link van de site deelt op WhatsApp, Facebook of LinkedIn, verschijnt er een preview-kaartje met een afbeelding. Die afbeelding heet `og:image`.

**Site-brede default**:
- **Settings → Site Settings → og_image** — wordt gebruikt voor elke pagina waarop geen pagina-specifieke afbeelding staat. Aanbevolen formaat: 1200×630 px JPG of PNG.

**Per-pagina overschrijven** gebeurt automatisch wanneer het bijbehorende beeld-veld is gevuld:

| Pagina-type | Veld dat als og:image dient |
|---|---|
| Activiteit-detail (`/agenda/[slug]`) | `activities.image` |
| Vacature-detail (`/vacatures/[slug]`) | `vacancies.hero_image` |
| CMS-pagina (`/onze-moskee`, `/dawahcommissie`, etc.) | `page_content.hero_background_image` |

Geen werk om dit te activeren — gewoon het bijbehorende beeldveld vullen in Directus. Lege velden vallen terug op de site-brede og_image.

### 33.3 Canonical URLs

Elke pagina heeft automatisch een `<link rel="canonical">` in de HTML head, opgebouwd uit:

```
NEXT_PUBLIC_SITE_URL + huidige pad
```

In productie levert dat URLs zoals `https://al-ghofraan.nl/agenda/iftar-2026`. **Niets te configureren** in Directus — dit gebeurt automatisch via de Next.js metadata-laag en de env-variabele `NEXT_PUBLIC_SITE_URL` op de server.

Een verkeerde `NEXT_PUBLIC_SITE_URL` (bv. nog `.com` in plaats van `.nl`) zou Google verkeerde URLs laten indexeren — controleer de env-var op de VPS bij twijfel.

### 33.4 Sitemap

De sitemap is te bekijken op `https://al-ghofraan.nl/sitemap.xml`. Hij wordt **automatisch opgebouwd** uit:

- vaste publieke routes (homepage, agenda, gebedstijden, …)
- alle gepubliceerde `page_content` pagina's (inclusief `/onze-moskee`)
- alle gepubliceerde activiteit-detailpagina's (ook verleden activiteiten — Google blijft archief-pagina's serveren voor zoekopdrachten naar specifieke evenementen)
- alleen **open** vacature-detailpagina's (vacatures met deadline in de toekomst of zonder deadline). Verlopen vacatures blijven bereikbaar via directe URL maar staan niet meer in de sitemap.

**Wat NIET in de sitemap komt**:
- Drafts en archived content
- TV-route `/gebedstijden/tv` (intern moskee-display)
- API endpoints
- Verlopen vacatures (zoals hierboven)

**Sitemap actief krijgen na nieuwe content**: gewoon publiceren in Directus en de revalidate-periode afwachten (standaard ~10 minuten). Na een productie-rebuild verschijnt nieuwe content direct.

### 33.5 Robots

`https://al-ghofraan.nl/robots.txt` zegt crawlers:
- alles indexeren behalve `/gebedstijden/tv` en `/api`
- de sitemap is hier te vinden

Geen Directus-instellingen nodig.

### 33.6 Structured data voor activiteiten

Op elke `/agenda/[slug]` pagina wordt **automatisch een JSON-LD `Event`-blok** in de HTML toegevoegd. Google's Rich Results gebruikt dit om de activiteit als event-card in de zoekresultaten te tonen (met datum, locatie, link).

De data komt rechtstreeks uit de activiteit-velden in Directus:

| Schema-veld | Komt uit |
|---|---|
| `name` | `activities.title` |
| `description` | `activities.description` (HTML stripped, max 500 tekens) |
| `startDate` | `activities.start_date` |
| `endDate` | `activities.end_date` (optioneel) |
| `location.name` | `activities.location` — of fallback "Moskee El Mouahidin" als leeg |
| `image` | `activities.image` — alleen als gevuld |
| `organizer.name` | Hardcoded: "Al-Ghofraan — da'wahcommissie van Moskee El Mouahidin" |
| `url` | Automatisch op basis van slug |

Geen actie nodig vanuit het CMS. Hou wel `start_date` altijd correct ingevuld — zonder die datum wordt het JSON-LD blok overgeslagen (en de pagina werkt verder normaal, maar zonder rich result in Google).

### 33.7 Google Search Console

Om te zien hoe Google de site indexeert en welke pagina's bezocht worden vanuit zoekresultaten, gebruik **Google Search Console** (`https://search.google.com/search-console`):

1. **Property toevoegen** voor `https://al-ghofraan.nl`
2. **Verificatie** via DNS TXT-record of een meta-tag (beheerder VPS / Caddy)
3. **Sitemap indienen** — bij Sitemaps → URL invoeren `sitemap.xml` (Search Console plakt het basisdomein er automatisch voor)
4. **URL Inspection** — om een specifieke pagina door Google te laten her-indexeren wanneer iets is gewijzigd

In Search Console kun je ook fouten zien (404's, ontbrekende metadata, structured-data-issues bij activiteiten). Aangeraden: één keer per maand even doorlopen.

### 33.8 Wat niet meer hoeft

- Geen handmatige canonical URLs per pagina — gebeurt automatisch
- Geen sitemap-bijwerkingen bij nieuwe content — gebeurt automatisch (na rebuild of revalidate)
- Geen og:image hardcoded per pagina — Directus-velden volstaan
- Geen JSON-LD handmatig schrijven voor activiteiten — komt uit de Activity-data


---

Hulp nodig: neem contact op met de webbeheerder van de DawahCommissie.
