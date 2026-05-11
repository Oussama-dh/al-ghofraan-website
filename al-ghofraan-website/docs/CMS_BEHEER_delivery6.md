# CMS_BEHEER — Sectie 31 · Directus Insights / Dashboards (delivery 6)

> Dit document is een aanvulling op `docs/CMS_BEHEER.md`. Voeg de
> inhoud hieronder toe als sectie **31** onderaan dat document.
>
> Dit is een **analyse + advies**, geen implementatie. In deze
> delivery zijn geen dashboards aangemaakt (geen seed, geen
> schemawijzigingen, geen nieuwe collecties).

## 31. Directus Insights / Dashboards — analyse & advies

### 31.1 Wat zijn Insights / Dashboards?

Directus 11 bevat **Insights**: een module waarin de beheerder
dashboards kan samenstellen uit *panels*. Een panel is een
geconfigureerde visualisatie op een bestaande collectie — bv. een
metric ("aantal records"), een lijst ("laatste 10 records"), een
staafdiagram ("groepering per maand") of een tijdreeks.

Belangrijk om te weten:

- **Geen extra database**: dashboards leven volledig op bestaande
  collecties. Geen nieuwe tabellen.
- **Permissies tellen mee**: een panel toont alleen data die de
  ingelogde rol mag zien. De admin ziet alles; een redacteur met
  beperkte rechten ziet minder.
- **Geen impact op publieke site**: de site (Next.js) raakt geen
  Insights-data aan. Dashboards zijn een intern beheer-tool.

### 31.2 Welke dashboards/panels zijn nuttig voor Al-Ghofraan?

Op basis van de huidige collecties (delivery 1 t/m 5) is een
dashboard met de volgende panels meteen waardevol:

**Donaties-dashboard**
- *Metric*: totaal bedrag donaties deze maand (`donations`,
  filter op `created_at` huidige maand, som van `amount` of
  `amount_cents` / 100).
- *Metric*: aantal donaties deze maand.
- *Lijst*: laatste 10 succesvolle donaties (`status = "succeeded"`).
- *Staafdiagram*: donaties per campagne (`donations` gegroepeerd op
  `campaign` of `campaign_slug`, som van bedrag).
- *Lijst*: actieve donatiecampagnes (`donation_campaigns`,
  `status = "published"`).
- *Metric*: aantal Payment-Link-campagnes vs Stripe-checkout
  campagnes (filter op `use_stripe_payment_link`).

**Inschrijvingen-dashboard**
- *Metric*: nieuwe onderwijsinschrijvingen deze maand
  (`registrations`, filter `type = "education"` + `status = "new"`).
- *Metric*: nieuwe activiteit-inschrijvingen deze maand
  (`registrations`, filter `type = "activity"` + `status = "new"`).
- *Lijst*: laatste 10 inschrijvingen (beide types door elkaar of in
  twee aparte panels).
- *Lijst*: inschrijvingen die nog op `status = "new"` staan — als
  takenlijst voor de beheerder.
- *Staafdiagram*: inschrijvingen per programma (`registrations`,
  filter `type = "education"`, gegroepeerd op `source_slug`).
- *Staafdiagram*: inschrijvingen per activiteit (idem, `type = "activity"`).
- *Metric*: aantal unieke `registration_group_id`'s deze maand
  (= aantal gezinnen die meerdere kinderen hebben ingeschreven).

**Contact-dashboard**
- *Metric*: nieuwe contactberichten (`contact_messages`,
  `status = "new"`).
- *Metric*: totaal aantal contactberichten deze maand.
- *Lijst*: laatste 10 contactberichten, gefilterd op status.
- *Staafdiagram*: contactberichten per onderwerp (`contact_subjects`).

**Content-dashboard**
- *Metric*: aantal gepubliceerde artikelen.
- *Metric*: aantal gepubliceerde activiteiten in de toekomst
  (filter `start_date >= now`).
- *Metric*: aantal gepubliceerde video's.
- *Lijst*: aankomende activiteiten (gesorteerd op `start_date`).
- *Lijst*: laatste 5 gepubliceerde artikelen.

**Systeem-dashboard (optioneel)**
- *Lijst*: aantal actieve menu-items per locatie (`navigation`).
- *Lijst*: hijri-overrides van komende 30 dagen
  (`hijri_date_overrides`).
- *Metric*: TV-aankondigingen die nog "active" zijn
  (`tv_announcements`).

### 31.3 Welke data komt direct uit bestaande collecties?

Alle bovenstaande panels werken **zonder schemawijzigingen**:

| Collectie               | Velden waar Insights direct iets mee kan                      |
| ----------------------- | ------------------------------------------------------------- |
| `donations`             | `amount` (of `amount_cents`), `status`, `created_at`, `campaign`, `campaign_slug`, `customer_email` |
| `donation_campaigns`    | `status`, `goal_cents`, `use_stripe_payment_link`             |
| `registrations`         | `type`, `status`, `source_slug`, `source_title`, `registration_group_id`, `student_number`, `created_at` (= `date_created`) |
| `contact_messages`      | `status`, `subject`, `created_at`, `email`                    |
| `contact_subjects`      | `label`, `status`                                             |
| `activities`            | `status`, `start_date`, `featured`, `slug`                    |
| `articles`              | `status`, `published_at`, `category_ref`, `slug`              |
| `videos`                | `status`, `show_on_homepage`, `category_ref`                  |
| `education_programs`    | `status`, `registration_enabled`, `target_gender`             |
| `hijri_date_overrides`  | `gregorian_date`, `hijri_year`, `hijri_month`, `hijri_day`    |
| `tv_announcements`      | `status`, `start_date`, `end_date`                            |

