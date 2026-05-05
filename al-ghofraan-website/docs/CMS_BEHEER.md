# CMS-beheer — Al-Ghofraan website

Deze handleiding legt uit hoe je inhoud van de website aanpast via Directus.

> 🔗 Directus admin: **http://localhost:8055**
> 🌍 Website lokaal: **http://localhost:3000**

---

## Algemeen

Wanneer is een refresh genoeg, en wanneer is een restart nodig?

| Wat je wijzigt          | Hoe zichtbaar maken          |
|-------------------------|-------------------------------|
| Tekst, menu, FAQ, etc.  | Pagina **refreshen** in browser |
| Icoon-instellingen      | Pagina **refreshen** in browser |
| Logo / favicon          | Pagina **refreshen** (favicon kan harde refresh nodig hebben: Ctrl+Shift+R) |
| Gebedstijden CSV        | Pagina **refreshen** (kan tot 1 uur duren in productie) |

> In ontwikkelmodus zien we wijzigingen **direct** na een refresh. Container-restarts zijn alleen nodig bij codewijzigingen, niet bij contentwijzigingen.

---

## 1. Header aanpassen

**Logo & moskeenaam:**
1. Directus → linkermenu → **Site Settings**
2. `site_name` = naam die in de header staat
3. `logo` = klik op het uploadveld, kies een PNG of SVG (transparante achtergrond, vierkant). Aanbevolen: 128×128 of groter.
4. Klik **Save** rechtsboven

**Menu-items:**
1. Directus → **Navigation Items**
2. Velden:
   - `label` — wat in het menu staat (bv. "Agenda")
   - `href` — waar de link naartoe gaat (bv. `/agenda` of `https://...`)
   - `sort` — volgorde (lager = eerder)
   - `highlight` — `true` maakt het een opvallende CTA-knop (zoals "Doneren")
   - `external` — `true` voor externe links (opent in nieuw tabblad)
   - `active` — `false` om tijdelijk te verbergen
   - `location` — `header`, `footer`, of `both`

---

## 2. Footer aanpassen

Directus → **Site Settings**:

- `footer_text` — korte beschrijving onder het logo
- `copyright_text` — leeg laten = automatisch met huidig jaar en sitenaam
- `footer_enabled` — uitschakelen verbergt de hele footer
- `address` — adres met regelafbrekingen
- `contact_email` — e-mailadres
- `phone` — telefoonnummer (bv. +31 20 123 4567)
- `social_links` — JSON, bv:
  ```json
  {
    "facebook":  "https://facebook.com/al-ghofraan",
    "instagram": "https://instagram.com/al-ghofraan",
    "youtube":   "",
    "whatsapp":  "https://wa.me/31612345678"
  }
  ```

Footer-menu komt uit **Navigation Items** met `location` = `footer` of `both`.

---

## 3. Favicon & logo

**Favicon (tabblad-icoontje):**
1. Directus → **Site Settings**
2. `favicon` → upload bestand
   - Aanbevolen formaat: `.ico`, `.png` of `.svg`
   - Aanbevolen afmetingen: **32×32** of **64×64** pixels
3. Save → ververs de pagina (soms is Ctrl+Shift+R nodig om browser-cache te omzeilen)

**Logo (header & footer):**
1. Directus → **Site Settings**
2. `logo` → upload PNG of SVG
   - Aanbevolen: **transparante achtergrond, vierkant**
   - Wordt schaalbaar weergegeven (32px in header, 40px in footer)

**OG-image (sociale media preview):**
- `og_image` — afbeelding die getoond wordt als de site gedeeld wordt op WhatsApp/Facebook/Twitter
- Aanbevolen: **1200×630 pixels**

---

## 4. SEO instellen

**Voor de hele site (Site Settings):**
- `default_seo_title` — fallback-titel (bv. "DawahCommissie Al-Ghofraan")
- `default_seo_description` — fallback-beschrijving voor zoekmachines

**Per pagina (Page Content):**
- `seo_title` — titel zoals Google die toont (overschrijft default)
- `seo_description` — beschrijving in zoekresultaten

> Geen `seo_title` ingevuld? Dan gebruikt de site automatisch de default.

---

## 5. Pagina-teksten aanpassen

Directus → **Page Content** → kies een pagina:
- `home` — homepagina
- `dawahcommissie` — Over ons
- `doneren` — donatiepagina

Velden:
- `title` — grote titel
- `subtitle` — kleine ondertitel
- `intro` — korte introductietekst
- `body` — hoofdtekst (rich text editor met opmaak, links, koppen)
- `icon` — icoon-naam (zie [ICONS.md](./ICONS.md))
- `status` — `published` om zichtbaar te maken, `draft` om te verbergen

---

## 6. Iconen aanpassen

Zie [ICONS.md](./ICONS.md) voor de volledige lijst.

Korte versie:
- Centrale UI-iconen (datum, locatie, contact, etc.) → Directus → **Icon Settings**
- Pagina-icoon → `page_content.icon`
- FAQ-icoon → `faq_items.icon`

Onbekende icoon-naam = standaardicoon (info).

---

## 7. FAQ aanpassen

Directus → **FAQ Items**:
- `question` — de vraag
- `answer` — antwoord (rich text)
- `category` — optioneel, voor groepering
- `sort` — volgorde
- `published` — `false` om tijdelijk te verbergen
- `icon` — icoon-naam (zie ICONS.md)

---

## 8. Activiteiten aanpassen

Directus → **Activities** → klik op **+** rechtsboven:
- `title` — titel
- `slug` — URL-segment (auto-gegenereerd uit titel)
- `description` — beschrijving (rich text)
- `start_date` / `end_date` — datum + tijd
- `location` — bv. "Moskee Al-Ghofraan, Hoofdzaal"
- `image` — uitgelichte afbeelding (1200×800 aanbevolen)
- `featured` — `true` toont op homepagina als hoofdactiviteit
- `status` — `published` om zichtbaar te maken
- `registration_enabled` — toekomstige feature, nu nog niet actief

---

## 9. Gebedstijden uploaden

1. Maak een CSV-bestand met kolommen: `datum`, `dag`, `fajr`, `shuruq`, `dhuhr`, `asr`, `maghrib`, `isha`
   - Datum-formaat: `01-01-2026` (dd-mm-jjjj)
   - Tijd-formaat: `06:32` (24-uurs)
2. Directus → **Prayer Time Files** → klik **+**
3. Velden:
   - `title` — bv. "Gebedstijden 2026"
   - `file` — upload CSV
   - `year` — `2026`
   - `active` — **`true`** (zet de oude eerst op `false` als die er al is)
4. Save

> ⚠️ Slechts één CSV mag tegelijk `active: true` zijn. Vergeet niet de vorige op `false` te zetten.

---

## 10. Wat als ik iets per ongeluk verprutst?

- **Status op draft zetten** → de pagina/activiteit verdwijnt direct van de site
- **`active: false`** voor menu-items of FAQ → idem
- **Ongedaan maken** → Directus heeft een revisiegeschiedenis: open een item → klik op het ⏱-icoon rechtsboven

---

## Hulp nodig?

Stuur een e-mail naar **el-masoudi@hotmail.com** met een beschrijving van het probleem en eventueel een schermafbeelding.
