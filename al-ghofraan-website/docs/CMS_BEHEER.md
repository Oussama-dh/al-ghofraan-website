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

## Hoe controleer ik dat een wijziging werkt?

1. Wijzig in Directus → klik **Save**
2. Vernieuw de pagina in de browser
3. De nieuwe content moet meteen zichtbaar zijn

In ontwikkelmodus is de cache uitgeschakeld — geen container-restart nodig.

Als iets niet werkt:
- Staat `status` op `published` (voor pagina's) of `active` op `true` (voor secties/items/menu's)?
- Matchen `page_slug` en `section_key` exact?
- Staat de slug niet in de gereserveerde lijst (sectie 1)?

Hulp nodig: stuur een mail naar **el-masoudi@hotmail.com**.
