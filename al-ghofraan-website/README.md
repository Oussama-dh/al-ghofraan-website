# Al-Ghofraan Website

Officiële website voor de **DawahCommissie van moskee Al-Ghofraan**.

> 🕌 *بسم الله الرحمن الرحيم*

## 📋 Tech Stack

| Onderdeel | Technologie |
|-----------|-------------|
| Frontend  | Next.js 14 (App Router) + React 18 + TypeScript |
| Styling   | Tailwind CSS |
| CMS       | Directus 11 |
| Database  | PostgreSQL 16 |
| Lokale omgeving | Docker Compose |

### Waarom Directus?

Directus is gekozen omdat het:

1. **Open source en self-hosted** — past bij beheer op eigen Contabo VPS
2. **Database-first** — werkt met een gewone PostgreSQL database, geen vendor lock-in
3. **Geen custom dashboard nodig** — vrijwilligers werken met een nette, kant-en-klare interface
4. **Krachtige rechten en rollen** — eenvoudig per vrijwilliger te configureren
5. **Bestandsbeheer ingebouwd** — perfect voor CSV-uploads (gebedstijden) en afbeeldingen
6. **REST + GraphQL API** — Next.js kan beide makkelijk consumeren
7. **Headless** — frontend en CMS volledig gescheiden, dus toekomstbestendig

## 🚀 Lokale installatie

### Vereisten

- [Docker](https://docs.docker.com/get-docker/) en [Docker Compose v2](https://docs.docker.com/compose/install/)
- Node.js 20+ (alleen nodig voor lokaal `npm` werk buiten Docker)
- Git

### Stap 1 — Repository klonen

```bash
git clone https://github.com/Oussama-dh/al-ghofraan-website.git
cd al-ghofraan-website
```

### Stap 2 — Environment variabelen

```bash
cp .env.example .env
```

Bewerk `.env` zo nodig (de standaardwaarden werken voor lokaal).

### Stap 3 — Containers starten

```bash
docker compose up -d
```

De eerste keer duurt dit ~2-5 minuten (image downloads + Directus migraties).

### Stap 4 — Status controleren

```bash
docker compose ps
docker compose logs -f directus    # bekijk Directus logs
docker compose logs -f frontend    # bekijk Next.js logs
```

### Stap 5 — Beschikbare URL's

| Service     | URL                        | Login                                |
|-------------|----------------------------|--------------------------------------|
| Frontend    | http://localhost:3000      | —                                    |
| Directus    | http://localhost:8055      | `admin@al-ghofraan.com` / `Admin1234!` |
| PostgreSQL  | `localhost:5432`           | `alghofraan` / `alghofraan_secret`   |

### Stap 6 — Directus instellen

1. Open http://localhost:8055
2. Log in met de credentials uit `.env`
3. Volg de stappen in [`docs/DIRECTUS_SETUP.md`](docs/DIRECTUS_SETUP.md) om collecties aan te maken
4. Maak een **API Token** aan (zie hieronder), zet hem in `.env` en herstart de frontend

#### API Token aanmaken

1. Directus → klik je profielicoon rechtsboven → **User Directory**
2. Maak een nieuwe gebruiker aan (bv. `frontend@al-ghofraan.com`) met de rol **API Reader** (alleen lees-rechten op publieke collecties)
3. Open de gebruiker → tabblad **Token** → klik **Generate Token** → kopieer
4. Plak in `.env`:
   ```
   DIRECTUS_TOKEN=plak_hier_je_token
   ```
5. Herstart de frontend: `docker compose restart frontend`

## 🛑 Containers stoppen

```bash
docker compose down            # stopt containers, behoudt data
docker compose down -v         # stopt + verwijdert data (alleen bij reset!)
```

## 📁 Repository structuur

```
al-ghofraan-website/
├── docker-compose.yml
├── .env.example
├── README.md
├── frontend/                  # Next.js app
│   ├── app/                   # App Router pagina's
│   ├── components/            # React componenten
│   ├── lib/                   # Helpers, Directus client
│   └── types/                 # TypeScript types
├── directus/                  # Directus configuratie + sample data
└── docs/                      # Uitgebreide documentatie
    ├── DIRECTUS_SETUP.md      # Collecties aanmaken
    ├── CONTENT_MODEL.md       # Schema overzicht
    ├── CSV_GEBEDSTIJDEN.md    # CSV upload werkwijze
    └── DEPLOYMENT_CONTABO.md  # VPS deployment
```

## 📝 Inhoud beheren

| Wat | Waar in Directus |
|-----|------------------|
| Activiteiten / agenda     | **Activities** collectie |
| Gebedstijden CSV          | **Prayer Time Files** collectie |
| Pagina-content (Over ons) | **Pages** collectie |
| Site-instellingen         | **Site Settings** singleton |

Zie [`docs/DIRECTUS_SETUP.md`](docs/DIRECTUS_SETUP.md) voor stap-voor-stap instructies.

## 🌐 Meertaligheid (toekomst)

De codebase is voorbereid op meertaligheid (Nederlands, Engels, Arabisch). Activatie:

1. Activeer Directus **Translations** voor `pages` en `activities`
2. Activeer i18n in `frontend/next.config.ts` (zie de uitgecommentarieerde block)
3. Maak `frontend/app/[locale]/...` route-groep aan

## 💳 Donaties (TODO)

Stripe-integratie is **niet** geïmplementeerd in deze versie. De pagina `/doneren` is een placeholder.

Voor activatie zie de TODO-block in `frontend/app/doneren/page.tsx`.

## 🚢 Productie-deployment

Zie [`docs/DEPLOYMENT_CONTABO.md`](docs/DEPLOYMENT_CONTABO.md) voor uitgebreide instructies.

## 🆘 Troubleshooting

### Directus blijft hangen op opstart
```bash
docker compose down -v          # verwijder volumes
docker compose up -d            # opnieuw starten
```

### Frontend ziet Directus niet
- Controleer dat `NEXT_PUBLIC_DIRECTUS_URL` correct staat in `.env`
- Voor Docker-naar-Docker netwerkverkeer kan `http://directus:8055` gebruikt worden i.p.v. `http://localhost:8055`

### Wijzigingen in `.env` werken niet
```bash
docker compose down
docker compose up -d
```

## 📜 Licentie

Eigendom van Al-Ghofraan. Niet voor extern hergebruik zonder toestemming.

---

*وَالسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ*
