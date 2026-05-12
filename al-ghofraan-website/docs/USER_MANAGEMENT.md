# Gebruikers en rechten in Directus — beheerdershandleiding

Deze handleiding beschrijft hoe je als admin een gebruiker aanmaakt en
rechten geeft in Directus 11, op basis van de 7 afdelingsrollen die in
seed-stap 25 zijn aangemaakt. Geen code nodig — alles gebeurt via de
Directus admin UI.

> **Wanneer gebruik je dit document?**
> Bij het aanmaken van een nieuwe beheerder, het uitbreiden van rechten
> van een bestaande beheerder, of als iemand "ik zie collectie X niet"
> meldt. De troubleshooting-sectie onderaan staat klaar voor dat soort
> vragen.

---

## 1. Concepten (kort)

Directus 11 werkt met vier lagen. Even achter elkaar:

**Gebruiker (user)** — een persoon met inloggegevens. Iemand met een
e-mailadres die kan inloggen op Directus.

**Rol (role)** — een organisatorisch label. Zegt *wie* iemand is in
het project: "Content beheerder", "Activiteiten beheerder", etc. Een
gebruiker heeft **één hoofdrol**. De rol op zichzelf doet niets — hij
verwijst naar een of meerdere policies.

**Policy** — een bundel rechten. Zegt *wat* je mag doen: "mag artikelen
maken/lezen/bewerken, mag site-instellingen lezen, mag inschrijvingen
met type=education bekijken". Policies zijn de eigenlijke
toegangsregels. Eén policy kan aan meerdere rollen én aan meerdere
gebruikers tegelijk gekoppeld zijn.

**Permission** — een individuele regel binnen een policy. Bv. "create
op collectie articles". Hier kom je als beheerder zelden direct aan;
je werkt op het policy-niveau.

### Hoe ze samenwerken

```
Gebruiker  →  heeft 1 hoofdrol      →  die rol heeft 1+ policies
           →  + eventueel extra policies rechtstreeks gekoppeld
```

**Belangrijk principe:** rechten zijn **additief**. Heeft een gebruiker
twee policies waarin elk een andere collectie staat? Dan kan hij beide
beheren. Policies trekken nooit rechten af van elkaar.

### Onze huidige inrichting (uit seed-stap 25)

Er zijn 7 afdelingsrollen, elk met een gelijknamige policy:

| Rol | Policy | Wat de policy doet |
|---|---|---|
| Content beheerder | Content beheerder | Pagina's, artikelen, videos, activiteiten, FAQ, navigatie, secties beheren |
| Onderwijs beheerder | Onderwijs beheerder | Onderwijsprogramma's + onderwijsinschrijvingen (filter `type=education`) |
| Activiteiten beheerder | Activiteiten beheerder | Activiteiten + activiteit-inschrijvingen (filter `type=activity`) |
| Contact beheerder | Contact beheerder | Contactberichten en contact-onderwerpen |
| Donatie beheerder | Donatie beheerder | Donatiecampagnes beheren, donaties **read-only** |
| TV beheerder | TV beheerder | TV-aankondigingen |
| Gebedstijden beheerder | Gebedstijden beheerder | Gebedstijden-bestanden en handmatige Hijri-overrides |

Elke policy heeft `app_access: true` (mag inloggen op de admin UI) en
`admin_access: false` (geen admin-rechten). **Geen** delete-rechten op
data-collecties — beheerders archiveren via status-velden.

Daarnaast bestaan vanuit Directus:

- **Administrator** rol — volledige toegang. Niet aanraken.
- **Public** rol/policy — voor anonieme bezoekers (de website zelf
  haalt content op via deze rol). Niet aanraken.

---

## 2. Workflow A — Nieuwe gebruiker aanmaken met één rol

**Wanneer:** iemand komt erbij die maar één afdeling beheert.

1. Log in als admin op Directus.
2. Klik linksonder op het **tandwiel** (Settings).
3. Ga naar **Access Control** → **Users**.
4. Klik rechtsboven op **Create User** (+).
5. Vul in:
   - **First name** + **Last name**
   - **Email** (dit wordt het inlog-adres)
   - **Password** (laat de gebruiker dit later zelf wijzigen)
   - **Role** — kies de juiste afdelingsrol uit de dropdown
     (bv. "Content beheerder")
   - **Status** — laat op **Active** staan
