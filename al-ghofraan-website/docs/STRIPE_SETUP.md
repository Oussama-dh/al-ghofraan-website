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

# Optioneel — als de site lokaal op een andere poort draait dan localhost:3000,
# of voor productie: het externe domein. Wordt gebruikt voor success_url en
# cancel_url van Stripe Checkout. Default is de host van de inkomende request.
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
