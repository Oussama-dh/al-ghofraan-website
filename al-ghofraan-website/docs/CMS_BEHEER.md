# CMS-beheer — Al-Ghofraan website

Deze handleiding legt uit hoe je inhoud van de website aanpast via Directus.

> 🔗 Directus admin: **http://localhost:8055**
> 🌍 Website lokaal: **http://localhost:3000**

---

## Algemeen — Wanneer is een refresh genoeg?

| Wat je wijzigt          | Hoe zichtbaar maken             |
|-------------------------|----------------------------------|
| Tekst, menu, FAQ        | Pagina **refreshen** in browser  |
| Iconen, contentblokken  | Pagina **refreshen** in browser  |
| Logo / favicon          | Harde refresh (Ctrl+Shift+R)     |
| Gebedstijden CSV        | Pagina refreshen (max 1u in productie) |

In ontwikkelmodus zien we wijzigingen **direct** na een refresh. Container-restarts zijn alleen nodig bij codewijzigingen.

---

## 1. Header aanpassen

**Logo & moskeenaam**: Directus → **Site Settings**
- `site_name` → naam in de header
- `logo` → upload PNG/SVG (transparant, vierkant, bv. 128×128)

**Menu-items**: Directus → **Navigation Items**
- `label` — wat in menu staat
- `href` — waar de link heen gaat (bv. `/agenda`)
- `sort` — volgorde (lager = eerder)
- `highlight` — `true` voor CTA-knop ("Doneren")
- `external` — `true` voor externe links
- `active` — `false` om tijdelijk te verbergen
- `location` — `header`, `footer`, of `both`

---

## 2. Footer aanpassen

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

## 3. Favicon, logo en og-image

Directus → **Site Settings**:
- `favicon` — 32×32 of 64×64 PNG/ICO/SVG
- `logo` — vierkante transparante PNG/SVG
- `og_image` — 1200×630 PNG (preview op WhatsApp/Facebook)

---

## 4. SEO instellen

**Voor de hele site** (Site Settings):
- `default_seo_title`, `default_seo_description`

**Per pagina** (Page Content):
- `seo_title`, `seo_description` — overschrijven defaults

---

## 5. Pagina-teksten aanpassen

Directus → **Page Content** → kies pagina (`home`, `dawahcommissie`, `doneren`):
- `title`, `subtitle`, `intro` — tekstvelden
- `body` — rich text (opmaak, links, koppen)
- `icon` — icoon-naam (zie [ICONS.md](./ICONS.md))
- `status` — `published` zichtbaar, `draft` verborgen

---

## 6. ⭐ Contentblokken (page_sections) — herbruikbare vakjes

Dit is het systeem waarmee je zelf nieuwe contentblokken kunt toevoegen aan pagina's, zonder code te wijzigen.

### Wat is een sectie?

Een **sectie** is een blok op een pagina, bijvoorbeeld het missie-blok op de homepage met de drie punten erin. Een sectie heeft een **type** dat de layout bepaalt, en bevat **items** (de vakjes/punten erbinnen).

### Beschikbare sectie-types

| Type            | Waar voor                                                       |
|-----------------|------------------------------------------------------------------|
| `split_feature` | Twee kolommen: items met iconen links + decoratief Arabisch blok rechts. **Het missie-blok gebruikt dit.** |
| `card_grid`     | Grid van 1/2/3 kaartjes naast elkaar — handig voor "wat we doen", "diensten", etc. |
| `simple_text`   | Eenvoudig blok met alleen titel + intro-tekst                   |
| `cta`           | Oproep met titel, tekst en 1-2 knoppen (in donkerblauw)         |

### Een nieuwe sectie maken

**Stap 1 — De sectie zelf**

1. Directus → **Page Sections** → klik **+** rechtsboven
2. Vul in:
   - `page_slug` → op welke pagina (bv. `home`, `dawahcommissie`, `doneren`)
   - `key` → unieke korte naam, alleen letters/streepjes (bv. `services`, `what_we_do`)
   - `type` → kies een van de vier types
   - `label` → interne naam voor jezelf (verschijnt niet op de site)
   - `title`, `intro` → wat je wilt tonen
   - `eyebrow_ar` → optioneel klein Arabisch woord boven de titel
   - `sort` → volgorde t.o.v. andere secties op dezelfde pagina (lager = eerder)
   - `active` → vink aan om zichtbaar te maken