6. Klik op **Save** (✓ rechtsboven).
7. Stuur het inlog-adres + tijdelijk wachtwoord naar de gebruiker via
   een veilig kanaal (geen e-mail met beide tegelijk).

Klaar. Bij eerstvolgende login ziet de gebruiker alleen zijn eigen
collecties.

---

## 3. Workflow B — Bestaande gebruiker rechten uitbreiden met extra policy

**Wanneer:** iemand heeft al een hoofdrol, en je wilt er één afdeling
bij geven zonder zijn hoofdrol te wijzigen.

> **Achtergrond:** Directus 11 staat toe om policies **direct** aan
> een gebruiker te hangen, los van zijn rol. Rechten zijn additief —
> de gebruiker krijgt erbij wat in de extra policy staat zonder iets
> van zijn bestaande rechten kwijt te raken.

1. Settings → **Access Control** → **Users**.
2. Klik op de gebruiker die je wilt uitbreiden.
3. Scrol naar het blok **Policies** (onder Role).
4. Klik op **Add Existing** (of het +-icoon in dat blok).
5. Kies de extra policy uit de lijst (bv. "Contact beheerder").
6. Klik op **Save** (✓ rechtsboven).

De gebruiker hoeft niet opnieuw in te loggen — bij zijn volgende
pagina-refresh ziet hij de extra collecties verschijnen in het menu.

### Wanneer rol wijzigen vs. extra policy toevoegen?

| Situatie | Aanpak |
|---|---|
| Iemand wisselt van afdeling | Rol wijzigen |
| Iemand krijgt er een tweede afdeling bij | Extra policy toevoegen |
| Iemand vervangt collega tijdelijk | Extra policy toevoegen (later verwijderen) |
| Iemand doet permanent meerdere afdelingen | Extra policy toevoegen (overzichtelijker dan een nieuwe hybride rol maken) |

---

## 4. Workflow C — Gebruiker meerdere beheergebieden geven

**Wanneer:** iemand doet permanent twee of meer afdelingen tegelijk.

Aanpak: één **hoofdrol** + één of meer **extra policies** rechtstreeks
op de user.

Voorbeeld: Khadija beheert zowel onderwijs als activiteiten.

1. Maak (of bewerk) de gebruiker zoals in workflow A.
2. Bij **Role**: kies "Onderwijs beheerder" (de "zwaarste" of meest
   centrale taak; persoonlijke keuze, het maakt voor de rechten niet
   uit welke je als hoofdrol kiest).
3. Klik op **Save**.
4. Open de gebruiker opnieuw, of scrol naar **Policies**.
5. **Add Existing** → "Activiteiten beheerder".
6. **Save**.

Khadija ziet nu in haar menu:
- onderwijsprogramma's,
- activiteiten,
- onderwijsinschrijvingen (gefilterd op `type=education`),
- activiteit-inschrijvingen (gefilterd op `type=activity`),
- + de standaard read-toegang tot `site_settings` en bestanden.

> **Geen nieuwe rol nodig.** Je hoeft geen "Onderwijs + Activiteiten
> beheerder" rol aan te maken. Dat zou dubbel werk zijn en raakt snel
> onoverzichtelijk als er drie of vier combinaties bestaan. Beter:
> één hoofdrol + extra policies.

---

## 5. Voorbeelden uit de praktijk

### Voorbeeld 1 — Content + Activiteiten

