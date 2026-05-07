# Pre-deployment checklist

> Loop deze lijst van boven naar beneden door **vóór** je de site naar
> productie zet. Veel stappen zijn éénmalig per omgeving.

## 1. Code & build

- [ ] `git status` is schoon (geen losse wijzigingen)
- [ ] `npm run build` is groen (in `frontend/`)
- [ ] Geen `console.log`-debug statements (alleen `console.warn`/`console.error` in API/error paths)
- [ ] Geen hardcoded `localhost:3000` of `localhost:8055` in publieke code  
      *(grep met de check uit §11 hieronder)*

## 2. Environment variables (productie)

Zet in je productie-`.env`:

- [ ] `NEXT_PUBLIC_SITE_URL=https://al-ghofraan.com` *(of het uiteindelijke domein)*
- [ ] `DIRECTUS_PUBLIC_URL=https://cms.al-ghofraan.com`
- [ ] `NEXT_PUBLIC_DIRECTUS_URL=https://cms.al-ghofraan.com`
- [ ] `DIRECTUS_URL=` *(intern, bv. `http://directus:8055` of gelijk aan public)*
- [ ] `DIRECTUS_TOKEN=` *(static admin-token uit Directus, geheim)*
- [ ] `CORS_ORIGIN=https://al-ghofraan.com`
- [ ] `DIRECTUS_SECRET=` *(lange random string, eenmalig genereren)*
- [ ] `DIRECTUS_ADMIN_EMAIL` + `DIRECTUS_ADMIN_PASSWORD` (admin-account)
- [ ] `POSTGRES_*` correct gezet

### Stripe — LIVE keys

- [ ] `STRIPE_SECRET_KEY=sk_live_...` *(geen `sk_test_`)*
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...` *(geen `pk_test_`)*
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...` *(uit het LIVE webhook-endpoint)*
- [ ] In Stripe Dashboard: webhook endpoint aangemaakt op  
      `https://al-ghofraan.com/api/stripe/webhook`  
      met de events `checkout.session.completed`, `checkout.session.expired`,
      `invoice.payment_succeeded`, `invoice.payment_failed`,
      `customer.subscription.deleted`

## 3. Directus content

Open Directus admin en controleer per item:

### Site Settings (singleton)

