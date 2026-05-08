# Stripe — installatie en configuratie

Dit document beschrijft hoe je Stripe Checkout aansluit op de Al-Ghofraan
website voor donaties (eenmalig en maandelijks). De donaties komen
binnen op `/doneren`, de bedankpagina is `/doneren/succes`, en alle
status-updates komen via webhook binnen op `/api/stripe/webhook`.

---

## 1. Wat heb je nodig?

- Een Stripe-account (test mode is voldoende om te ontwikkelen)
- Toegang tot het Stripe Dashboard: https://dashboard.stripe.com
- De `.env` van het project (in `frontend/.env` of `frontend/.env.local`)

---

## 2. Environment variables

Voeg deze regels toe aan `frontend/.env.local` (lokaal) of de productie-env:

```env
# Stripe — verkrijg via Stripe Dashboard → Developers → API keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook — verkrijg via Stripe Dashboard → Developers → Webhooks
# (na het aanmaken van een endpoint, zie sectie 5)
STRIPE_WEBHOOK_SECRET=whsec_...

# Canonical site-URL — gebruikt voor Stripe success_url / cancel_url,
# OG-tags en canonical metadata. Bron van waarheid voor het domein.
# Lokaal:    http://localhost:3000
# Productie: https://al-ghofraan.com  (of het uiteindelijke domein)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> ⚠️ **`STRIPE_SECRET_KEY` is een geheim** — nooit committen, nooit naar
> de browser sturen. De Next.js build behandelt env-vars zonder
> `NEXT_PUBLIC_`-prefix automatisch als server-only.

---

## 3. API keys ophalen

1. Log in op https://dashboard.stripe.com
2. Zorg dat **Test mode** aanstaat (toggle rechtsboven) — voor ontwikkeling
3. Ga naar **Developers → API keys**
4. Kopieer:
   - **Publishable key** (`pk_test_...`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`

> 💡 In test mode kun je betalen met testkaart `4242 4242 4242 4242`
> (willekeurige toekomstige datum, willekeurige CVC, willekeurige postcode).
> Voor iDEAL test: kies een willekeurige bank en accepteer.

---

## 4. iDEAL en kaart activeren

1. Stripe Dashboard → **Settings → Payment methods**
2. Vink minimaal aan:
   - **Cards** (altijd standaard aan)
   - **iDEAL** — alleen voor klanten met betaalmethode in EUR
3. Voor maandelijkse donaties: **kaart** is voldoende. iDEAL ondersteunt
   geen abonnementen (alleen één-shot betalingen).

> ℹ️ Onze checkout-route stuurt voor eenmalige donaties expliciet
> `payment_method_types: ["ideal", "card"]` mee. Voor maandelijkse
> donaties wordt alleen `card` aangeboden.

---

## 5. Webhooks instellen

### Lokaal testen (Stripe CLI)

Tijdens ontwikkeling forward je webhook-events naar je lokale dev-server:

```bash
# Eenmalig: install Stripe CLI
# https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

De CLI print een `whsec_...` signing secret. **Plak die in je
`.env.local`** als `STRIPE_WEBHOOK_SECRET` en herstart `npm run dev`.

> ⚠️ De signing secret van Stripe CLI is anders dan die van een
> productie-endpoint. Gebruik niet dezelfde key voor productie.

### Productie

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://al-ghofraan.com/api/stripe/webhook`
3. Selecteer deze events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Klik **Add endpoint**
5. Open het zojuist aangemaakte endpoint → **Signing secret** kopieren
6. Plak in productie-env als `STRIPE_WEBHOOK_SECRET`
7. Deploy/restart de Next.js app

> ⚠️ Als `STRIPE_WEBHOOK_SECRET` niet matcht met het endpoint, weigert
> de route alle binnenkomende events met `400 Webhook signature ongeldig`.
> Dit is bewust — om te voorkomen dat onbevoegden statussen kunnen
> manipuleren.

---