Iemand maakt nieuwsbrieven (artikelen, video's, FAQ) **en** beheert het
activiteitenoverzicht.

- **Hoofdrol:** Content beheerder
- **Extra policies:** (geen — zie hieronder)

> ⚠️ **Let op — overlap.** De policy "Content beheerder" omvat al
> `activities`. De policy "Activiteiten beheerder" omvat ook
> `activities` plus de gefilterde toegang tot `registrations` met
> `type=activity`. Als de gebruiker ook activiteit-**inschrijvingen**
> moet kunnen inzien/bewerken, voeg dan "Activiteiten beheerder" als
> extra policy toe. Als hij alleen activiteiten zelf hoeft te beheren
> (zonder inschrijvingen-tab), volstaat "Content beheerder" alleen.

| Wil je dat de gebruiker… | Hoofdrol | Extra policy |
|---|---|---|
| …alleen activiteiten beheert (geen inschrijvingen) | Content beheerder | (geen) |
| …ook inschrijvingen voor activiteiten bekijkt/bewerkt | Content beheerder | + Activiteiten beheerder |

### Voorbeeld 2 — Onderwijs + Contact

Iemand verwerkt onderwijsinschrijvingen **en** beantwoordt
contactberichten.

- **Hoofdrol:** Onderwijs beheerder
- **Extra policy:** Contact beheerder

Resultaat: onderwijsprogramma's beheren, onderwijsinschrijvingen
(`type=education`) afhandelen, contactberichten en contact-onderwerpen
beheren.

### Voorbeeld 3 — TV + Gebedstijden

Iemand onderhoudt het mededelingenscherm in de moskee plus het
gebedstijden-bestand voor de website.

- **Hoofdrol:** TV beheerder
- **Extra policy:** Gebedstijden beheerder

Resultaat: TV-aankondigingen beheren, gebedstijden-bestanden uploaden
en activeren, handmatige Hijri-overrides toevoegen indien nodig.

### Voorbeeld 4 — Donatie beheer (read-only donaties + campagnes beheren)

Dit is **één rol**, geen combinatie. Belangrijk om te documenteren
omdat de scope-verdeling vaak verwarrend is:

- **Hoofdrol:** Donatie beheerder
- **Extra policies:** (geen)

Resultaat: donatiecampagnes (`donation_campaigns`) volledig
beheren — create, read, update. Donaties (`donations`)
**alleen lezen** — geen create/update/delete. Dat is bewust: financiële
records komen automatisch binnen via Stripe webhooks, en handmatige
mutatie op die data zou de boekhouding doorbreken.

---

## 6. Testen met een testgebruiker

Voor elke nieuwe rol-combinatie raden we aan om eerst met een
testgebruiker te verifiëren dat de juiste rechten actief zijn, voordat
je een echte collega aan de configuratie blootstelt.

### Stap-voor-stap

1. Maak een gebruiker `test-rolnaam@example.com` met de gewenste
   rol + policies (volg workflow A/B/C).
2. Open een **incognito venster** (of een andere browser).
3. Log in als de testgebruiker.
4. Controleer:
   - **Welk menu zie je links?** Alleen de collecties die je verwacht?
   - Klik op één collectie waar de gebruiker rechten op heeft.
     Werkt **Create**, **Update**? Probeer iets aan te maken en op
     te slaan.
   - **Probeer een collectie te openen waar de gebruiker GEEN
     rechten op heeft** door direct naar de URL te navigeren
     (bv. `/admin/content/donations` voor een Content beheerder).
     Verwachting: foutmelding of redirect, geen data.
   - Op een collectie zonder delete-rechten: probeer een item te
     verwijderen. De **Delete-knop hoort er niet te zijn** (of
     gefaald op API-niveau).
   - Test het filter op `registrations` (alleen relevant voor
     Onderwijs / Activiteiten beheerders): de gebruiker ziet alleen
     inschrijvingen met `type=education` resp. `type=activity`.
5. Log uit als testgebruiker, ga terug naar je admin-sessie.
6. **Belangrijk:** de testgebruiker hoeft niet verwijderd te worden —
   markeer hem op **Status: Suspended** als je hem niet meer nodig
   hebt. Verwijderen is niet nodig en werkt soms verwarrend
   (referenties uit logs naar een verwijderde user).

### Mini-checklist per rol

| Rol | Verwacht in menu | Verwacht NIET in menu |
|---|---|---|
| Content beheerder | Pagina's, artikelen, videos, activiteiten, FAQ | donaties, gebedstijden-bestanden, TV-aankondigingen, contactberichten |
| Onderwijs beheerder | Onderwijsprogramma's, inschrijvingen (alleen onderwijs) | activiteiten, donaties |
| Activiteiten beheerder | Activiteiten, inschrijvingen (alleen activiteiten) | onderwijsprogramma's, donaties |
| Contact beheerder | Contactberichten, contact-onderwerpen | Verder geen content/donatie/TV |
| Donatie beheerder | Donatiecampagnes (volledig), donaties (alleen lezen) | Geen edit-knoppen op donaties |
| TV beheerder | TV-aankondigingen | Geen page-content |
| Gebedstijden beheerder | Gebedstijden-bestanden, Hijri-overrides | Geen page-content, geen activiteiten |

---

## 7. Wat NIET doen

### ⛔ Administrator rol niet aanpassen

De Administrator rol heeft `admin_access: true` en omzeilt alle
permission-checks. Als je daar iets in wijzigt, breek je mogelijk je
eigen toegang. **Laat staan.** Nieuwe admins maak je door een
gebruiker de bestaande Administrator rol toe te wijzen.

### ⛔ Public rol/policy niet aanpassen

De Public policy bepaalt wat anonieme bezoekers (= de website zelf)
van het systeem mogen zien. Hij wordt beheerd door seed-stap 02. Als
je hem handmatig wijzigt:

- bij de volgende `npm run seed` worden jouw wijzigingen mogelijk
  weer overschreven (seed-stap 02 doet `upsert`);
- óf je opent per ongeluk een collectie die niet publiek mag zijn
  (`registrations`, `donations`, `contact_messages`).

Wil je dat een bepaalde collectie publiek leesbaar wordt? Dat hoort
in seed-stap 02, niet handmatig in de UI.

### ⛔ Geen delete-rechten toevoegen voor gewone beheerders

Dit is een bewuste keuze uit seed-stap 25 (zie commentaar bovenaan
het bestand). Beheerders archiveren via `status: archived` of
vergelijkbare velden — geen echte data-verlies, en altijd
herstelbaar. Als iemand delete-rechten vraagt, vraag dan eerst wat
het onderliggende probleem is. Meestal is het te lossen met
status-archief.

### ⛔ Seed-managed policies niet handmatig "fixen"

De 7 afdelingspolicies worden bij elke `npm run seed` opnieuw
gecontroleerd (`ensurePermission` in stap 25). Als je in de admin UI
handmatig een permission toevoegt of wijzigt op één van deze
policies, kunnen de volgende dingen gebeuren:

- De seed bemerkt het verschil en patcht jouw wijziging weer naar de
  geseede staat (`fields` en `permissions` worden ge-PATCHt zodra ze
  afwijken).
- Toegevoegde permissions die **niet** in de seed staan blijven wél
  staan (seed verwijdert nooit iets).

**Veilige route:** als een hele afdeling structureel meer rechten
nodig heeft, breid de definitie uit in `25-roles-policies.mjs` en
laat het via een delivery lopen. Dat is reproduceerbaar en
overdraagbaar.

**Wel veilig handmatig:**
- Gebruikers aanmaken/verwijderen/suspenden.
- Policies aan gebruikers koppelen via de Policies-tab op user-niveau
  (deze koppelingen worden door de seed niet aangeraakt).
- Eigen nieuwe policies maken voor incidentele use-cases — alleen
  niet met dezelfde naam als een seed-policy.

---

## 8. Troubleshooting

### "De gebruiker ziet de admin app niet" / kan niet inloggen

**Mogelijke oorzaken:**

1. **Rol heeft geen `app_access`.** Alle 7 afdelingspolicies hebben
   dit aanstaan, dus dit zou niet moeten gebeuren — tenzij iemand
   handmatig een gebruiker aan een rol zonder app-access heeft
   gehangen. Check: Settings → Access Control → Policies → klik op
   de policy → "App Access" toggle moet aan staan.
2. **User status is niet "Active".** Settings → Access Control →
   Users → gebruiker openen → Status checken. "Suspended" /
   "Draft" / "Invited" geven verschillende blocks.
3. **Wachtwoord verkeerd of expired.** Reset het wachtwoord vanuit
   admin (User openen → Reset Password).

### "De gebruiker ziet een collectie niet in het menu"

**Eerste check:** heeft die gebruiker **read**-permission op die
collectie? Een collectie verschijnt pas in het menu als je hem mag
lezen.

1. Open de user.
2. Onder **Role** + onder **Policies**: open elke policy in een
   nieuw tabblad.
3. Op elke policy: scrol naar de **Permissions**-tabel en kijk of de
   gewenste collectie er een groene/oranje vinkje heeft bij **Read**.
4. Geen vinkje? Voeg de juiste policy toe via workflow B, of
   controleer of de policy zelf de juiste permission heeft (zie
   "Wat niet doen" hierboven over seed-managed policies).

**Tweede check:** **Frontpage / Module Bar visibility.** De Directus
admin verbergt sommige collecties standaard. Klik op het tandwieltje
bovenin de zijbalk → "Show hidden collections" / "Edit module bar".
Dit is een persoonlijke UI-instelling per gebruiker, geen
permission-issue.

### "De gebruiker kan een item niet opslaan"

Letterlijke foutmelding bekijken (Directus toont meestal "you don't
have permission to..." met de actie erbij).

- **"create" geweigerd** → policy mist create-permission op die
  collectie. Voor onze afdelingsrollen: standaard heeft `manage`
  altijd create. Heb je een filtered-access policy gegeven (zoals
  Onderwijs/Activiteiten beheerder op `registrations`)? Die hebben
  bewust **geen** create-recht — inschrijvingen komen via het
  publieke formulier binnen.
- **"update" geweigerd op een specifiek veld** → policy heeft
  `fields: ["*"]` voor manage-collecties, dus zou niet moeten
  voorkomen. Check of een ander veld een required-validatie schendt
  (Directus toont dat soms als "update geweigerd").
- **"delete" geweigerd** → klopt. Beheerders hebben bewust geen
  delete-rechten. Vraag de gebruiker te archiveren via een
  status-veld.
- **Save-knop is grijs / niet klikbaar** → dat is meestal geen
  permission, maar een required-veld dat leeg is, of een
  validatie-fout elders in het formulier. Scrol naar boven; Directus
  toont meestal welke veld(en) een fout hebben.

### "Mijn collega ziet andere kolommen / sortering dan ik"

Dat is geen permission-issue maar een **Directus preset**. Elke
gebruiker bouwt zelf zijn voorkeur op (welke kolommen tonen, hoe te
sorteren, welk filter standaard). Deze staan in `directus_presets`
en zijn per-user.

- **Gewenste gedeelde layout?** Admin kan een **Global Preset** maken
  via Settings → Presets & Bookmarks → "+ Create Preset" → kies
  "Bookmark for: All users" of "Bookmark for: [rol]". Dat ziet elke
  gebruiker met die rol als suggestie maar overschrijft zijn eigen
  voorkeur niet.
- Seed-stap 26 (`admin-list-layouts`) zet alleen tabular presets als
  niet-conflicterende defaults. Persoonlijke presets blijven leidend.

### "Ik wil een gebruiker tijdelijk uitschakelen"

Verwijder hem **niet**. Zet zijn Status op **Suspended**. Dat
verwijdert de inlog-mogelijkheid zonder zijn referenties uit logs of
zijn audit-trail kwijt te raken. Later weer activeren = Status terug
op Active.

### "Ik twijfel of een wijziging veilig is — hoe rol ik terug?"

Voor user/policy-koppelingen via de admin UI:
- Wijziging op user-niveau: gewoon weer ontkoppelen via dezelfde
  Policies-tab op de user.
- Wijziging op policy-niveau (níét aangeraden): waarschijnlijk wordt
  het door de volgende `npm run seed` weer hersteld naar de geseede
  staat — maar reken er niet op dat dit instant gebeurt.

Voor twijfel over een rolwijziging: maak eerst een testgebruiker met
dezelfde combinatie (zie sectie 6) en bevestig dat het werkt zoals
verwacht.

---

## Samenvatting

| Taak | Aanpak |
|---|---|
| Nieuwe beheerder met 1 afdeling | Workflow A — user aanmaken + rol kiezen |
| Beheerder krijgt er 1 afdeling bij | Workflow B — extra policy toevoegen op user |
| Beheerder doet permanent 2+ afdelingen | Workflow C — hoofdrol + extra policies |
| Beheerder wisselt van afdeling | Rol op user wijzigen |
| Beheerder vertrekt tijdelijk | Status: Suspended |
| Iets afwijkends nodig | Eerst testen met testgebruiker; bij twijfel vraag stellen voor je seed-policies aanraakt |

Voor alle structurele wijzigingen op rol-niveau (extra collecties
voor een hele afdeling, etc.): pas seed-stap 25 aan via een
delivery, niet handmatig in de UI.
