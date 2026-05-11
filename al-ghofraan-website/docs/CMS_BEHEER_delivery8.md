# CMS_BEHEER — Delivery 8 · Beheerfeatures (zonder homepage-highlights)

> Dit document is een aanvulling op `docs/CMS_BEHEER.md`. Voeg de
> inhoud hieronder toe als secties **32 t/m 34** onderaan dat document.

---

## 32. Rollen en policies (Directus 11)

Sinds delivery 8 staan er **zeven afdelingsrollen** klaar in Directus
naast de bestaande Admin-rol. Elke rol is gekoppeld aan een eigen
policy met dezelfde naam. Gebruikers moeten **handmatig** aan een rol
worden gekoppeld — de seed doet dat **nooit** automatisch.

### 32.1 Beschikbare rollen

| Rol                       | Mag beheren (CRU, geen Delete)                                                                          | Mag lezen                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Admin** (bestaand)      | Alles — niet aangepast door de seed.                                                                    | Alles                              |
| Content beheerder         | page_content, articles, article_categories, videos, video_categories, activities, faq_items, page_sections, page_section_items, navigation_items | site_settings, directus_files |
| Onderwijs beheerder       | education_programs · registrations (read+update met filter `type=education`)                            | site_settings, directus_files      |
| Activiteiten beheerder    | activities · registrations (read+update met filter `type=activity`)                                     | site_settings, directus_files      |
| Contact beheerder         | contact_messages, contact_subjects                                                                      | site_settings, directus_files      |
| Donatie beheerder         | donation_campaigns                                                                                      | donations (read-only), site_settings, directus_files |
| TV beheerder              | tv_announcements                                                                                        | site_settings, prayer_time_files, directus_files |
| Gebedstijden beheerder    | prayer_time_files, hijri_date_overrides                                                                 | site_settings, directus_files      |

**Geen delete-recht.** Gewone beheerders kunnen items archiveren via
het status-veld (`draft`/`archived`) maar niet écht verwijderen. Dat
voorkomt onbedoeld dataverlies. Alleen de Admin-rol kan verwijderen.

**Gefilterde toegang voor inschrijvingen.** Onderwijs- en
Activiteiten-beheerders zien alleen records uit hun afdeling — de
filter is server-side door Directus afgedwongen via de policy.

### 32.2 Hoe koppel je een gebruiker aan een rol?

1. Log in als admin op Directus.
2. Ga naar **User Directory** in de zijbalk.
3. Open de betreffende gebruiker (of klik **+ Create User** voor een
   nieuwe).
4. Bij **Role** kies je de afdelingsrol.
5. Eventueel een tijdelijk wachtwoord zetten en de gebruiker laten
   resetten bij eerste login.

**Niet doen**: gebruikers automatisch via seed aan een rol koppelen.
De seed maakt alleen rollen + policies aan; de admin koppelt zelf.

### 32.3 Wat de seed wel en niet doet

| Doet wel                                              | Doet NIET                                  |
| ----------------------------------------------------- | ------------------------------------------ |
| Rollen aanmaken (op naam, idempotent)                 | Bestaande Admin-rol aanpassen              |
| Policies aanmaken                                     | Public-policy aanpassen                    |
| Permissions op de afdelingspolicies aanmaken/bijwerken | Bestaande onbekende policies verwijderen   |
| Rol↔policy koppelen via `/access`                     | Users automatisch aan een rol koppelen     |
| Onbekende/ontbrekende collecties veilig overslaan     | Delete-permissies geven aan gewone beheerders |

Tweede `npm run seed` is een no-op: alle ensure-functies vinden de
bestaande records via naam-lookup en patchen alleen bij verschil.

---

## 33. Admin-lijst layouts

Sinds delivery 8 zijn de admin-lijsten in Directus voor de
belangrijkste collecties standaard ingesteld met een **zinvolle set
kolommen** en **goede default-sortering**:

| Collectie            | Zichtbare kolommen                                                                            | Sortering            |
| -------------------- | --------------------------------------------------------------------------------------------- | -------------------- |
| `registrations`      | student_number, name, parent_name, parent_phone, source_title, type, status, created_at      | nieuwst eerst        |
| `contact_messages`   | subject, name, email, status, handled_by, last_contacted_at, created_at                       | nieuwst eerst        |
| `donations`          | amount_display, campaign_title, donor_name, donor_email, status, type, paid_at, created_at   | nieuwst eerst        |
| `education_programs` | title, teacher, target_group, registration_enabled, status, start_date, sort                  | sort asc, datum asc  |
| `activities`         | title, date, location, registration_enabled, status, sort                                     | datum asc            |
| `articles`           | title, category_ref, category, status, featured, published_at                                 | nieuwst eerst        |
| `videos`             | title, category_ref, status, featured, show_on_homepage, published_at                          | nieuwst eerst        |
| `tv_announcements`   | title, type, status, active, show_on_tv, display_from, display_until, sort                    | sort asc, nieuwst eerst |
| `donation_campaigns` | title, status, featured, goal_amount_display, use_stripe_payment_link, sort                   | sort asc             |

**Beheerders kunnen dit overschrijven** door zelf een kolom-toggle te
gebruiken en de layout op te slaan via het "Save Current Layout"
menu — Directus maakt dan een persoonlijke preset die voor die ene
gebruiker geldt. De globale defaults blijven intact.

**Velden die niet bestaan** (bv. wanneer een aangepaste installatie
een kolom mist) worden door de seed netjes overgeslagen — geen crash,
alleen een info-log.

### Hoe deze seed werkt (kort)

Twee veilige metadata-pads:

1. **Collection-meta**: `display_template`, `sort_field`,
   `archive_field` via `PATCH /collections/<name>`. Alleen patchen
   waar er werkelijk iets verschilt.
2. **Globale preset** (`role=null, user=null`) in `directus_presets`
   met `layout="tabular"` + zichtbare velden + sort. Persoonlijke
   presets van users blijven daarbij ongemoeid.

---

## 34. E-mailnotificaties (voorbereidende fase)

### 34.1 Status: voorbereid, niet actief

Sinds delivery 8 staan er **velden** klaar in `site_settings` voor
e-mailnotificaties, en is er een **server-only helper** die de
notificatie-payload voorbereidt — maar er wordt nog GEEN echte mail
verstuurd. We hebben nog geen e-mailprovider gekozen.

Concreet betekent dit:

- `email_notifications_enabled` staat default op **`false`**.
- Ook wanneer een admin hem op `true` zet, vertrekt er geen mail —
  de helper logt alleen een regel in de server-console (in
  development de volledige payload, in productie alleen een neutrale
  info-regel).
- De formulieren (`/api/contact`, `/api/inschrijven`) werken
  ongewijzigd. Een notificatie-fout kan nooit een inschrijving
  blokkeren.

### 34.2 Nieuwe site_settings velden

| Veld                              | Type    | Default | Doel (toekomst)                       |
| --------------------------------- | ------- | ------- | ------------------------------------- |
| `email_notifications_enabled`     | boolean | `false` | Master-schakelaar                     |
| `email_from_name`                 | string  | leeg    | Afzendernaam                          |
| `email_from_address`              | string  | leeg    | Afzenderadres                         |
| `notification_email_contact`      | string  | leeg    | Adres voor contactmeldingen           |
| `notification_email_education`    | string  | leeg    | Adres voor onderwijsinschrijvingen    |
| `notification_email_activities`   | string  | leeg    | Adres voor activiteit-inschrijvingen  |
| `notification_email_donations`    | string  | leeg    | Gereserveerd — nog niet gebruikt       |

### 34.3 Wat de helper wel doet

`lib/server/notifications.ts` bevat drie functies:

- `notifyContact(settings, data)`
- `notifyEducationRegistration(settings, data)`
- `notifyActivityRegistration(settings, data)`