## 6. Lokaal testen — checklist

1. Start Directus: `docker compose up -d directus`
2. Run seed: `cd frontend && npm run seed` (maakt `donations` aan)
3. Vul `.env.local` aan met de drie Stripe keys
4. Start Stripe CLI listener (zie sectie 5)
5. Start Next.js: `npm run dev`
6. Open `http://localhost:3000/doneren`
7. Vul: type=Eenmalig, bedrag=€10, geldig e-mail → **Verder naar betaling**
8. In Stripe Checkout: pak testkaart `4242 4242 4242 4242` → Pay
9. Verwacht: redirect naar `/doneren/succes`
10. Open Directus → **Donations** → status = `paid`, `paid_at` ingevuld

### Maandelijks testen

Zelfde stappen, maar kies **Maandelijks**. Verwacht: status = `active`
ná `checkout.session.completed`.

### Geannuleerd testen

Op de Checkout-pagina klik je **back/cancel** in plaats van te betalen.
URL gaat naar `/doneren?geannuleerd=1` met een banner. Het record blijft
op `pending` tot het na ~24u expired wordt door Stripe (event
`checkout.session.expired` → `cancelled` in Directus).

---

## 7. Naar productie schakelen

Wanneer je klaar bent voor live betalingen:

1. **Stripe Dashboard** → toggle linksboven naar **Live mode**
2. Activeer je Stripe-account volledig (Stripe vraagt om bedrijfsgegevens,
   bankrekening, KVK, etc.)
3. **Developers → API keys** → kopieer de live keys (`sk_live_...` en
   `pk_live_...`)
4. **Developers → Webhooks → Add endpoint** opnieuw, maar nu in Live mode,
   met dezelfde URL `https://al-ghofraan.com/api/stripe/webhook`
5. Kopieer de live `whsec_...` voor productie
6. Werk productie-env bij:
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_SITE_URL=https://al-ghofraan.com
   ```
7. Deploy en doe een **test-donatie van €1** om de volledige flow te
   verifiëren — refund die direct via Stripe Dashboard

---

## 7b. Domeinwijziging later

Als het domein later verandert (bv. van `al-ghofraan.com` naar iets anders),
hoef je voor Stripe **maar twee dingen** aan te passen:

1. **`NEXT_PUBLIC_SITE_URL`** in productie-env — dit dekt de
   `success_url` en `cancel_url` voor Stripe Checkout, en de
   canonical/OG-metadata van de site.
2. **Stripe Dashboard** → Developers → Webhooks → het bestaande endpoint
   → URL aanpassen naar `https://NIEUW-DOMEIN/api/stripe/webhook`.

Geen code-wijzigingen nodig. Alle URL's worden runtime opgebouwd via
de `getSiteUrl()` helper in `frontend/lib/utils.ts`.

---

## 8. Veelvoorkomende problemen

| Probleem                                              | Oorzaak                                              | Oplossing                                                            |
|-------------------------------------------------------|------------------------------------------------------|----------------------------------------------------------------------|
| `503 Donaties zijn op dit moment niet beschikbaar`    | `STRIPE_SECRET_KEY` ontbreekt                        | Vul `.env.local` aan en herstart `npm run dev`                       |
| Webhook geeft `400 Webhook signature ongeldig`        | `STRIPE_WEBHOOK_SECRET` mismatcht                    | Kopieer secret opnieuw uit Stripe Dashboard / CLI                    |
| Donatie blijft op `pending` staan na succesvolle betaling | Webhook bereikt de server niet                  | Check Stripe CLI listener (lokaal) of webhook log (Stripe Dashboard) |
| iDEAL niet zichtbaar in Checkout                      | Niet geactiveerd in Stripe of valuta is niet EUR     | Stripe Dashboard → Settings → Payment methods → activeer iDEAL       |
| Maandelijks: alleen kaart te zien                     | Klopt — iDEAL ondersteunt geen subscriptions         | Documenteer dit op `/doneren` als dat verwarrend is voor donors      |