3. **Voor `split_feature`** vul ook in:
   - `card_title_ar` → bv. `الدعوة`
   - `card_subtitle` → bv. "Ad-Da'wa — De Uitnodiging"
   - `card_tags` → klik om Arabische woorden toe te voegen (bv. الإيمان, العلم, العمل)
4. **Voor `cta`** vul in:
   - `primary_cta_label` + `primary_cta_href`
   - eventueel `secondary_cta_label` + `secondary_cta_href`
5. **Save**

**Stap 2 — Items toevoegen** (alleen voor `split_feature` en `card_grid`)

1. Directus → **Page Section Items** → **+**
2. Vul in:
   - `page_slug` → **moet exact gelijk zijn** aan de page_slug van de sectie
   - `section_key` → **moet exact gelijk zijn** aan de `key` van de sectie
   - `title` → kop van het vakje
   - `description` → tekst onder de kop
   - `icon` → icoon-naam (zie [ICONS.md](./ICONS.md))
   - `href` → optionele link (vakje wordt klikbaar)
   - `sort` → volgorde binnen de sectie
   - `active` → aan/uit
3. Save
4. Herhaal voor elk vakje

> ⚠️ **Cruciaal**: `page_slug` + `section_key` moeten exact matchen tussen sectie en items, anders zien we de items niet.

### Voorbeeld — een "Wat wij bieden" sectie maken

**Sectie:**
- `page_slug` = `dawahcommissie`
- `key` = `services`
- `type` = `card_grid`
- `title` = "Wat wij bieden"
- `intro` = "Onze activiteiten in een notendop"

**Items (3 stuks):**

| page_slug         | section_key | title                | icon              | description |
|-------------------|-------------|----------------------|-------------------|--------------|
| `dawahcommissie`  | `services`  | Wekelijkse lezingen  | `book-open`       | … |
| `dawahcommissie`  | `services`  | Cursussen            | `graduation-cap`  | … |
| `dawahcommissie`  | `services`  | Open dagen           | `users`           | … |

Refresh de pagina → de sectie verschijnt automatisch.

### Sectie verbergen of verwijderen

- **Tijdelijk verbergen** → zet `active` op `false`
- **Volgorde wijzigen** → wijzig `sort`-waardes
- **Verwijderen** → klik op de prullenbak in Directus (items en sectie apart)

### Waar verschijnen de secties op de pagina?

| Pagina             | Locatie van sections                                                        |
|--------------------|------------------------------------------------------------------------------|
| `home`             | Tussen page-content body en activiteiten-grid (uitgezonderd `cta` → onderaan) |
| `dawahcommissie`   | Tussen page-content body en FAQ (uitgezonderd `cta` → onderaan)              |

Eigen pagina's toevoegen vereist een codewijziging — vraag dit dan in een nieuwe wijzigingsverzoek.

---

## 7. Iconen aanpassen

Zie [ICONS.md](./ICONS.md). Korte versie:
- Centrale UI-iconen → **Icon Settings**
- Pagina-icoon → `page_content.icon`
- FAQ-icoon → `faq_items.icon`
- **Sectie-item icoon** → `page_section_items.icon`

---

## 8. FAQ aanpassen

Directus → **FAQ Items**:
- `question`, `answer`, `category`, `sort`, `published`, `icon`

---

## 9. Activiteiten aanpassen

Directus → **Activities** → klik **+**:
- `title`, `slug`, `description`, `start_date`, `end_date`, `location`, `image`
- `featured` = `true` toont op homepage als hoofdactiviteit
- `status` = `published` om zichtbaar te maken

---

## 10. Gebedstijden uploaden

1. CSV met kolommen: `datum`, `dag`, `fajr`, `shuruq`, `dhuhr`, `asr`, `maghrib`, `isha`
2. Directus → **Prayer Time Files** → **+**
3. `title`, `file` (upload CSV), `year`, `active = true`
4. Save

⚠️ Slechts één CSV mag tegelijk `active = true` zijn.

---

## Wat als ik iets per ongeluk verprutst?

- **Status op draft / active uit** → verdwijnt direct
- **Revisiegeschiedenis** → klok-icoontje rechtsboven in een item
- **Hulp nodig** → mail **el-masoudi@hotmail.com**