Elke functie:
1. Stopt direct als `email_notifications_enabled = false`.
2. Stopt direct als het bijbehorende `notification_email_<dept>`-veld
   leeg is.
3. Bouwt anders een platte tekst (subject + body) op basis van de
   gegevens.
4. Geeft die door aan `dispatchAdminEmail()` — die in deze delivery
   alleen logt. In development zie je de volledige payload in de
   console; in productie alleen een rustige info-regel met een
   gemaskeerd e-mailadres (`j***@voorbeeld.nl`).

De helper is **strikt fail-soft**: alles draait in try/catch zodat
een eventuele toekomstige verzendfout nooit naar de aanroepende code
bubbelt.

### 34.4 Wat de helper NIET doet (in deze delivery)

- Geen SMTP-verbinding.
- Geen `node:net` of `node:tls` import.
- Geen externe dependency (geen nodemailer, geen provider-SDK).
- Geen netwerktoegang vanuit deze module.
- Geen bevestigingsmails naar bezoekers.

### 34.5 Aansluitpunten in de API

`/api/contact` en `/api/inschrijven` roepen de bijbehorende
helper-functie aan **direct na** de succesvolle Directus-write, in
een eigen try/catch. Zolang de master-switch uit staat is dit een
goedkope no-op:
1. één `getSiteSettings()`-call (reeds gecachet voor andere
   doeleinden in de meeste flows),
2. één boolean-check,
3. retour.

Wanneer een latere delivery `dispatchAdminEmail()` invult met een
echte verzender, hoeft er aan deze API-routes **niets** te veranderen.

### 34.6 Latere keuzes om echt mail te versturen

Drie realistische routes; we adviseren **B** voor een moskee-website:

| Route                                | Pro                                        | Con                                  |
| ------------------------------------ | ------------------------------------------ | ------------------------------------ |
| **A) Nodemailer + SMTP**             | Werkt met élke SMTP-relay (Brevo, Mailgun) | +1 dependency, SMTP-config nodig     |
| **B) Provider-SDK (Resend/Brevo/Postmark)** | Beste deliverability, geen SMTP-config | +1 dependency, API-key nodig          |
| **C) Eigen pure-Node SMTP-client**   | Geen dependency                            | ~300 regels onderhoud, geen OAUTH2   |

Wanneer de keuze is gemaakt:

1. Nieuwe delivery met **één** kleine wijziging in
   `lib/server/notifications.ts` — de body van
   `dispatchAdminEmail()` vervangen door echte verzending.
2. Env vars / API-keys toevoegen aan `docker-compose.yml` of `.env`.
3. Optioneel `email_notifications_enabled` op `true` zetten in
   Directus Site Settings.

### 34.7 Geen bezoekersbevestigingen (nog niet)

Bewust: in deze fase géén bevestigingsmail naar de bezoeker bij een
inschrijving of contactmelding. Dat vereist extra zorgvuldigheid
(opt-in, anti-spam, unsubscribe). Volgt in een latere fase.

---

## Bekende beperkingen / risico's (delivery 8)

- **Geen echte e-mailverzending**: de hele e-mailflow staat
  voorbereid maar onverzonden. Wanneer een afdeling een bericht wil
  ontvangen moet er eerst een provider worden aangesloten.
- **Admin-list presets**: persoonlijke presets van bestaande
  gebruikers blijven werken — we wijzigen alleen de globale preset
  (role=null, user=null).
- **Rollen-seed**: maakt geen verbinding met SSO/SAML. Beheerders
  worden via Directus' eigen user-table aangemaakt.
- **Helper-log in productie**: zolang de master-switch uit staat
  gebeurt er niets. Wanneer hij **aan** staat zonder verzendkanaal
  komt er per inschrijving een info-regel in de logs — onschadelijk
  maar wel ruis. Tip: laat hem standaard uit tot de provider er is.