---

## 9. Wat doet welke code?

| Bestand                                              | Verantwoordelijkheid                                 |
|------------------------------------------------------|------------------------------------------------------|
| `frontend/lib/stripe.ts`                             | Server-side Stripe client (singleton)                |
| `frontend/app/api/doneren/checkout/route.ts`         | Maakt Stripe Checkout Session + pending donation     |
| `frontend/app/api/stripe/webhook/route.ts`           | Verwerkt webhook events → status updates in Directus |
| `frontend/components/donation/DonationForm.tsx`      | Formulier op `/doneren`                              |
| `frontend/app/doneren/page.tsx`                      | Donatiepagina (CMS-content + formulier)              |
| `frontend/app/doneren/succes/page.tsx`               | Bedankpagina ná Checkout                             |
| `frontend/scripts/seed/steps/14-donations.mjs`       | Maakt `donations` collectie aan in Directus          |
| `frontend/lib/utils.ts` — `formatEurFromCents`       | Centen → "€25,00" formattering, gedeeld tussen routes |

Stripe blijft te allen tijde de bron van waarheid voor betalingen, refunds
en abonnementen. De Directus-collectie is een afspiegeling daarvan voor
intern gebruik.

---

## 10. Bedragen — centen vs euro's

Stripe werkt intern altijd in de **kleinste valuta-eenheid** — voor euro's
zijn dat **eurocenten** als integer. Dit voorkomt afrondings­fouten die
ontstaan bij floating-point bedragen (zoals `2.5` + `0.1` = `2.6000000000000005`).

In onze codebase betekent dat:

- **Frontend** (`DonationForm`): de gebruiker kiest €5/€10/€25/€50/€100
  of een vrij bedrag in euro's. Vóór verzending wordt dit
  `Math.round(euros * 100)` → centen.
- **API route** `/api/doneren/checkout`: ontvangt `amount_cents` (integer),
  valideert minimum €1 (100 cent) en stuurt dat 1-op-1 door naar Stripe.
- **Stripe** ziet `unit_amount: 2500` voor €25.
- **Directus `donations`**:
  - `amount` = `2500` (integer-centen, bron van waarheid)
  - `amount_display` = `"€25,00"` (leesbare string, automatisch gegenereerd)
- **Stripe Dashboard** toont uiteraard "€25.00" — Stripe doet die
  formattering zelf.

Naast metadata (zoals `donor_name`, `amount_cents`, `amount_display`,
`source = "website"`) staat het bedrag dus op meerdere plekken consistent.
De webhook schrijft `amount` en `amount_display` in één patch zodat ze
nooit uit sync raken.

---

## 11. Campagne-metadata

Wanneer een donor een specifiek doel kiest (zie sectie 14 in
`CMS_BEHEER.md`) wordt extra metadata meegestuurd naar Stripe:

| Sleutel          | Waarde                                                |
|------------------|-------------------------------------------------------|
| `campaign_id`    | Numerieke id van de campagne, of leeg bij algemene donatie |
| `campaign_slug`  | URL-slug ten tijde van de donatie                     |
| `campaign_title` | Titel ten tijde van de donatie                         |

Deze metadata is zichtbaar in het Stripe Dashboard bij de Checkout Session,
de PaymentIntent en (bij maandelijks) de Subscription. De webhook schrijft
dezelfde info naar Directus → `donations.campaign`, `campaign_slug`,
`campaign_title` zodat je achteraf kunt rapporteren per campagne, ook als
de campagne later wordt gewijzigd of gearchiveerd.

---

## 12. Stripe Payment Links per campagne (optioneel)

Sinds delivery 2b kun je per donatiecampagne een **Stripe Payment Link** koppelen. Dat is een vaste betaal-URL die je in het Stripe Dashboard maakt en die direct naar Stripe Checkout stuurt. Voordeel: in Stripe Dashboard kun je per Payment Link in één oogopslag zien hoeveel er via die specifieke campagne is binnengekomen — handig voor reconciliatie.

