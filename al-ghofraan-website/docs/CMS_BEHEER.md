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
   een tekst-input. Als dat fout zit, draai `npm run seed` opnieuw —
   stap 1i patcht oude UUID-input velden naar correcte `file-image`
   interface

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
Elke inschrijving heeft een relatie naar het bijbehorende onderwijsprogramma
of de activiteit (zie velden `education_program` en `activity`).

> ℹ️ Eerder stond hier dat je inschrijvingen ook **vanuit** een programma
> of activiteit kon zien (een aparte "Inschrijvingen"-tab). Dat is uit de
> seed verwijderd: het leverde een database-fout op
> (`column activities.registrations does not exist`) onder Directus 11.
> In plaats daarvan filter je nu in de Registrations-collectie zelf.

**Filteren op één specifieke cursus:**

1. Directus → **Registrations**
2. Klik bovenaan op het filter-icoon
3. Kies veld `education_program` → operator `Is equal to` → selecteer de cursus
4. (Optioneel) sla op als preset via de drie puntjes rechtsboven →
   "Save preset" → naam: bv. "Fiqh-cursus inschrijvingen"

**Filteren op één specifieke activiteit:**

Hetzelfde proces, maar kies veld `activity` in plaats van `education_program`.

**Snel een hele kolom inschrijvingen vinden:**

| Wil je zien…                                 | Filter zo                                               |
|----------------------------------------------|---------------------------------------------------------|
| Alle onderwijs-inschrijvingen                | `type = education`                                      |
| Alle activiteit-inschrijvingen               | `type = activity`                                       |
| Inschrijvingen voor één programma            | `education_program = <selecteer programma>`             |
| Inschrijvingen voor één activiteit           | `activity = <selecteer activiteit>`                     |
| Alleen vrouwen voor een cursus               | combineer `education_program = X` met `gender = female` |
| Nieuwe (onbehandelde) inschrijvingen         | `status = new`                                          |
| Bevestigde aanmeldingen                      | `status = confirmed`                                    |

Je kunt meerdere filters combineren — bijvoorbeeld "alle vrouwen voor de
Fiqh-cursus die nog op `new` staan". Sla die als preset op zodat je 'm
later snel terugvindt.

> 💡 **Inschrijvingen van vóór deze update** hebben de relaties
> (`education_program` / `activity`) niet automatisch gevuld. Die blijven
> wel zichtbaar in de algemene Registrations-lijst (filter op `type` of
> `source_slug`), maar verschijnen niet in een filter op programma/activiteit.
> Wil je oude inschrijvingen alsnog koppelen, open dan de inschrijving in
> Directus en kies handmatig het programma of de activiteit.

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

| Veld                       | Inhoud                                                  |
|----------------------------|---------------------------------------------------------|
| `type`                     | `one_time` (eenmalig) of `monthly` (maandelijks)        |
| `status`                   | Zie tabel hieronder                                     |
| `amount`                   | Bedrag in **eurocenten** — bv. 2500 = €25,00            |
| `currency`                 | Altijd `eur`                                             |
| `donor_name`               | Naam van de donor (optioneel ingevuld)                  |
| `donor_email`              | Verplicht — gaat ook naar Stripe voor de bevestigings-mail |
| `message`                  | Bericht/notitie van de donor (indien ingevuld)          |
| `stripe_session_id`        | Stripe Checkout-id — om snel terug te vinden in Stripe  |
| `stripe_payment_intent_id` | Voor eenmalige donaties                                 |
| `stripe_subscription_id`   | Voor maandelijkse donaties                              |
| `created_at` / `paid_at`   | Tijdstip aanmaak en betaling                            |
| `raw_event`                | Laatste Stripe-payload — alleen voor diagnostiek        |

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
