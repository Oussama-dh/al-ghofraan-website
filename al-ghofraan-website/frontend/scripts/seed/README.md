# Directus Seed-script

Automatische setup van Directus collecties + voorbeelddata.

## Wat doet het?

Het script verbindt met je lokale Directus, logt in als admin, en:

1. **Maakt collecties + velden aan** (idempotent — bestaande worden niet aangeraakt):
   - `activities`
   - `prayer_time_files`
   - `site_settings` (singleton)
   - `navigation_items`
   - `page_content`
   - `faq_items`
2. **Geeft de Public-rol** read-permissies op de juiste collecties (met de juiste filters)
3. **Vult voorbeelddata** in:
   - 5 menu-items
   - Site-instellingen
   - 3 pagina's (home / dawahcommissie / doneren)
   - 2 FAQ-items
   - 2 voorbeeldactiviteiten

Het script is **idempotent**: meerdere keren draaien is veilig — bestaande items worden geüpdatet via een natural key (`slug`, `label`, `question`).

## Vereisten

- Docker draait (`docker compose up -d`)
- Directus is bereikbaar op `http://localhost:8055`
- Admin-credentials staan in `.env`:
  ```
  DIRECTUS_ADMIN_EMAIL=admin@al-ghofraan.com
  DIRECTUS_ADMIN_PASSWORD=Admin1234!
  ```
- Node.js 20+ op je host machine (alleen om `npm run seed` te kunnen draaien)

## Gebruik

Vanuit `frontend/`:

```bash
npm run seed
```

Dat is het. Het script:
- wacht tot Directus bereikbaar is (max 60s)
- logt in als admin
- voert alle 7 stappen uit
- print een groene ✅ als alles is gelukt

## Opnieuw draaien

Veilig. Bestaande collecties/velden/items worden niet duplicaat aangemaakt.

## Verwijderen en opnieuw beginnen

⚠️ Dit verwijdert **al je data**:

```bash
docker compose down -v       # wist Postgres + uploads
docker compose up -d         # opnieuw opstarten
# Wacht tot Directus klaar is, dan:
cd frontend
npm run seed
```

## Mappenstructuur

```
frontend/scripts/seed/
├── index.mjs                 # entry point
├── lib/
│   ├── env.mjs              # leest .env
│   ├── client.mjs           # HTTP-wrapper
│   └── helpers.mjs          # idempotente upsert helpers
└── steps/
    ├── 01-collections.mjs   # collecties + velden
    ├── 02-permissions.mjs   # public role rechten
    ├── 03-navigation.mjs    # menu-items
    ├── 04-site-settings.mjs # singleton
    ├── 05-page-content.mjs  # 3 pagina's
    ├── 06-faq.mjs           # 2 FAQ-items
    └── 07-activities.mjs    # 2 activiteiten
```

## Verificatie — heeft het gewerkt?

### 1. Via Directus admin-UI

Open http://localhost:8055 en check:
- Linkermenu → 6 nieuwe collecties zichtbaar (Activities, Prayer Time Files, Site Settings, Navigation Items, Page Content, FAQ Items)
- Klik in elke collectie → er staat voorbeelddata in

### 2. Via de publieke API (zonder login)

Test of de Public-rol correct gerechtigd is:

```bash
# Activiteiten
curl -s http://localhost:8055/items/activities | head -c 500

# Menu
curl -s http://localhost:8055/items/navigation_items | head -c 500

# Site settings (singleton)
curl -s http://localhost:8055/items/site_settings | head -c 500

# FAQ
curl -s http://localhost:8055/items/faq_items | head -c 500

# Page content
curl -s http://localhost:8055/items/page_content | head -c 500
```

Elke respons moet `{"data":[...]}` of `{"data":{...}}` retourneren — **niet** een 401/403.

### 3. Via de frontend

Open http://localhost:3000 — de site toont nu de echte data uit Directus i.p.v. de fallback.

## Foutmeldingen

**`Directus niet bereikbaar`**
→ Draait `docker compose ps` en zie je `directus` als running? Probeer `docker compose logs directus`.

**`Inloggen mislukt (401)`**
→ Controleer dat `DIRECTUS_ADMIN_EMAIL` en `DIRECTUS_ADMIN_PASSWORD` in `.env` overeenkomen met de daadwerkelijke admin-account in Directus. Als je de admin-credentials gewijzigd hebt na de eerste opstart, gebruik die nieuwe waarden.

**`POST /fields/... → 400`**
→ Komt soms voor als een veld al deels bestaat. Het script slaat bestaande velden over; dit zou niet moeten gebeuren bij een schone setup. Check de output — het script print welk veld faalt.