Directus' eigen `date_created` / `date_updated` velden zitten
standaard op elke collectie en zijn bruikbaar voor tijdfilters.

### 31.4 Welke dashboards kunnen handmatig (zonder code)?

**Allemaal.** Insights-dashboards en panels worden in de Directus
admin-UI gebouwd, niet in code. Stappen voor de beheerder:

1. Log in als admin op `https://al-ghofraan.com/admin` (of waar de
   Directus-instance draait).
2. Ga naar **Insights** in de zijbalk (icoon: bliksem/grafiek).
3. Klik **+ Create Dashboard**, geef een naam (bv. "Donaties").
4. In het dashboard klik **+ Create Panel** rechtsboven.
5. Kies het panel-type (Metric, List, Bar Chart, Line Chart, etc.).
6. Selecteer de collectie, het veld en eventuele filters.
7. Sla op. Herhaal voor meer panels.
8. Panels zijn vrij verschuifbaar en resizebaar binnen het
   dashboard-grid.

Voor het exacte gedrag: zie de officiële Directus-docs over Insights
(`https://docs.directus.io/app/insights.html`). De terminologie is
stabiel sinds versie 10.

### 31.5 Kunnen dashboards via seed?

**Technisch ja, maar met flinke caveats.** Insights bestaat uit twee
collecties in `directus_*`:

- `directus_dashboards` — dashboard-records (id, name, note, icon, color).
- `directus_panels` — panel-records met een `dashboard` FK, een `type`
  en een veld `options` (JSON) waarin de configuratie zit (filter,
  veld, weergave-opties, etc.).

Een seed-script kan deze records aanmaken via de admin-API. Maar:

- De JSON-structuur van `panels.options` is **niet gedocumenteerd als
  publieke API**. Het is een UI-state-object dat Directus zelf
  ge­nereert; bij een major versie-upgrade kan het breken.
- Panel-types die intern op andere structuren leunen (bv.
  Relational-O2M lijsten) zijn lastig stabiel te seeden.
- Tweede run-idempotentie is mogelijk via `softCreateItem` op `name`
  als natuurlijke key, maar als de admin handmatig kolommen toevoegt
  aan een panel zou een tweede seed-run die kunnen platslaan.

### 31.6 Risico's van dashboards via seed

| Risico                                                           | Impact   | Hoe te beperken                                                            |
| ---------------------------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| `panels.options` JSON-format wijzigt bij Directus-upgrade        | medium   | Seed alleen simpele panel-types (metric, list); upgrade-test in staging    |
| Handmatige wijzigingen door admin worden overschreven            | hoog     | `softCreateItem` op `name` (= idempotent insert-only, geen update)         |
| Permissie-velden ontbreken voor non-admin rollen                 | laag     | Dashboards staan default op admin-only; bewust expliciet zetten            |
| Verouderde collecties/velden in panel-options crashen de UI      | medium   | Bij elke seed-run eerst valideren dat de referenced collection/field bestaat |
| Geen kale "API contract" voor panels — moet via UI gereverse-engineerd | hoog | Begin klein: één dashboard handmatig maken, JSON daarvan kopiëren als template |

### 31.7 Advies

**Voor nu: bouw dashboards handmatig in Directus**, niet via seed.
Redenen:

1. **Geen API-contract**: de `panels.options` JSON-shape is een
   UI-implementatiedetail. Een seed daarvoor wordt nu fragiel zonder
   directe winst.
2. **Lage frequentie**: dashboards worden één keer ingericht en
   daarna jarenlang gebruikt. De handmatige stap is een
   eenmalige investering van ~30 minuten.
3. **Per-omgeving anders**: lokaal/productie kan een beheerder andere
   metrics willen tonen. Dat past slecht in een gedeelde seed.
4. **Veiligheid**: een seed die elke run dashboards aanraakt kan per
   ongeluk panels resetten. Met handmatig beheer kan dat nooit.
5. **Onomkeerbaarheid laag**: dashboards weggooien en opnieuw
   aanmaken is goedkoop. Geen migratierisico.

Wanneer wél seed:

- Als jullie een **vaste minimale set** willen (bv. een "Donaties"
  dashboard met 4 panels) die op elke nieuwe Directus-installatie
  identiek moet verschijnen — bv. bij staging-omgevingen.
- Pas dán raden we aan om eerst **handmatig** dat ene dashboard in te
  richten, dan de records via de admin-API uit te lezen (`GET
  /dashboards`, `GET /panels?filter[dashboard][_eq]=<id>`) en die
  JSON als template in een nieuwe `scripts/seed/steps/25-insights.mjs`
  te stoppen, met `softCreateItem` op `name`.

Concreet stappenplan voor nu:

1. **Beheerder logt in** op Directus admin.
2. Maakt handmatig de dashboards uit sectie 31.2 die hij/zij meteen
   nuttig vindt — start klein, bv. alleen "Donaties" en
   "Inschrijvingen".
3. Test of alle filters werken zoals verwacht (data is live, dus
   eerst even met een paar testrecords).
4. Pas later, wanneer de dashboards zich bewezen hebben, kijken we
   naar een lichte seed-implementatie (handvol panel-types,
   idempotent, alleen voor staging/dev-omgevingen).

### 31.8 Geen code-impact

Insights raakt de Next.js-frontend nergens aan:

- Geen aanpassingen aan `lib/directus.ts`.
- Geen nieuwe Directus permissions nodig (admin heeft Insights
  standaard).
- Geen `npm run seed` nodig voor deze stap.
- Geen `npm run build`-impact.

Mocht je later een dashboard toch via seed willen toevoegen, dan
volgt een aparte delivery met een gericht voorstel.
