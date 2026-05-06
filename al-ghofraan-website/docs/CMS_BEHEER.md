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

Directus → **Site Settings**:
- `footer_text` — korte beschrijving onder logo
- `copyright_text` — leeg laten = automatisch met huidig jaar
- `footer_enabled` — uit = footer verbergen
- `address`, `contact_email`, `phone`
- `social_links` — JSON, bv:
  ```json
  { "facebook": "https://...", "instagram": "https://...", "youtube": "", "whatsapp": "" }
  ```

Footer-menu komt uit **Navigation Items** met `location` = `footer` of `both`.

---

## 4. Favicon, logo en og-image

Directus → **Site Settings**:
- `favicon` — 32×32 of 64×64 PNG/ICO/SVG
- `logo` — vierkante transparante PNG/SVG
- `og_image` — 1200×630 PNG (preview op WhatsApp/Facebook)

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
| `age`, `gender`   | Optionele velden                                                  |
| `notes`           | Vrij tekstveld dat de bezoeker invulde                            |
| `status`          | Zie hieronder                                                     |
| `created_at`      | Tijdstip van inschrijving (automatisch)                           |

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
