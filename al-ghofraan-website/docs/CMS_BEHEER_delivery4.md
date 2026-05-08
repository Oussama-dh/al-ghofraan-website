# CMS_BEHEER — Sectie 30 · Onderwijs-flow toggles (delivery 4)

> Dit document is een aanvulling op `docs/CMS_BEHEER.md`. Voeg de
> inhoud hieronder toe als sectie **30** onderaan dat document. Wanneer
> `docs/CMS_BEHEER.md` nog niet bestaat in jouw checkout (de oudere
> bundel had hem niet), kun je dit bestand naar die naam hernoemen
> en als startpunt gebruiken.

## 30. Onderwijs-flow toggles (delivery 4)

Sinds delivery 4 kun je per onderwijsprogramma in Directus drie nieuwe
boolean-velden zetten op `education_programs`. Ze regelen hoe de
inschrijfflow zich gedraagt op `/onderwijs/<slug>`.

### 30.1 Overzichtspagina vs detailpagina

`/onderwijs` is **uitsluitend een overzichtspagina** met een grid van
alle gepubliceerde programma's (cards). Bezoekers kiezen daar zelf een
programma; er wordt nooit automatisch een programma geopend.

`/onderwijs/<slug>` is de detailpagina van één programma — daar staat
informatie en (afhankelijk van de toggles hieronder) het
inschrijfformulier of een knop om het te openen.

| Veld in education_programs                | Type    | Default | Effect                                                                 |
| ----------------------------------------- | ------- | ------- | ---------------------------------------------------------------------- |
| `show_registration_form_immediately`      | boolean | `false` | Bij `false` toont de pagina eerst alleen info + knop "Inschrijven". Bij `true` staat het formulier direct onderaan. |
| `require_terms_acceptance`                | boolean | `true`  | Bij `true` is er een verplichte voorwaarden-checkbox. Bij `false` verdwijnt die. Privacy-checkbox blijft altijd. |
| `allow_multiple_students`                 | boolean | `true`  | Bij `true` mogen meerdere kinderen tegelijk worden ingeschreven. Bij `false` exact één. |

> Defaults gelden ook voor bestaande programma's na de migratie. Geen
> bestaande inschrijvingen of programma-content wordt overschreven.

### 30.2 `show_registration_form_immediately`

Standaard staat dit veld op **uit**. De bezoeker ziet dan eerst alleen
de programma-informatie en een blok met de knop "Inschrijven". Pas
nadat hij/zij op die knop klikt verschijnt het formulier op de pagina,
en wordt er gescrolld naar het ankerpunt (`#inschrijven`).

Zet je dit veld op **aan**, dan staat het formulier direct zichtbaar
onder de uitleg, zoals voor delivery 4. De CTA-balk met de knop boven
het formulier blijft zichtbaar als anker-link.

### 30.3 `require_terms_acceptance`

Standaard **aan**. Het formulier toont dan een tweede checkbox met de
tekst uit `site_settings.registration_terms_label` (en optioneel een
link naar `site_settings.registration_terms_url`). De server-side API
weigert de inschrijving wanneer deze checkbox niet is aangevinkt.

Zet het veld op **uit** wanneer een specifiek programma geen
voorwaarden heeft. De checkbox verdwijnt dan, en de API negeert het
`terms_accepted`-veld voor dat programma. De **privacy**-checkbox
blijft hoe dan ook verplicht.

### 30.4 `allow_multiple_students`

Standaard **aan**. Het formulier toont dan onderaan de lijst studenten
de knop "+ Voeg nog een student toe", waarmee maximaal 20 studenten
tegelijk kunnen worden ingediend (gedeelde
`registration_group_id`, eigen `student_number` per student).

Zet je dit veld op **uit**, dan verdwijnt de knop en wordt er server-
side strikt geweigerd dat de payload meer dan één student bevat. Elke
student krijgt nog steeds een eigen `student_number` — alleen is het
maximum dan 1 per inschrijving.

### 30.5 Praktische voorbeelden

- **Cursus voor volwassenen, één persoon per inschrijving, geen
  voorwaardendocument**:
  `show_registration_form_immediately = true`,
  `require_terms_acceptance = false`,
  `allow_multiple_students = false`.
- **Kinder-onderwijs voor gezinnen, met huisregels die ouders moeten
  lezen**: alle drie de defaults laten staan (vraag eerst om klik op
  "Inschrijven", verplicht voorwaarden, sta meerdere kinderen toe).
- **Open dag of gratis info-avond, snel inschrijven**:
  `show_registration_form_immediately = true`, voorwaarden en
  multi-student naar wens.

### 30.6 Activiteit-inschrijvingen

De toggles in deze sectie hebben **geen effect op `/agenda/<slug>`**.
Activiteit-inschrijvingen blijven werken zoals voorheen: één persoon
per inschrijving, geen voorwaarden-checkbox, telefoon optioneel.

---

## Backend-validatie samenvatting

`/api/inschrijven` haalt het programma op vóór het schrijven en
controleert in deze volgorde:

1. `registration_enabled` — anders 403.
2. `target_gender` versus opgegeven geslacht — anders 403.
3. `require_terms_acceptance` versus `terms_accepted` — bij mismatch 400.
4. `allow_multiple_students` versus `students.length` — bij mismatch 400.
5. Telefoon exact 10 cijfers, e-mail valide, naam ≥ 2 tekens, etc.

Pas wanneer alles OK is worden er records aangemaakt — ook bij meerdere
studenten in één indiening. Studentnummers worden vooraf gegenereerd.
