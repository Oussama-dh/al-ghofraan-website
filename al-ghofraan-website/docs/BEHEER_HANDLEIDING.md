# Beheerhandleiding — Al-Ghofraan / DawahCommissie website

> Een praktische gids voor niet-technische beheerders.
> Gewone Nederlandse taal. Geen technisch jargon.

Deze handleiding legt uit hoe je de website beheert via **Directus** zonder dat je iets kapot maakt. Lees de relevante sectie voordat je iets verandert. Twijfel? Dan beter even contact opnemen met de technische beheerder dan iets per ongeluk live zetten.

> 📝 Voor diepere technische uitleg over het Directus-model, zie de bestaande `CMS_BEHEER.md` en `CONTENT_MODEL.md` in de docs-map. Deze handleiding is bewust simpel gehouden.

---

## Inhoud

1. [Inloggen en basisregels](#1-inloggen-en-basisregels)
2. [Homepage beheren](#2-homepage-beheren)
3. [Donatiecampagnes beheren](#3-donatiecampagnes-beheren)
4. [TV-scherm beheren](#4-tv-scherm-beheren)
5. [Hadieth van de dag beheren (homepage)](#5-hadieth-van-de-dag-beheren-homepage)
6. [Hadieth-series beheren (TV)](#6-hadieth-series-beheren-tv)
7. [Activiteiten beheren](#7-activiteiten-beheren)
8. [Onderwijs beheren](#8-onderwijs-beheren)
9. [Video's beheren](#9-videos-beheren)
10. [Contact en Maps beheren](#10-contact-en-maps-beheren)
11. [Gebedstijden en TV-instellingen](#11-gebedstijden-en-tv-instellingen)
12. [Rollen en rechten](#12-rollen-en-rechten)
13. [Veelgemaakte fouten](#13-veelgemaakte-fouten)
14. [Checklists per onderdeel](#14-checklists-per-onderdeel)

---

## 1. Inloggen en basisregels

### Waar log je in?

- **Directus admin (productie)**: https://cms.al-ghofraan.nl
- **De website zelf**: https://al-ghofraan.nl

### Eerste keer inloggen — invite-mail

Als je nieuw bent, krijg je een **invite-mail** van `noreply@al-ghofraan.nl` met als onderwerp "You've been invited to Directus". Klik op de **Join Directus**-knop in de mail → kies zelf een wachtwoord → je bent direct ingelogd.

**Vier dingen om te weten**:

1. Mail kan in je **spam-folder** belanden (vooral bij Outlook). Even checken daar als je hem niet ziet
2. Wachtwoord moet **minimaal 8 tekens** zijn. Een korter wachtwoord geeft een algemene foutmelding zonder uitleg — kies dus meteen iets sterks
3. De link is **eenmalig en tijdsbeperkt**. Klik direct na ontvangst
4. Lukt het echt niet? Vraag de hoofdbeheerder om opnieuw te invitaten

### Wachtwoord vergeten

Klik onder het inlogformulier op **"Forgot Password?"** / **"Wachtwoord vergeten?"** → vul je e-mailadres in → je krijgt een reset-mail (zelfde afzender als invite-mail) met een link om een nieuw wachtwoord in te stellen.

Ook hier: minimaal **8 tekens** voor het nieuwe wachtwoord.

> Je inloggegevens deel je nooit met anderen. Voor extra beheerders vraag je de hoofdbeheerder om een eigen invite — dat is gratis en veilig.

### Drie status-waarden — onthoud deze goed

Bijna elke inhoud heeft een **status** veld met drie waarden:

| Status | Wat betekent dat | Wanneer gebruik je het |
|---|---|---|
| **draft** (concept) | Niet zichtbaar voor bezoekers | Tijdens bewerken, voordat je echt klaar bent |
| **published** (gepubliceerd) | Live zichtbaar op de website | Wanneer alles is gecontroleerd |
| **archived** (gearchiveerd) | Niet zichtbaar maar bewaard | Voor oude content die je later misschien weer wilt activeren |

**Regel**: zet iets pas op `published` als de tekst, datum, afbeelding en alle andere velden gecontroleerd zijn. Het is geen kunst om de website live te zetten — wel om het netjes te doen.

### Verwijderen (delete)

Verwijder bijna nooit iets. Gebruik in plaats daarvan:

- **status = archived** — content wordt verborgen maar blijft in de database
- of zet **active = uit** (waar dat veld bestaat)

Waarom geen delete? Omdat je een fout niet meer ongedaan kunt maken. Met archived kun je een artikel of activiteit jaren later weer activeren. Bijna geen enkele rol heeft sowieso delete-rechten — als de knop niet werkt, is dat ontwerp.

### Wat doe je wel?

- Tekst en afbeeldingen aanpassen
- Datums en tijden invullen
- Nieuwe items aanmaken
- Status veranderen tussen draft / published / archived
- Boolean-toggles (aan/uit-vinkjes) zoals `active`, `show_on_tv`, `show_on_homepage`

### Wat doe je niet zonder overleg?

- **Slug-velden** wijzigen na publicatie (breekt links en bookmarks)
- **Technische instellingen** in Directus Settings → Data Model
- **Velden of collecties** aanmaken of verwijderen
- **Permissions** of rollen aanpassen
- **Het CSV-bestand** met gebedstijden vervangen door iets vreemds
- Velden met **[LEGACY]** in de notitie aanraken (dat zijn oude velden die nog werken voor compatibiliteit — laat ze met rust)

### Persoonsgegevens — privacy

**Zet nooit persoonsgegevens in interne notitie-velden.** Bijvoorbeeld:
- `manual_raised_note` op een campagne — gebruik bedragen, geen namen
- `description` op een activiteit — geen e-mailadressen of telefoonnummers van organisatoren

Donor-namen, e-mailadressen, telefoonnummers en bankrekeningnummers horen alleen in de officiële velden (zoals `donations`, `registrations`, `contact_messages`) die niet publiek leesbaar zijn. Een interne notitie kan per ongeluk uitlekken bij toekomstige API-wijzigingen.

---

## 2. Homepage beheren

De homepage bestaat uit meerdere blokken, elk apart te beheren:

### 2.1 Hero (boven aan de pagina)
Beheerd via `Page Content` → slug = `home`. Vul `title`, `subtitle`, `intro` in.

### 2.2 Welkomst- en missieblok
Beheerd via `Page Sections` → type = `body` met `page_slug = home`. Zie de bestaande secties in Directus voor het patroon.

### 2.3 Hadieth van de dag
Zie [sectie 5](#5-hadieth-van-de-dag-beheren-homepage).

### 2.4 Campagneblok
Maximaal 2 donatiecampagnes worden op de homepage getoond. Beheerd door:
- Op elke gewenste campagne: `show_on_homepage = aan`
- In `Site Settings`: `homepage_campaigns_title` en `homepage_campaigns_subtitle` voor de blok-titels

Zie [sectie 3](#3-donatiecampagnes-beheren).

### 2.5 Activiteiten op homepage
De homepage toont de eerstvolgende activiteiten automatisch. Geen instelling nodig — zorg gewoon dat je activiteiten `status=published` zijn met een toekomstige `start_date`.

### 2.6 Wanneer wordt iets zichtbaar?

| Wat je wijzigt | Hoe zichtbaar maken |
|---|---|
| Tekst, datum, afbeelding, boolean | Pagina **refreshen** in browser (Ctrl+F5 of Cmd+R) |
| TV-route | Kan tot 5 minuten duren — TV ververst zichzelf |

Zie ook bestaande `CMS_BEHEER.md` voor diepere homepage-uitleg.

---

## 3. Donatiecampagnes beheren

### 3.1 Een campagne aanmaken

1. Directus → **Donation Campaigns** → klik **+**
2. Vul in:
   - **title** — bv. "Renovatie gebedsruimte"
   - **slug** — automatisch vanuit titel (bv. `renovatie-gebedsruimte`)
   - **description** — uitgebreide tekst over de campagne
   - **short_text** — korte tekst voor in lijstjes (max ~2 zinnen)
   - **image** — campagne-afbeelding
3. **Bedragen — in euro's, niet centen**:
   - **goal_amount_eur** — bijvoorbeeld `5000` betekent €5.000
   - **manual_raised_amount_eur** — bedrag dat je handmatig wilt optellen (contante donaties, bankoverschrijvingen die niet via Stripe gaan). Bijvoorbeeld `250.50` voor €250,50
   - **manual_monthly_donor_count** — aantal vaste donateurs die je handmatig wilt meetellen (naast de Stripe-abonnementen)
4. **Toggles**:
   - **show_progress** — toon voortgangsbalk op de campagne-detailpagina
   - **show_on_homepage** — toon op homepage (max 2 campagnes tegelijk; bij meer wint `featured` aan, dan `sort` laag)
   - **show_on_tv** — toon als slide op `/gebedstijden/tv` (met QR-code naar `/doneren?campaign=<slug>`)
   - **progress_default_open** — bij meerdere actieve campagnes: bepaalt welke voortgangsbalk standaard openklapt op `/doneren`
   - **featured** — sterretje "uitgelicht" in lijstjes
5. **Betalingsinstellingen** (alleen bij eerste keer of als Stripe wijzigt):
   - **use_stripe_payment_link** — meestal aan
   - **stripe_payment_link_url** — wordt door technische beheerder ingevuld
6. **Status**: zet op `published` wanneer alles klopt

### 3.2 Wat NIET invullen

- ❌ **Persoonsgegevens in manual_raised_note** — dit veld is bedoeld voor opmerkingen over het bedrag (bv. "incl. €100 contant op 17-03 van anonieme weldoener"), **niet** voor namen of contactgegevens

> 📝 **Update mei 2026**: de oude cent-velden (`goal_amount`, `goal_amount_display`, `raised_amount`, `raised_amount_display`) zijn in delivery 57 helemaal uit Directus verwijderd. Je ziet ze niet meer in het formulier — gebruik uitsluitend `goal_amount_eur` (in euro's) en `manual_raised_amount_eur` (in euro's). Geen actie nodig voor bestaande campagnes — alles loopt al via euro-velden.

### 3.3 Wat verschijnt wanneer?

| Doel | Velden om te zetten |
|---|---|
| Campagne live op `/doneren` | `status=published` |
| Campagne op homepage | `status=published` + `show_on_homepage=aan` |
| Campagne op TV | `status=published` + `show_on_tv=aan` + `tv_show_donation_campaign=aan` in Site Settings |
| Voortgangsbalk zichtbaar | `show_progress=aan` + `goal_amount_eur > 0` |

### 3.4 Voortgang berekening
De website berekent voortgang automatisch:

```
opgehaald = (alle geslaagde Stripe-donaties op deze campagne) + manual_raised_amount_eur
maandelijkse donateurs = (Stripe-abonnementen) + manual_monthly_donor_count
```

Stripe-bedragen komen automatisch binnen via webhooks. Jij vult alleen de **handmatige** correcties in.

---

## 4. TV-scherm beheren

De TV-route is `/gebedstijden/tv` — bedoeld voor het scherm in de moskee.

### 4.1 Wat toont de TV?

In rotatie:
1. **Gebedstijden** (altijd zichtbaar, leidende slide)
2. **Hadieth-series-slide** — als er een actieve serie is (zie [sectie 6](#6-hadieth-series-beheren-tv))
3. **Donatiecampagne + QR-code** — als een campagne `show_on_tv=aan` heeft
4. **Activiteit** — als een activiteit `show_on_tv=aan` heeft
5. **TV-mededelingen** (`tv_announcements`) — algemene aankondigingen, herinneringen, events, donatie-tekst

### 4.2 Hadieth-content op TV — drie bronnen

> ⚠️ Dit is het punt waar beheerders vaak verwarren.

| Bron | Doel | Wanneer gebruiken |
|---|---|---|
| **hadieth_series** | Hoofdroute voor hadieth-content op TV (sinds delivery 56) | Voor geplande series — Djoemoe'ah, Ramadhaan, of een doorlopende algemene serie. Aanbevolen. |
| **tv_announcements** met `type=hadith` | Legacy fallback | Werkt nog, maar wordt automatisch verborgen op TV zodra een hadieth-serie actief is. **Gebruik bij voorkeur hadieth_series.** |
| **daily_hadiths** | Hadieth van de dag op de **homepage**, niet TV | Apart van TV. Beheert het "Hadieth van de dag"-blok op de hoofdpagina van de website. |

### 4.3 Donatiecampagne op TV zetten — checklist

1. Open de gewenste campagne in `Donation Campaigns`
2. **show_on_tv** = aan
3. (Optioneel) **show_progress** = aan als je doelbedrag en voortgang op TV wilt tonen
4. **status** = published
5. Ga naar `Site Settings` → controleer **tv_show_donation_campaign** = aan
6. Wacht max 5 minuten — TV ververst zichzelf
7. Test: pak je telefoon, scan de QR-code → moet naar `/doneren?campaign=<slug>` gaan

### 4.4 Activiteit op TV zetten — checklist

1. Open de gewenste activiteit in `Activities`
2. **show_on_tv** = aan
3. **status** = published
4. **start_date** = vandaag of in de toekomst (verlopen activiteiten worden automatisch overgeslagen)
5. Ga naar `Site Settings` → zet **tv_show_next_activity** = aan (eenmalig, geldt voor alle activiteiten met `show_on_tv=aan`)
6. (Optioneel) Pas **tv_activity_lookahead_days** aan: 7 dagen is standaard, 0 = altijd tonen

**Let op**: het veld in Site Settings heet `tv_show_next_activity` om historische redenen — sinds de correctie betekent het "toon op TV de activiteit waar de beheerder dat zelf voor aanvinkt". Bij meerdere activiteiten met `show_on_tv=aan` wint de eerstvolgende op datum.

### 4.5 TV-mededelingen (algemeen)

In `TV Announcements` maak je losse mededelingen. Types:
- **announcement** — algemene mededeling
- **reminder** — herinnering
- **event** — eenmalig evenement
- **donation** — donatie-aanmoediging
- **hadith** — legacy, gebruik liever hadieth_series

Velden:
- **title** + **body** (voor non-hadith)
- **arabic_text** + **translation** + **source** + **grade** (voor hadith — als je dit type toch gebruikt)
- **display_from** / **display_until** — tijdvenster waarin de mededeling op TV verschijnt
- **show_on_tv** = aan
- **active** = aan
- **status** = published

### 4.6 Iets verschijnt niet op TV — wat te doen?

Controleer in deze volgorde:

1. **Status** = published?
2. **active** = aan? (waar relevant)
3. **show_on_tv** = aan? (op de campagne / activiteit / mededeling)
4. **Master-toggle** in Site Settings aan? (`tv_show_donation_campaign` / `tv_show_next_activity`)
5. **display_from / display_until** binnen tijdvenster? (bij TV-mededelingen)
6. Wacht maximaal **5 minuten** — TV ververst zich op een interval
7. Browser-cache leeg: open `/gebedstijden/tv` opnieuw in een **incognito-venster** om te testen

---

## 5. Hadieth van de dag beheren (homepage)

> Dit is NIET hetzelfde als TV-hadieth-series. Dit blok staat op de **homepage**.

### 5.1 Een hadieth toevoegen

1. Directus → **Daily Hadiths** → klik **+**
2. Vul in:
   - **title** — werktitel voor admin (op de homepage staat altijd "Hadieth van de dag", deze title zie je alleen zelf)
   - **arabic_text** — Arabische tekst (RTL)
   - **translation_nl** — Nederlandse vertaling. **VERPLICHT** — zonder vertaling rendert de homepage niets.
   - **source** — bv. `Sahih Al-Bukhari 1`
   - **grade** — bv. `Sahih`, `Hasan` (mag leeg blijven)
   - **explanation_short** — korte uitleg (1-3 zinnen, optioneel)
   - **sort** — lager = eerder in rotatie
3. **status** = published
4. **active** = aan

### 5.2 Rotatie hoe werkt het?

De homepage toont **één hadieth per dag** uit alle `published + active` items. Iedereen ziet vandaag dezelfde hadieth — morgen de volgende. Volgorde op `sort`.

### 5.3 Force_show — een specifieke hadieth altijd tonen

Als je tijdelijk één hadieth altijd wilt tonen (bv. tijdens Ramadhaan):
- Zet **force_show** = aan op die ene hadieth
- (Optioneel) **force_show_until** = einddatum

Bij meerdere `force_show=aan` wint de laagste `sort`.

### 5.4 Verschil met TV-route

| | `daily_hadiths` | `hadieth_series` |
|---|---|---|
| Doel | Homepage | TV-route |
| Bestand op website | / | /gebedstijden/tv |
| Beheert wie | Ahadieth beheerder of Content beheerder | Ahadieth beheerder |
| Rotatie | Eén per dag automatisch | Eén per dag per actieve serie |

Apart, niet overlappend. Wat je hier zet, verschijnt niet op TV.

---

## 6. Hadieth-series beheren (TV)

Dit is de **hoofdroute** voor hadieth-content op `/gebedstijden/tv` sinds delivery 56.

### 6.1 Concept

Een **serie** is een verzameling ahadieth met een gemeenschappelijk thema (bv. "Djoemoe'ah", "Ramadhaan", "Sadaqah", "Ouders", "Algemene ahadieth"). Per serie bepaal je WANNEER hij actief is via **schedule_type**. Bij overlap wint de hoogste **priority**.

### 6.2 Een nieuwe serie aanmaken

1. Directus → **Hadieth Series** → klik **+**
2. Vul in:
   - **title** — bv. `Sadaqah`, `Ouders`, `Eid`
   - **slug** — kleine letters, koppeltekens, bv. `sadaqah` (moet uniek zijn)
   - **description** — interne notitie (niet zichtbaar op TV)
   - **priority** — getal. Hoger wint bij overlap:
     - `0` voor algemene serie
     - `50` voor wekelijkse specials (Djoemoe'ah)
     - `100` voor jaarlijkse (Ramadhaan, Dhoel-Hijjah)
   - **schedule_type** — kies één:
     - `always` — altijd actief
     - `date_range` — vul `start_date` + `end_date`
     - `weekly_window` — vul `weekday_start`, `start_prayer`, `weekday_end`, `end_prayer`
     - `hijri_month` — vul `hijri_month` (1-12)
3. Eerste maal: **status=draft**, **active=uit**, **show_on_tv=uit** zodat je items kunt toevoegen
4. Sla op → ga via M2O naar **Items** → voeg items toe (zie 6.3)
5. Wanneer klaar: **status=published**, **active=aan**, **show_on_tv=aan**

### 6.3 Items toevoegen aan een serie

Per item:
- **arabic_text** — optioneel
- **translation_nl** — **verplicht** (zonder vertaling overgeslagen op TV)
- **source** — bv. `Sahih Muslim 1031`
- **authenticity** — bv. `Sahih`, `Hasan`
- **explanation_short** — optioneel, niet getoond op TV (alleen voor admin)
- **sort** — 1, 2, 3 ... bepaalt dagelijkse rotatievolgorde
- **status** = published
- **active** = aan

### 6.4 Schedule-types uitgelegd

#### `always`
Altijd actief. Geschikt voor een algemene doorlopende serie ("Algemene ahadieth") die de basislaag vormt. Verliest van specials op specifieke momenten.

#### `date_range`
Tussen `start_date` (NL-datum) en `end_date` (NL-datum), beide inclusief. Geschikt voor Ramadhaan, Eid, of een geplande themaweek.

**Voorbeeld Ramadhaan 2026**: start_date = `2026-02-17`, end_date = `2026-03-19`.

#### `weekly_window` — voorbeeld Djoemoe'ah

Wekelijks venster van `weekday_start @ start_prayer` tot `weekday_end @ end_prayer`.

**Weekdag-conventie**: `0=zondag, 1=maandag, 2=dinsdag, 3=woensdag, 4=donderdag, 5=vrijdag, 6=zaterdag`.

**Djoemoe'ah-configuratie** (voorbeeld-template meegestuurd in seed):
- weekday_start = `4` (donderdag)
- start_prayer = `maghrib`
- weekday_end = `5` (vrijdag)
- end_prayer = `maghrib`

→ Serie wordt actief op **donderdagavond na Maghreb** en stopt **vrijdagavond bij Maghreb**.

Andere voorbeelden:
- Vrijdag-Fajr tot vrijdag-Dhoehr: ws=5, sp=fajr, we=5, ep=dhoehr (zelfde-dag venster)
- Donderdag-Maghreb tot zondag-Fajr: ws=4, sp=maghrib, we=0, ep=fajr (cross-day met tussendagen)

#### `hijri_month`
Wanneer huidige Hijri-maand gelijk is aan `hijri_month` (1-12). Gebruikt de native Umm Al-Qura kalender.

**Let op**: lokale maanwaarneming kan 1 dag afwijken van Umm Al-Qura. Voor Ramadhaan is `date_range` daarom vaak **betrouwbaarder** — je kunt de start/end zelf bepalen op basis van de moskee-aankondiging.

Als je toch `hijri_month` wilt gebruiken: de technische beheerder kan een handmatige correctie zetten in `hijri_date_overrides`.

### 6.5 Welke serie wint bij meerdere actieve?

Voorbeeld op een vrijdag tijdens Ramadhaan, beide actief:
- Algemene ahadieth (priority 0) — actief (altijd)
- Djoemoe'ah (priority 50) — actief (weekly_window)
- Ramadhaan (priority 100) — actief (date_range)

→ **Ramadhaan wint** (hoogste priority).

Op een zaterdag buiten Ramadhaan: alleen Algemene ahadieth → Algemene wint.

### 6.6 Templates die al klaarstaan

In seed 56 worden twee templates aangemaakt — beide **draft + inactief**:
1. **Algemene ahadieth** — schedule_type=always, priority=0
2. **Djoemoe'ah** — schedule_type=weekly_window, priority=50, do@maghrib → vr@maghrib

Open de templates, bewerk content + bron, voeg eigen items toe, en activeer wanneer je tevreden bent. Voorbeeld-items staan ook op draft/inactief.

---

## 7. Activiteiten beheren

### 7.1 Een activiteit aanmaken

1. Directus → **Activities** → klik **+**
2. Vul in:
   - **title** — bv. `Lezing Imam Hossam`
   - **slug** — URL-deel, automatisch vanuit titel
   - **description** — rich-text. **Niet te lang** maken — TV toont alleen plain text (gestript van HTML)
   - **start_date** — datum + tijd. Belangrijk!
   - **end_date** — optioneel
   - **location** — bv. `Hoofdgebedsruimte`
   - **image** — banner-afbeelding
3. **Status** = published

### 7.2 Inschrijvingen aanzetten

- **registration_enabled** = aan
- Optioneel: **max_registrations** (limiet) + **show_registration_limit** (toon "nog X plekken")
- Optioneel: **target_gender** (heren / dames / gemengd)
- Optioneel: **require_age** + **minimum_age**
- Velden voor het formulier zelf (`registration_intro_title`, `registration_button_text`, ...) — laat standaard tenzij je een speciaal bericht wilt

### 7.3 Terugkerende activiteiten

Voor wekelijkse of maandelijkse activiteiten:
- **is_recurring** = aan
- **recurrence_type** = `weekly` of `monthly`
- **recurrence_interval** = 1 (elke periode), 2 (elke 2 periodes), etc.
- **recurrence_until** = einddatum (max 6 maanden vooruit standaard)
- (Optioneel) **recurrence_weekday** voor weekly — overschrijft de weekdag van `start_date`

### 7.4 Op TV tonen

- **show_on_tv** = aan
- + Site Settings → `tv_show_next_activity` = aan

Zie ook [sectie 4.4](#44-activiteit-op-tv-zetten--checklist).

### 7.5 QR-check-in NIET breken

De QR-check-in voor activiteiten gebruikt deze collectie. **Niet verwijderen** van inschrijvingen of velden zoals `check_in_*`. Vraag de technische beheerder als je iets met check-in wilt aanpassen.

### 7.6 Rich-text op TV

Op de TV-route wordt de `description` automatisch geschoond:
- HTML-tags worden verwijderd (`<h1>`, `<hr>`, etc.)
- HTML-entities worden gedecodeerd (`&nbsp;` → spatie, `&#39;` → apostrof)
- Witruimte wordt opgeschoond
- Maximaal ~4 regels getoond

Dus je hoeft niet bang te zijn dat opmaak doorlekt — maar **houd de tekst kort en helder** zodat er iets nuttigs op TV verschijnt.

### 7.7 Inschrijving automatisch sluiten

Sinds delivery 58 kun je per activiteit instellen wanneer het inschrijfformulier automatisch dichtgaat. Veld: **`registration_closes_at`** (datum + tijd).

| Wat | Wat gebeurt er |
|---|---|
| Leeg + eenmalige activiteit | Inschrijving sluit automatisch bij `start_date` (begin activiteit) |
| Leeg + terugkerende activiteit | Inschrijving blijft open totdat je dit veld expliciet vult |
| Gevuld (datum + tijd) | Inschrijving sluit op het ingevulde moment |

Wanneer gesloten: bezoeker ziet "Inschrijving is gesloten" in plaats van het formulier. Bestaande inschrijvingen blijven gewoon zichtbaar in Directus — je kunt ze nog steeds bewerken, inchecken en exporteren.

Als activiteit **én** vol **én** gesloten is, wint de "vol"-melding ("Deze activiteit zit vol").

### 7.8 Deelnemers exporteren via Directus

> ⚠️ Persoonsgegevens (naam, e-mail, telefoon) zijn alleen via **Directus admin** te exporteren door bevoegde beheerders. Er is bewust géén publieke export-link, geen aparte exportcode en geen download via de check-in pagina.

**Stap-voor-stap:**

1. Log in op Directus admin: https://cms.al-ghofraan.nl
2. Linkermenu → **Registrations**
3. Filter de lijst op de juiste activiteit:
   - Klik op de filter-knop (trechter-icoon) bovenaan
   - Voeg filter toe: `source_collection` = `activities`
   - Voeg filter toe: `source_title` bevat de titel van je activiteit (of filter op `source_id` als je dat liever hebt)
   - (Eventueel) `status` = `confirmed` als je alleen bevestigde inschrijvingen wilt
4. Bovenaan rechts: klik op het **drie-puntjes menu (⋮)** → **Export**
5. Kies CSV (of JSON, XML, JSON) — voor Excel: **CSV** met scheidingsteken `;` (semicolon)
6. Download het bestand

**Welke kolommen zie je standaard?**

Vanaf seed 59 zijn de standaardkolommen voor de Registrations-lijst:
- Naam, E-mail, Telefoon
- Bron-titel (welke activiteit), Type (activity/education), Status
- Ingecheckt op (check-in tijdstip)
- Aangemeld op

Je kunt je eigen lijst-layout opslaan via Directus' standaard layout-functie (rechtsboven → "Layout Options"). Bijvoorbeeld extra kolommen toevoegen voor leeftijd, geslacht of opmerkingen.

**Privacy:**

- Deze gegevens zijn **vertrouwelijk**. Deel ze alleen met andere bevoegde organisatoren.
- Verwijder oude exports van je computer/telefoon na de activiteit.
- Plak geen deelnemerslijst in WhatsApp of e-mail naar onbevoegden.
- De **Activiteiten beheerder** rol ziet alleen registraties met `type=activity` — onderwijs-inschrijvingen blijven afgeschermd.

**Welke rollen kunnen exporteren?**

- **Activiteiten beheerder** — alle inschrijvingen met `type=activity`
- **Onderwijs beheerder** — alle inschrijvingen met `type=education`
- **Administrator** — alle inschrijvingen

Bezit je geen Directus-account? Vraag de hoofdbeheerder om de juiste rol toegewezen te krijgen.

---

## 8. Onderwijs beheren

### 8.1 Onderwijsprogramma's

1. Directus → **Education Programs** → klik **+**
2. Belangrijke velden:
   - **title**, **slug**, **description**, **image**
   - **category** — kies een bestaande `education_categories` (zie 8.2)
   - **target_group** — vrije tekst, bv. "Jongens 8-12 jaar", "Vrouwen alle leeftijden"
   - **start_date**, **end_date** — periode (optioneel)
   - **schedule_text** — wanneer en hoe vaak, bv. "Elke zaterdag 14:00-16:00"
   - **price_text** — bv. "Gratis", "€10 per maand"
   - **teacher_name** — docent
   - **registration_enabled** — schakelaar voor inschrijfformulier
3. **status** = published

### 8.2 Categorieën

Maak categorieën aan in **Education Categories** met velden zoals `name`, `slug`, `sort`. Programma's koppelen via het `category` veld.

### 8.3 Verschil `target_group` vs `category`

- **category** is structureel (Koran-onderwijs, Arabisch, Aqida, Fiqh, etc.) — gebruikt voor filtering op `/onderwijs`
- **target_group** is beschrijvend ("voor jongens 8-12") — vrije tekst die bezoekers helpt kiezen

### 8.4 Inschrijvingen

Inschrijvingen op een onderwijsprogramma komen binnen in de `registrations` collectie met `type=education`. Onderwijs beheerder kan deze lezen en aanpassen (status).

---

## 9. Video's beheren

### 9.1 Een video toevoegen

1. Directus → **Videos** → klik **+**
2. Belangrijke velden:
   - **title**, **description**
   - **youtube_url** — volledige YouTube-link (bv. `https://www.youtube.com/watch?v=...`)
   - **category** — kies een `video_categories`
   - **thumbnail** — optioneel; als leeg, gebruikt website automatische YouTube-thumbnail
   - **sort** — volgorde in overzicht
   - **featured** — uitgelicht
3. **status** = published

### 9.2 Embed-instellingen

Op het video-overzicht `/videos` worden video's getoond als **kaarten met thumbnails**, niet als ingebedde players. Pas wanneer je doorklikt naar `/videos/[slug]` opent de YouTube-embed.

Dit is bewust om de overzichts-pagina snel te houden en geen tracking te laten van YouTube op het overzicht.

### 9.3 YouTube-import (indien aanwezig)

Als de import-functie is ingesteld (delivery 43), kun je een YouTube-channel ID instellen in Site Settings → `youtube_channel_id`. De technische beheerder regelt het importmechanisme.

---

## 10. Contact en Maps beheren

### 10.1 Contactgegevens

In **Site Settings**:
- **whatsapp_number** — internationaal formaat (`31612345678` of `+31 6 12345678`)
- **whatsapp_default_message** — voorgevulde tekst bij klik op WhatsApp-knop
- **contact_email**, **contact_phone** — algemene adresgegevens (indien aanwezig)

### 10.2 Google Maps

In **Site Settings** (sinds delivery 44):
- **maps_embed_url** — Google Maps embed-URL voor `/contact`
- **maps_directions_url** — link naar routebeschrijving
- **address_line_1**, **address_line_2**, **postal_code**, **city** — adres

**Veilige URL's**: gebruik alleen Google Maps embed-URLs die je zelf via Google Maps "Share → Embed map" hebt gekopieerd. Geen URL's uit dubieuze bronnen.

### 10.3 Contact-onderwerpen

In **Contact Subjects** kun je de dropdown-opties beheren in het contactformulier. Bijvoorbeeld: "Algemene vraag", "Inschrijving", "Donatie", "Pers".

Per subject:
- **label** — wat de bezoeker ziet
- **value** — interne identificatie (lowercase, geen spaties)
- **sort** — volgorde
- **status** = published

---

## 11. Gebedstijden en TV-instellingen

### 11.1 Gebedstijden CSV

Gebedstijden komen uit een CSV-bestand in **Prayer Time Files**. Dit is **niet** iets dat je willekeurig wilt aanpassen — een verkeerde CSV breekt de hele gebedstijden-weergave.

- Eén bestand per jaar (bv. "Den Haag 2026")
- Eén bestand kan `active=aan` zijn
- Velden: `title`, `year`, `file`, `active`, `uploaded_at`

**Vraag altijd de technische beheerder** wanneer je een nieuw CSV-bestand wilt uploaden.

### 11.2 Hijri-overrides

In **Hijri Date Overrides** kun je lokale maanwaarneming corrigeren (bv. "vandaag is 1 Ramadhaan volgens onze moskee"):
- **gregorian_date** — kalenderdatum
- **hijri_day** + **hijri_month** + **hijri_year**
- **active** = aan

### 11.3 Kalender-highlights

In **Prayer Calendar Highlights** beheer je gemarkeerde dagen op `/gebedstijden/overzicht`:
- **title** — bv. "Eid al-Fitr", "Aankomst Ramadhaan"
- **date** — datum
- **show_on_calendar** = aan voor zichtbaarheid

### 11.4 TV-instellingen

In **Site Settings**:
- **tv_prayer_slide_seconds** — duur gebedstijden-slide (default 25)
- **tv_item_slide_seconds** — duur andere slides (default 15)
- **tv_refresh_minutes** — hoe vaak server-data ververst op TV (default 5)
- **tv_show_donation_campaign**, **tv_show_next_activity**, **tv_activity_lookahead_days** — zie [sectie 4](#4-tv-scherm-beheren)

### 11.5 GEEN analytics op TV-route

De TV-route `/gebedstijden/tv` laadt **bewust geen Google Analytics**. Niet aanpassen — het is een ontwerp-keuze om privacy van bezoekers in de moskee te beschermen.

---

## 12. Rollen en rechten

Elke beheerder krijgt één rol toegewezen door de hoofdbeheerder. Hier wat elke rol mag:

| Rol | Mag beheren | Mag NIET |
|---|---|---|
| **Content beheerder** | Pagina's, artikelen, video's, activiteiten, FAQ, navigatie, secties, daily_hadiths | Site Settings (alleen read), donaties, gebedstijden CSV |
| **TV beheerder** | TV-mededelingen (`tv_announcements`) | Hadieth-series (apart), donaties, activiteiten, site settings |
| **Ahadieth beheerder** | Hadieth-series + items, daily_hadiths, tv_announcements van type `hadith` | **Site Settings (bewust uitgesloten)**, andere TV-mededeling-types |
| **Activiteiten beheerder** | Activiteiten + activity-inschrijvingen | Onderwijsprogramma's, donaties |
| **Onderwijs beheerder** | Onderwijsprogramma's + onderwijs-inschrijvingen | Activiteiten, donaties |
| **Donatie beheerder** | Donatiecampagnes, lees donaties (read-only) | Donaties wijzigen (Stripe is bron van waarheid), activiteiten |
| **Contact beheerder** | Contactberichten + contact-onderwerpen | Site settings, activiteiten, donaties |
| **Gebedstijden beheerder** | Gebedstijden-CSV-bestanden + Hijri-overrides | Andere collecties |
| **Vacature beheerder** | Vacatures | Andere collecties |

**Algemene regels per rol**:
- Geen rol heeft `delete`-rechten (uitgezonderd hoofdbeheerder/administrator)
- Geen rol behalve Content beheerder kan `site_settings` schrijven
- Geen rol heeft public write-rechten (formulieren posten alleen via beveiligde API-routes)

Een rol kan **meerdere rollen niet combineren** in Directus standaard — je hebt één rol per gebruiker. Als je meerdere taken hebt (bv. activiteiten EN donaties), vraag de hoofdbeheerder om een gecombineerde aangepaste rol of een tweede account.

---

## 13. Veelgemaakte fouten

### 13.1 Per ongeluk in draft laten staan
**Symptoom**: "Ik heb een artikel gemaakt maar zie 'm niet op de website."
**Oplossing**: Zet **status** op `published`.

### 13.2 `show_on_tv` of `show_on_homepage` vergeten
**Symptoom**: "Mijn campagne staat published maar verschijnt niet op TV / homepage."
**Oplossing**: Check de toggles per stuk content + de master-toggle in Site Settings.

### 13.3 `show_progress` vergeten op een campagne
**Symptoom**: "De voortgangsbalk verschijnt niet."
**Oplossing**: Op de campagne: **show_progress** = aan. En **goal_amount_eur** moet > 0 zijn.

### 13.4 Bedrag in verkeerde eenheid invullen
**Symptoom**: "Ik tikte 500 voor €5,00 maar er staat €500 op de site."
**Oorzaak**: `goal_amount_eur` is in **euro's**, niet centen. €500 = `500`, niet `50000`. Centiemen-decimalen mogen wel: `12.50` voor €12,50.

### 13.5 HTML/rich-text te lang maken
**Symptoom**: "Op de TV-route staat een halve roman, het loopt over."
**Oplossing**: Beschrijvingen op activiteiten kort houden — TV toont maximaal ~4 regels.

### 13.6 Meerdere campagnes met `show_on_tv=aan`
**Symptoom**: "Twee campagnes verschijnen om beurten, dat is verwarrend."
**Oplossing**: Maar **één** campagne tegelijk `show_on_tv=aan` zetten. Bij meerdere wint volgorde: featured → laagste sort → titel ASC, maar duidelijker is om bewust één te kiezen.

### 13.7 Inschrijfformulier sluit onverwacht
**Symptoom**: "Mensen kunnen zich niet meer inschrijven terwijl de activiteit pas volgende week is."
**Oorzaak A**: `registration_closes_at` staat in het verleden. Verwijder de waarde of zet 'm later.
**Oorzaak B**: Eenmalige activiteit met `start_date` in het verleden — die sluit automatisch. Zet `registration_closes_at` in de toekomst als je inschrijving toch open wilt houden.
**Oorzaak C**: `max_registrations` is bereikt — dan staat er "Deze activiteit zit vol".

### 13.8 Persoonsgegevens in interne notities
**Symptoom**: namen of e-mails in `manual_raised_note` of `description`.
**Oplossing**: Verwijder die gegevens direct. Gebruik alleen bedragen/datums/contexten in interne notitie-velden.

### 13.9 Verkeerde priority op series
**Symptoom**: "Mijn Ramadhaan-serie wordt niet getoond, terwijl Algemene wel actief is."
**Oplossing**: Ramadhaan moet **hogere** priority hebben dan Algemene. Zet Ramadhaan op `100` en Algemene op `0`. Bij gelijke priority wint slug ASC — niet voorspelbaar voor beheerders.

### 13.10 Slug aanpassen na publicatie
**Symptoom**: "Mijn artikel kan niet meer gevonden worden via de oude link, en Google heeft 'm verloren."
**Oplossing**: **Slug nooit wijzigen** na publicatie. Wijzig alleen vóór de eerste keer dat status=published is.

### 13.11 Wachtwoord te kort bij invite-acceptatie
**Symptoom**: "Ik kreeg een invite-mail, klikte op Join Directus, koos een wachtwoord, en kreeg een onduidelijke foutmelding."
**Oorzaak**: De Directus `Auth Password Policy` staat op `Weak — Minimum 8 Characters`. Een wachtwoord korter dan 8 tekens wordt geweigerd, maar de foutmelding is generiek ("Couldn't save user" of vergelijkbaar) en zegt niet wat de eis is.
**Oplossing**: Kies een wachtwoord van **minimaal 8 tekens**. Een combinatie van letters, cijfers en symbolen wordt aangeraden. Je krijgt geen specifieke fout te zien — gewoon opnieuw proberen met langer wachtwoord werkt.

---

## 14. Checklists per onderdeel

Knip-en-plak deze checklists als je iets nieuws live wilt zetten.

### 14.1 ✅ Campagne op homepage tonen
1. status = **published**
2. show_on_homepage = **aan**
3. show_progress = **aan** (als voortgang zichtbaar moet zijn)
4. goal_amount_eur ingevuld (in euro's, niet cents)
5. Optioneel: manual_raised_amount_eur voor handmatige toevoegingen
6. Tekst (`description`, `short_text`) controleren
7. Image upload + alt-text
8. Refresh homepage → controleren

### 14.2 ✅ Campagne op TV tonen
1. status = **published**
2. show_on_tv = **aan** (op de campagne zelf)
3. show_progress = **aan** (optioneel, voor voortgangsbalk)
4. goal_amount_eur ingevuld
5. Site Settings → tv_show_donation_campaign = **aan**
6. Wacht 5 min, controleer `/gebedstijden/tv`
7. Telefoon: scan QR-code → moet naar `/doneren?campaign=<slug>` gaan

### 14.3 ✅ Activiteit op TV tonen
1. status = **published**
2. show_on_tv = **aan** (op de activiteit)
3. start_date = vandaag of later (verlopen wordt automatisch overgeslagen)
4. Site Settings → tv_show_next_activity = **aan**
5. Wacht 5 min, controleer `/gebedstijden/tv`

### 14.4 ✅ Hadieth van de dag (homepage)
1. translation_nl = ingevuld (verplicht!)
2. status = **published**
3. active = **aan**
4. arabic_text (optioneel)
5. source + grade (optioneel maar aanbevolen)
6. sort = lager voor eerdere rotatie
7. Optioneel: force_show + force_show_until voor tijdelijke vaste hadieth

### 14.5 ✅ Djoemoe'ah-serie op TV
1. Open serie "Djoemoe'ah" (template uit seed)
2. Voeg items toe (translation_nl verplicht)
3. Per item: status = published, active = aan
4. Serie: schedule_type = **weekly_window**
5. weekday_start = **4** (donderdag), start_prayer = **maghrib**
6. weekday_end = **5** (vrijdag), end_prayer = **maghrib**
7. priority = **50** (boven Algemene serie)
8. Serie status = **published**, active = **aan**, show_on_tv = **aan**
9. Controleer op donderdag NA Maghreb of de slide verschijnt

### 14.6 ✅ Ramadhaan-serie op TV (via date_range)
1. Maak nieuwe serie aan: title = "Ramadhaan 2026" (of jaar)
2. slug = `ramadhaan-2026`
3. schedule_type = **date_range**
4. start_date = bv. `2026-02-17`
5. end_date = bv. `2026-03-19`
6. priority = **100**
7. Voeg 10-30 items toe (één per dag voor 30-dagen-rotatie)
8. Per item status = published, active = aan
9. Serie status = published, active = aan, show_on_tv = aan

### 14.7 ✅ Algemene ahadieth-serie (achtergrond)
1. Open template "Algemene ahadieth" uit seed
2. schedule_type = **always**
3. priority = **0**
4. Voeg veel items toe (rotatie cycleert dagelijks)
5. Activeer serie + items
6. Speciale series met hogere priority (Djoemoe'ah, Ramadhaan) winnen automatisch wanneer actief

### 14.8 ✅ TV-mededeling toevoegen
1. type = announcement / reminder / event / donation (vermijd 'hadith' — gebruik hadieth_series)
2. title + body invullen
3. show_on_tv = aan
4. active = aan
5. status = published
6. Optioneel: display_from / display_until voor tijdvenster

### 14.9 ✅ Nieuwe activiteit met inschrijvingen
1. title + slug + description + start_date (+ end_date)
2. location
3. image (banner)
4. registration_enabled = aan
5. (Optioneel) max_registrations + show_registration_limit
6. (Optioneel) target_gender + require_age + minimum_age
7. status = published
8. Test inschrijfformulier in een incognito-venster

### 14.10 ✅ Nieuwe pagina maken
Zie de uitgebreide handleiding in `CMS_BEHEER.md` sectie 1 — daar staat de complete uitleg voor nieuwe pagina-content + navigation.

---

## 15. Hulp nodig?

- **Technische beheerder**: voor schema-wijzigingen, permissions, deployment, of gebedstijden-CSV
- **Hoofdbeheerder**: voor toegang, wachtwoord-resets, nieuwe gebruikers, rolwijzigingen

Als je twijfelt: **eerst draft maken, dan vragen**. Een artikel in draft kan geen kwaad. Een per ongeluk verkeerd gepubliceerde campagne wel.

> 📖 Voor meer technische uitleg: zie ook `CMS_BEHEER.md`, `CONTENT_MODEL.md`, `USER_MANAGEMENT.md` in de docs-map.
> 📋 Voor de meest recente audit van wat ongebruikt of legacy is: zie `DIRECTUS_AUDIT_2026-05.md`.

---

**Versie**: juni 2026 — invite-flow productie. Inclusief delivery 57 (legacy donation_campaigns cleanup), 58 (registration_closes_at), 58c (custom export rollback), 59 (registrations admin-list), en Directus invite-flow uitrol.