### 12.1 Wanneer wel/niet gebruiken

**Wel gebruiken** als:
- Je voor een specifieke campagne een eigen overzicht in Stripe wilt houden (bv. "Ramadan-actie 2026")
- Je tijdelijk een externe campagne wilt promoten via een vaste URL die je elders kunt delen

**Niet gebruiken** als:
- Je gewoon de standaard donatie-flow wilt — die werkt prima en geeft de meeste data in Directus
- Je per donatie persoonlijke metadata in onze database wilt vastleggen (bv. naam vóór betaling) — dat lukt alleen via de eigen checkout-flow

### 12.2 Een Payment Link maken

1. Ga naar Stripe Dashboard → **Products** → maak een product aan voor je campagne (bv. "Donatie Ramadan-actie 2026")
2. Voor **eenmalige donaties**: maak een Price aan met "Customer chooses price" en min/max-bedragen die jij wilt
3. Voor **maandelijkse donaties**: maak een Price aan met "Recurring" + "Customer chooses price"
4. Bij dat product → **Payment Links** → "+ New" → kies de Price → klik op "Create link"
5. Kopieer de URL (begint met `https://buy.stripe.com/...`)
6. Stripe geeft je ook een ID (`plink_xxx`) — die kun je optioneel ook noteren

### 12.3 Koppelen in Directus

Open de campagne in Directus → **Donation Campaigns** → vul in:

| Veld                       | Waarde                                                                |
|----------------------------|-----------------------------------------------------------------------|
| `use_stripe_payment_link`  | aangevinkt                                                             |
| `stripe_payment_link_url`  | de Payment Link URL die je net kopieerde                               |
| `stripe_payment_link_id`   | optioneel — `plink_xxx` ID voor jouw eigen overzicht                   |

Sla op. Vanaf nu stuurt het donatieformulier op `/doneren` voor deze campagne direct door naar Stripe — bedrag, naam en e-mail worden op de Stripe-pagina ingevuld.

### 12.4 Reconciliatie via `client_reference_id`

Onze frontend voegt automatisch `?client_reference_id=<campagne-slug>` toe aan de Payment Link URL. Hierdoor zie je in Stripe Dashboard bij elke Checkout Session het veld `client_reference_id` met de campagne-slug — zo weet je voor welke website-campagne een betaling was, ook als één Payment Link voor meerdere campagnes (her)gebruikt wordt.

### 12.5 Wat met de webhook en Directus?

De Stripe webhook werkt **óók** voor Payment Link betalingen — Stripe stuurt voor alle Checkout Sessions hetzelfde event. De webhook detecteert dat het een Payment Link sessie was via `session.payment_link` (de `plink_xxx` ID) en gebruikt `session.client_reference_id` om het juiste `campaign_slug` op te lossen.

**Beperking**: bij Payment Link betalingen ontbreken naam/email-metadata die wij normaal vóór de betaling al weten (omdat ze via onze form-state komen). De webhook valt dan terug op `session.customer_details.name` en `session.customer_details.email` — dus de gegevens die de bezoeker op de Stripe-pagina invult. Dit is meestal afdoende voor reconciliatie, maar minder rijk dan de eigen flow.

### 12.6 Beveiligings-check

De DonationForm staat **alleen URLs toe die beginnen met `https://buy.stripe.com/` of `https://checkout.stripe.com/`** — andere domeinen worden genegeerd. Dit voorkomt dat een per ongeluk verkeerd ingevoerde URL bezoekers naar phishing-sites kan sturen. Mocht je een andere Stripe-subdomein nodig hebben, contacteer de webbeheerder.

### 12.7 Terugzetten naar eigen checkout

Vink simpelweg `use_stripe_payment_link` uit in Directus. Vanaf dat moment gebruikt de campagne weer de standaard website-checkout. URL-velden mag je laten staan voor later.