- [ ] `site_name`, `site_subtitle` correct
- [ ] `logo` en `footer_logo` geüpload (echte logo's)
- [ ] `favicon` en `og_image` geüpload
- [ ] `contact_email` ingevuld *(geen test-adres)*
- [ ] `phone` en `address` ingevuld als ze op de site moeten verschijnen
- [ ] `whatsapp_number` (incl. landcode, bv. `+31612345678`) als WhatsApp-knop gewenst is
- [ ] `whatsapp_default_message` (optioneel)
- [ ] `social_links` ingevuld of bewust leeg
- [ ] `default_seo_title` + `default_seo_description` correct
- [ ] `footer_title`, `footer_arabic_title`, `footer_description` correct
- [ ] `copyright_text` (optioneel, anders auto-generated)

### Page content

- [ ] `home`, `dawahcommissie`, `doneren`, `contact`, `privacy` allemaal `published`
- [ ] Privacyverklaring nagekeken — datum bovenaan klopt, contactverwijzing klopt
- [ ] Geen verwijzingen meer naar oude/test-emailadressen

### Navigation items

- [ ] Header- en footer-menu's bevatten alleen actuele links
- [ ] Privacy-link staat in `footer`
- [ ] Geen dode/test-routes

### Activities

- [ ] Geen test-activiteiten meer in `published` status
- [ ] Echte aankomende activiteiten zijn ingevoerd of de homepage-sectie blijft bewust leeg

### Education programs

- [ ] Voorbeeldprogramma's uit seed staan op `draft` of zijn verwijderd
- [ ] Echte programma's: `target_gender` correct gezet (`male`/`female`/`mixed`)

### Articles

- [ ] Voorbeeldartikel uit seed staat op `draft` of is verwijderd
- [ ] Echte gepubliceerde artikelen zijn nagekeken op `featured`/`category`
- [ ] Categorie-filterknoppen op `/artikelen` verschijnen logisch (alleen categorieën met minstens 1 published artikel)

### Videos

- [ ] `/videos` toont de gewenste video's
- [ ] Alleen video's op `published` zijn zichtbaar
- [ ] Iedere `youtube_url` rendert een werkende embed (geen blanco kaartjes)
- [ ] Video-volgorde klopt (featured eerst, daarna `sort`, daarna `published_at`)

### Donation campaigns

- [ ] Geen test-campagnes meer in `published`
- [ ] `goal_amount`, `default_amount` en `suggested_amounts` correct ingevuld

### Prayer times

- [ ] Het echte CSV-bestand is geüpload via `prayer_time_files`
- [ ] Het juiste record staat op `active=true`
- [ ] `/gebedstijden` toont vandaag-rij correct
- [ ] `/gebedstijden/overzicht` toont alle 12 maanden

### FAQ + icon settings

- [ ] FAQ bevat de actuele vragen
- [ ] Icon-mapping in `icon_settings` is naar wens

## 4. Submissions opruimen

- [ ] Test-records uit `registrations` verwijderd
- [ ] Test-records uit `donations` verwijderd  
      *(of apart gemarkeerd zodat ze niet meetellen in eindrapport)*
- [ ] Test-records uit `contact_messages` verwijderd
- [ ] Public permissions: `registrations`, `donations`, `contact_messages` blijven
      admin-only (geen public read)

## 5. Stripe live-test

- [ ] Lokaal eerst: één doneren-flow testen tegen `sk_test_` keys → succesvol
- [ ] Productie: één kleine LIVE donatie (€1) doen via iDEAL  
      → record komt aan in Directus `donations` met `status=completed`
- [ ] Donatie wordt zichtbaar in Stripe Dashboard met juiste metadata
- [ ] Bij maandelijkse abonnementen: één test-subscription opzetten en  
      direct annuleren — webhook moet status correct bijwerken

## 6. Werking publieke pagina's

Loop deze door op productie:

- [ ] `/` — geen demo-activiteiten zichtbaar tenzij echt aanwezig
- [ ] `/agenda` — toont echte activiteiten
- [ ] `/agenda/[slug]` — detailpagina werkt + RegistrationForm verstuurt
- [ ] `/onderwijs` — toont echte programma's of nette lege staat
- [ ] `/onderwijs/[slug]` — detail + RegistrationForm
- [ ] `/dawahcommissie` — content + FAQ
- [ ] `/artikelen` — toont echte artikelen of nette lege staat
- [ ] `/artikelen/[slug]` — leesbaar
- [ ] `/gebedstijden` — toont vandaag-card op basis van échte CSV  
      *(GEEN nep-tijden bij missing CSV; wel een nette melding)*
- [ ] `/gebedstijden/overzicht` — maand/jaar dropdowns werken
- [ ] `/contact` — formulier verstuurt en WhatsApp-knop opent als nummer is gezet
- [ ] `/doneren` — DonationForm rendert + Stripe Checkout opent succesvol
- [ ] `/privacy` — gepubliceerd, datum klopt, geen oude e-mails
- [ ] `/videos` — toont video's of nette lege staat (geen kapotte iframes)
- [ ] `/robots.txt` — laadt en verwijst naar `${SITE_URL}/sitemap.xml`
- [ ] `/sitemap.xml` — laadt en bevat alle vaste publieke routes incl. `/videos`
- [ ] Custom dynamische pagina's via `/[slug]` werken zoals gewenst

## 7. Header & footer

- [ ] Logo correct + klikbaar naar `/`
- [ ] Site-naam + subtitel uit Directus
- [ ] Navigatie-items kloppen
- [ ] Footer toont juiste branding, contact, social links, privacy-link
- [ ] WhatsApp-knop op /contact alleen zichtbaar als `whatsapp_number` is gevuld

## 8. SEO & metadata

- [ ] `<title>` op elke pagina correct
- [ ] OG-image rendert *(check via `view-source`)*
- [ ] Favicon zichtbaar in tab
- [ ] `metadataBase` resolved naar productie-URL  
      *(controleer met "View Source" → `<meta property="og:url">`)*

## 9. Mobiele check

- [ ] iPhone-formaat: header, hero, activiteiten-cards, doneren-form
- [ ] Android-formaat: idem
- [ ] WhatsApp-knop tikt door naar app
- [ ] Stripe Checkout opent correct in mobile browser

## 10. Backups & rollback

- [ ] Database-backup vlak vóór go-live
- [ ] Rollback-plan bekend (vorige image / git revert path)

## 11. Snelle hardcoded-URL check

In project-root:

```bash
grep -rn "localhost:3000\|localhost:8055\|al-ghofraan\.com" \
  --include="*.tsx" --include="*.ts" --include="*.mjs" \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude="next.config.mjs" --exclude="env.mjs"
```

Resultaten zouden alléén in docs en `.env*` mogen staan, niet in
runtime-code. `next.config.mjs` mag een entry bevatten voor de image
remote-pattern (zie ook §12 hieronder) — bewuste configuratie.

## 12. Domeinwijziging (later)

Bij verhuizing naar ander domein hoef je alléén:

1. `NEXT_PUBLIC_SITE_URL` aanpassen in productie-env
2. `NEXT_PUBLIC_DIRECTUS_URL` + `DIRECTUS_PUBLIC_URL` aanpassen als CMS-domein wijzigt
3. `CORS_ORIGIN` aanpassen
4. Stripe Dashboard: webhook endpoint URL aanpassen
5. DNS / hosting / TLS-certificaten regelen
6. `next.config.mjs` `images.remotePatterns` updaten als CMS-host wijzigt  
   *(dit bestand is bewust niet in deze cleanup aangepast)*

## 13. Seed in productie?

- [ ] Eerste keer in nieuwe omgeving: `npm run seed` om schema/permissies/defaults aan te maken
- [ ] Daarna: alleen opnieuw draaien als je nieuwe collectie/veld/permissie wilt toevoegen
- [ ] Soft-create steps overschrijven nooit handmatige content — veilig om opnieuw te draaien

> ✅ Alles afgevinkt? Veel succes met de lancering, in shaa Allah.
