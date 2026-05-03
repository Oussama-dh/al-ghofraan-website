# Content Model

Overzicht van alle Directus collecties, hun velden en hun gebruik in de frontend.

## 📚 Collecties

### `pages` — Statische pagina's

Voor pagina-content die door beheerders bewerkt wordt (bv. "Over de DawahCommissie").

| Veld              | Type      | Verplicht | Beschrijving                              |
|-------------------|-----------|:---------:|-------------------------------------------|
| `id`              | UUID      | auto      | Unieke ID                                 |
| `slug`            | String    | ✅        | URL-segment (bv. `dawahcommissie`)        |
| `title`           | String    | ✅        | Paginatitel                               |
| `content`         | HTML      | ✅        | Hoofdinhoud (WYSIWYG)                     |
| `seo_title`       | String    | —         | SEO meta-titel                            |
| `seo_description` | Text      | —         | SEO meta-beschrijving                     |
| `status`          | Enum      | ✅        | `draft` / `published` / `archived`        |

**Frontend gebruik**: `app/dawahcommissie/page.tsx` haalt op via slug.

---

### `activities` — Agenda-items

| Veld                   | Type     | Verplicht | Beschrijving                              |
|------------------------|----------|:---------:|-------------------------------------------|
| `id`                   | UUID     | auto      |                                            |
| `title`                | String   | ✅        | Titel van de activiteit                   |
| `slug`                 | String   | ✅        | URL-segment, uniek                        |
| `description`          | HTML     | ✅        | Beschrijving (WYSIWYG)                    |
| `start_date`           | DateTime | ✅        | Startdatum + tijd                         |
| `end_date`             | DateTime | —         | Einddatum (optioneel)                     |
| `location`             | String   | —         | Locatie                                   |
| `image`                | File     | —         | Hoofdafbeelding                           |
| `status`               | Enum     | ✅        | `draft` / `published` / `archived`        |
| `featured`             | Boolean  | ✅        | Toon op homepagina                        |
| `registration_enabled` | Boolean  | ✅        | Toekomstig: inschrijvingen aan/uit        |

**Frontend gebruik**:
- `app/page.tsx` toont uitgelichte + komende
- `app/agenda/page.tsx` toont alles (gefilterd op datum)
- `app/agenda/[slug]/page.tsx` detailpagina

---

### `prayer_time_files` — Gebedstijden CSV's

| Veld          | Type     | Verplicht | Beschrijving                              |
|---------------|----------|:---------:|-------------------------------------------|
| `id`          | UUID     | auto      |                                            |
| `title`       | String   | ✅        | Bv. "Gebedstijden 2026"                   |
| `file`        | File     | ✅        | CSV-bestand                               |
| `year`        | Integer  | ✅        | Jaar (bv. 2026)                           |
| `active`      | Boolean  | ✅        | Welk bestand de frontend gebruikt         |
| `uploaded_at` | DateTime | ✅        | Default: `now()`                          |

**Regel**: slechts één bestand mag tegelijk `active: true` zijn. Zie de optionele Flow in `DIRECTUS_SETUP.md`.

**Frontend gebruik**: `app/gebedstijden/page.tsx` + `app/api/gebedstijden/route.ts`.

---

### `site_settings` — Singleton

Algemene site-instellingen.

| Veld            | Type   | Verplicht | Beschrijving                                |
|-----------------|--------|:---------:|---------------------------------------------|
| `site_name`     | String | ✅        | Bv. "Al-Ghofraan"                          |
| `logo`          | File   | —         | Logo (PNG/SVG)                             |
| `contact_email` | String | ✅        | Algemeen e-mailadres                       |
| `phone`         | String | —         | Telefoon                                    |
| `address`       | Text   | —         | Adres                                       |
| `social_links`  | JSON   | —         | `{ facebook, instagram, youtube, whatsapp }` |

**Frontend gebruik**: `Header` en `Footer` componenten via `lib/directus.ts → getSiteSettings()`.

## 🔐 Permissies overzicht

| Rol     | pages       | activities  | prayer_time_files | site_settings | directus_files |
|---------|-------------|-------------|-------------------|---------------|----------------|
| Public  | Read (published) | Read (published) | Read (active) | Read | Read |
| Editor  | CRUD        | CRUD        | CRUD              | Update        | CRUD           |
| Admin   | All         | All         | All               | All           | All            |

## 🌐 Toekomstige meertaligheid

Voor i18n: voeg een **Translations** veld toe aan `pages` en `activities`. Directus ondersteunt dit out-of-the-box.

Zie [Directus i18n docs](https://docs.directus.io/configuration/data-model/relationships#translations).
