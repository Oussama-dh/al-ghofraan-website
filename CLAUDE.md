# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout (nested!)

The git root contains a **nested project folder** `al-ghofraan-website/`. All real work happens there. The files in the git root (`docker-compose.yml`, `.env.example`, `README.md`, `DEPLOYMENT_CONTABO.md`, `DIRECTUS_SETUP.md`) are **stale copies**. The root compose points at a `./frontend` that does not exist at that level. Do not edit or deploy from them.

```
al-ghofraan-website/            (git root)
└─ al-ghofraan-website/         (project root: compose, .env.example, docs/, directus/)
   └─ frontend/                 (Next.js app, run npm commands here)
```

Project docs are in Dutch (`al-ghofraan-website/docs/`, ~25 files, including `CONTENT_MODEL.md`, `CMS_BEHEER*.md`, `PRE_DEPLOYMENT_CHECKLIST.md`). Site copy, code comments and commit messages are largely Dutch as well.

## Commands

Run from `al-ghofraan-website/frontend/`:

```bash
npm run dev          # next dev (needs a reachable Directus)
npm run build        # next build (output: 'standalone')
npm run lint         # next lint
npm run type-check   # tsc --noEmit
npm run seed         # provision Directus (see below)
```

There is no test suite and no CI. `lint` and `type-check` are the only automated checks.

Stack, run from `al-ghofraan-website/` (the project root):

```bash
docker compose up -d            # postgres + directus (:8055) + frontend (:3000)
docker compose logs -f directus
docker compose down -v          # WIPES postgres + uploads
```

Seed runner options: `npm run seed -- --list | --only 45 | --only 43,44,45 | --from 43 --to 45`.
- `--from/--to` work on **array position** in `STEPS` in `scripts/seed/index.mjs`, not numeric id (order is deliberately non-numeric, e.g. 12b runs after 24).
- `--only` matches exact string ids (`"1b"`, `"12b"`) and cannot be combined with `--from/--to`.
- Steps are idempotent (upsert by natural key such as `slug`), so re-running is safe **on an empty or dev database**. On production it is not: some steps overwrite content that editors have changed (step 11 `upsertItem` overwrites title, description, teacher, schedule and location of the example programs on every run). **Never run a full `npm run seed` or step 11 on production. Always use `--only <ids>` with just the steps you need.**
- Steps that migrate existing content (62, 65, 70) only change values that exactly match a known old default; step 67 only creates FAQs that are missing and never edits or deletes. Follow that pattern for new content migrations.
- Step 65 is registered in `STEPS` *before* step 10 on purpose (step 10 looks items up by title).
- The seed logs in with `DIRECTUS_ADMIN_EMAIL` / `DIRECTUS_ADMIN_PASSWORD` and falls back to the default admin credentials from `.env.example` (`scripts/seed/lib/env.mjs`).

## Architecture

**Headless CMS split.** Next.js 14 (App Router, React 18, Tailwind 3, TypeScript, path alias `@/`) is a pure consumer of Directus 11 (Postgres 16). Nothing is stored in the frontend. All content, forms and permissions live in Directus.

**Directus is defined in code, not in a schema file.** Collections, fields, roles/policies, permissions and default content are created by the ~90 numbered steps in `frontend/scripts/seed/steps/` (`01-collections` through `70-hifdh-faq-letters`, plus letter variants). A schema change means adding a new step and registering it in `STEPS` in `scripts/seed/index.mjs`, then updating `frontend/types/directus.ts` (the `DirectusSchema` typing used by the SDK). There is no Directus snapshot or migration tooling. `PUBLIC_PERMISSIONS_FALLBACK.md` in `scripts/seed/steps/` documents manual permission repair.

**Data access.** `lib/directus.ts` holds the SDK clients and all typed fetch helpers (`getSiteSettings`, etc.).
- `directus` is anonymous. `directusServer` uses the static `DIRECTUS_TOKEN` for server-side reads and writes.
- Server-side fetches use `DIRECTUS_URL` (internal, e.g. `http://directus:8055`). Browser-facing asset URLs use `NEXT_PUBLIC_DIRECTUS_URL` (`getAssetUrl`) and `getInternalAssetUrl` for server use.
- Images go through `next/image`, so any new asset host must be added to `images.remotePatterns` in `next.config.mjs`. It currently lists localhost:8055, directus:8055 and `al-ghofraan.com`. The live domains are `https://al-ghofraan.nl` (site, `NEXT_PUBLIC_SITE_URL`) and `https://cms.al-ghofraan.nl` (Directus, `NEXT_PUBLIC_DIRECTUS_URL`), so the live CMS host is **not** in `remotePatterns`; CMS images on pages like `/onderwijs/[slug]` are rendered with a plain `<img>`. Add `cms.al-ghofraan.nl` before using `next/image` for CMS assets.

