# Directus Setup — Collecties aanmaken

Deze handleiding helpt je om de benodigde Directus-collecties aan te maken.

## Belangrijk

Bij de eerste opstart van Directus is de database leeg. Volg onderstaande stappen **in volgorde**.

## 1️⃣ Inloggen

1. Open http://localhost:8055
2. Log in met:
   - E-mail: `admin@al-ghofraan.com`
   - Wachtwoord: `Admin1234!`

> 💡 Wijzig dit wachtwoord direct via je profiel rechtsboven.

## 2️⃣ Collecties aanmaken

Ga naar **Settings → Data Model** (tandwiel-icoon → Data Model).

### Collectie 1: `pages`

Voor pagina-content (Over ons, etc.)

1. Klik **Create Collection**
2. Name: `pages`
3. Singleton: **uit**
4. Voeg velden toe via **Create Field in Standard**:

| Veld              | Type           | Opties                                  |
|-------------------|----------------|-----------------------------------------|
| `slug`            | String         | Required, Unique. Interface: Slug       |
| `title`           | String         | Required                                |
| `content`         | WYSIWYG        | (Interface: Rich Text HTML)             |
| `seo_title`       | String         | Optional                                |
| `seo_description` | Text           | Optional                                |
| `status`          | Dropdown       | Choices: `draft`, `published`, `archived`. Default: `draft` |

> Tip: gebruik de field-presets "Status" om snel een status-veld te maken.

### Collectie 2: `activities`

Voor agenda-items.

1. Create Collection: `activities`
2. Velden:

| Veld                   | Type          | Opties                                  |
|------------------------|---------------|-----------------------------------------|
| `title`                | String        | Required                                |
| `slug`                 | String        | Required, Unique. Interface: Slug. Template: `{{title}}` |
| `description`          | WYSIWYG       | Required                                |
| `start_date`           | DateTime      | Required                                |
| `end_date`             | DateTime      | Optional                                |
| `location`             | String        | Optional                                |
| `image`                | File (Image)  | Single file. Folder: maak een folder "Activities" |
| `status`               | Dropdown      | `draft`, `published`, `archived`. Default: `draft` |
| `featured`             | Boolean       | Default: `false`                        |
| `registration_enabled` | Boolean       | Default: `false`                        |

### Collectie 3: `prayer_time_files`

Voor de CSV-bestanden met gebedstijden.

1. Create Collection: `prayer_time_files`
2. Velden:

| Veld          | Type     | Opties                                  |
|---------------|----------|-----------------------------------------|
| `title`       | String   | Required (bv. "Gebedstijden 2026")     |
| `file`        | File     | Required. Single file (CSV).           |
| `year`        | Integer  | Required (bv. 2026)                    |
| `active`      | Boolean  | Default: `false`. Slechts 1 actief tegelijk! |
| `uploaded_at` | DateTime | Default: `now()`                       |

> 💡 **Tip**: Maak een Flow (zie sectie 5) die automatisch andere bestanden op `active: false` zet wanneer er een nieuwe als `active: true` wordt opgeslagen.

### Collectie 4: `site_settings` (singleton)

Voor algemene site-instellingen (één rij).

1. Create Collection: `site_settings`
2. **Singleton: aan** (alleen één rij)
3. Velden:

| Veld           | Type   | Opties                                  |
|----------------|--------|-----------------------------------------|
| `site_name`    | String | Default: "Al-Ghofraan"                 |
| `logo`         | File   | Single image                           |
| `contact_email`| String | Default: "el-masoudi@hotmail.com"      |
| `phone`        | String | Optional                               |
| `address`      | Text   | Optional                               |
| `social_links` | JSON   | Interface: Code (JSON) — zie hieronder |

Voorbeeld JSON voor `social_links`:
```json
{
  "facebook":  "https://facebook.com/...",
  "instagram": "https://instagram.com/...",
  "youtube":   "https://youtube.com/@...",
  "whatsapp":  "https://wa.me/31..."
}
```

## 3️⃣ Permissies (Public role)

De frontend leest publieke data zonder authenticatie. Configureer:

**Settings → Access Control → Public**

Geef de volgende rechten aan de **Public** rol:

| Collectie            | Read | Filter                               |
|----------------------|------|--------------------------------------|
| `pages`              | ✅   | `status _eq published`               |
| `activities`         | ✅   | `status _eq published`               |
| `prayer_time_files`  | ✅   | `active _eq true`                    |
| `site_settings`      | ✅   | (geen filter)                        |
| `directus_files`     | ✅   | (geen filter — om afbeeldingen te tonen) |

> ⚠️ Geef Public **alleen Read** rechten, nooit Create/Update/Delete!

## 4️⃣ Eerste content toevoegen

### Voorbeeld: een activiteit aanmaken

1. Linker menu → **Activities** → **+** (rechtsboven)
2. Vul in:
   - Title: `Vrijdagslezing — Tawakkul`
   - Slug: `vrijdagslezing-tawakkul` (auto-gegenereerd)
   - Description: gebruik de WYSIWYG editor
   - Start date: bv. `2026-05-09 13:30:00`
   - Location: `Moskee el Mouahidin`
   - Image: upload een afbeelding
   - Status: `published`
   - Featured: `true`
3. Klik **Save** (✓ rechtsboven)

### Voorbeeld: gebedstijden uploaden

1. Linker menu → **Prayer Time Files** → **+**
2. Vul in:
   - Title: `Gebedstijden 2026`
   - File: upload je CSV (zie `directus/sample-gebedstijden-2026.csv` voor formaat)
   - Year: `2026`
   - Active: `true`
3. Save

Zie ook [`CSV_GEBEDSTIJDEN.md`](CSV_GEBEDSTIJDEN.md) voor het exacte CSV-formaat.

## 5️⃣ Optionele Flow: 1 actief CSV-bestand

Om te voorkomen dat meerdere `prayer_time_files` records `active: true` zijn, maak een Flow:

**Settings → Flows → Create Flow**

- Trigger: **Event Hook** → `items.update` op `prayer_time_files`
- Conditie: `payload.active _eq true`
- Operatie: **Update Items** → `prayer_time_files`
  - Filter: `id _neq {{$trigger.keys[0]}}`
  - Update: `{ "active": false }`

## 6️⃣ API Token genereren (voor frontend)

Zie hoofdstuk **Stap 6** in de hoofd `README.md`.

## ✅ Klaar!

Bezoek nu http://localhost:3000 — alle content komt nu uit Directus.

Heb je nog geen content toegevoegd? Dan ziet de frontend fallback-data of een nette lege staat.