**CMS-driven pages.** `app/[slug]/page.tsx` renders arbitrary CMS pages via `components/sections/PageSectionRenderer.tsx` and the section components in `components/sections/types/`. Fixed routes take precedence, so `lib/reservedSlugs.ts` must list every new top-level route (used by `generateStaticParams` and a runtime guard).

**Domain features spanning several files:**
- **Prayer times:** CSV upload in Directus (`prayer_time_files`), parsed with papaparse in `lib/prayerTimes.ts`. Consumed by `/gebedstijden`, `/gebedstijden/overzicht`, the TV display `/gebedstijden/tv` (`components/prayer/PrayerTimesTvDisplay.tsx`) and `api/gebedstijden`. Hijri dates come from `lib/hijri.ts` (with Directus overrides).
- **Agenda:** activities with recurrence (`lib/recurrence.ts`, `lib/activityCalendar.ts`) and ICS export (`lib/ics.ts`, `api/agenda/[slug]/ics`).
- **Registrations and check-in:** `api/inschrijven` creates registrations (student numbers in `lib/studentNumber.ts`, mails via `lib/server/notifications.ts` using nodemailer/SMTP). Check-in uses QR codes (`lib/qrcode.ts`) and HMAC-signed organizer session cookies (`lib/server/checkIn.ts`). The organizer code lives in the `site_settings` singleton. The `api/check-in/organizer/activate` route deliberately returns **relative** `Location` headers, because the app sits behind a reverse proxy and absolute redirects leaked `0.0.0.0:3000`. Do not "simplify" it to `NextResponse.redirect`.
- **Doelgroep per onderwijsprogramma** (`education_programs.audience`, seed-stap 72): `children` toont het Hifdh-formulier hieronder voor dat programma (records in `quran_registrations`, gekoppeld via M2O `program`; de letters-vraag staat per programma aan/uit via `require_letters_check`). `adults` toont `components/registration/AdultRegistrationForm.tsx` (voornaam, achternaam, telefoon, e-mail, leeftijd; validatie in `lib/adultRegistration.ts`), dat naar `api/onderwijs/volwassenen` post en één record in de eigen collectie `adult_registrations` schrijft. Kinderen en volwassenen blijven bewust gescheiden. Seed-stap 73 zet per programma een O2M-lijst op het programma en een bladwijzer in het zijmenu; een nieuw programma krijgt zijn bladwijzer pas bij `--only 73`. Leeg = volwassenen, behalve Hifdh (`programAudience` in `lib/educationRoutes.ts`). Het oude ouder+studenten-formulier (`RegistrationForm` type `education`, education-tak van `api/inschrijven`) wordt niet meer getoond.
- **Hifdh programma (Baraa'im), `/onderwijs/hifdhprogramma`:** a normal `education_programs` record (`lib/educationRoutes.ts` holds slug, title and button label) with its own registration flow.
  - `components/registration/QuranRegistrationForm.tsx` (file names keep the `quran*` prefix; visible text says "Qoraan") posts to `api/onderwijs/inschrijven`, which writes `quran_registrations` with nested `quran_registration_children` in one Directus request (atomic).
  - Validation lives in `lib/quranRegistration.ts` and runs on both client and server; the server is the authority. It covers phone numbers (NL and international), 1-10 reading/writing levels, the optional second contact, the "can the child recognise the Arabic letters" question and checkbox (`letters_confirmed`), and the age check against `education_programs.min_age` / `max_age` (Directus-managed; empty = no limit).
  - The form first asks whether the child can recognise the Arabic letters. Only "Ja" opens the form; "Nee" shows an encouraging message instead.
  - Public has no permissions on the registration collections; only the "Onderwijs beheerder" role reads/updates them.
  - Programs with more than `FAQ_INLINE_MAX` (5) published FAQs (`lib/faqGroups.ts`) link to `/onderwijs/[slug]/veelgestelde-vragen` instead of listing them inline. FAQs live in `education_program_faqs` with an optional `category` for grouping; editors manage them in Directus.
  - After saving, two fail-soft mails go out via `lib/server/notifications.ts`: an admin mail (recipient `site_settings.notification_email_education`; if empty it logs `geen ontvanger ingesteld` and skips) and a branded HTML confirmation to contact 1 (`lib/server/emailLayout.ts`; sender name and Reply-To from `site_settings.hifdh_email_from_name` / `hifdh_email_reply_to`, subject/intro/footer from `education_confirmation_email_*`). The From address stays the SMTP user (cPanel rejects other addresses).
- **Donations:** Stripe Checkout in `api/doneren/checkout`. `api/stripe/webhook` verifies the signature and writes to the Directus `donations` collection. `NEXT_PUBLIC_SITE_URL` is the source of truth for Stripe success/cancel URLs and for canonical/OG metadata.

## Environment variables

Copy `al-ghofraan-website/.env.example` to `.env` (git-ignored only by `al-ghofraan-website/.gitignore`, not from the git root). It is **incomplete**: the SMTP/`EMAIL_*` variables are missing. Required names:

`POSTGRES_DB/USER/PASSWORD`, `DIRECTUS_SECRET`, `DIRECTUS_ADMIN_EMAIL/PASSWORD`, `DIRECTUS_PUBLIC_URL`, `DIRECTUS_URL`, `DIRECTUS_TOKEN`, `NEXT_PUBLIC_DIRECTUS_URL`, `NEXT_PUBLIC_SITE_URL`, `CORS_ORIGIN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `SMTP_HOST/PORT/SECURE/USER/PASS`, `EMAIL_FROM`, `EMAIL_TRANSPORT`. Optional for `scripts/import-youtube-videos.mjs`: `YOUTUBE_CHANNEL_ID`, `YOUTUBE_PLAYLIST_ID`.

`docker-compose.yml` has insecure fallbacks for the DB password, `DIRECTUS_SECRET` and the admin password. A missing variable does not fail the start.

## Deployment (manual, Contabo VPS)

There is no CI/CD. The VPS is reached with `ssh alghofraan-vps`; the git checkout is `/root/apps/al-ghofraan-website` and the active compose file is in its nested `al-ghofraan-website/` folder (the root-level `docker-compose.yml` is the stale copy).
- Deployment is `git pull --ff-only origin main` on the VPS (check `git status` is clean first), then rebuild the frontend.
- **`docker compose up -d --build` does NOT rebuild the frontend** when the compose config is unchanged, because the source is bind-mounted and the container is not recreated. Run `docker compose restart frontend` from the nested folder; it then runs `npm install && npm run build && npm run start` and takes roughly 1-2 minutes until `Ready` shows in `docker logs alghofraan_frontend`.
- Run seeds inside the frontend container, which already has the admin credentials and internal Directus URL: `docker exec alghofraan_frontend npm run seed -- --only <ids>`. When new code writes a new Directus field, run its seed step **before** restarting the frontend, otherwise saves fail until the field exists.
- Docker logs are in UTC. `docker logs --since 1h alghofraan_frontend | grep -E "notify|visitor"` shows whether mails were sent (addresses are redacted).
- The compose `frontend` service runs `node:20-alpine` with the source bind-mounted and executes `npm install && npm run build && npm run start` on every container start. It does **not** use `frontend/Dockerfile`, which is a multi-stage standalone build that stays unused.
- Directus (`8055`) and the frontend (`3000`) are published on all interfaces.
- The reverse proxy is almost certainly Caddy (mentioned in `docs/CMS_BEHEER_18-5.md` and code comments), but its config is **not in the repo**. `docs/DEPLOYMENT_CONTABO.md` describes Nginx and a `docker-compose.prod.yml` that does not exist.
- Work happens on `feature/...` branches that are fast-forward merged into `main`; the production checkout follows `main`. `origin/delivery-23-prayer-times-ga` is stale (0 ahead, 31 behind).

## Conventions

- **Spelling:** write the Qur'an as **Qoraan** in all visible Dutch text (UI, CMS content, emails, seed content), never Quraan/Qur'aan. Arabic transliteration uses **oe**, not u (Soerah, Hifdh oel-Qoraan, Moeraja'ah, Assalamoe alaikoem). Slugs, field names and collection names are not renamed for spelling (e.g. the slug `quraan-recitatie-beginners` stays).
- Editors' content in Directus is authoritative. Do not overwrite it from code or seeds unless a value exactly matches a known old default.
- Commit, push and deploy only when the user explicitly asks; this applies to each step separately.
