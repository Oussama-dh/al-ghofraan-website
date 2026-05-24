# Directus Audit — Mei 2026

> **Doel** — Inventariseer welke Directus collecties en velden actief
> gebruikt zijn, welke legacy maar nog nodig als fallback, en welke
> kandidaten zijn om later (in een aparte cleanup-delivery) te verbergen
> of verwijderen. **Geen wijzigingen in deze delivery** — alleen rapport.

---

## 📌 Update — na delivery 57, 58, 58c en 59 (eind mei 2026)

Sinds dit auditrapport zijn enkele cleanups en verbeteringen uitgevoerd. **Het originele rapport blijft hieronder staan als historisch document**; dit update-blok beschrijft de huidige feitelijke staat.

### Wat is gewijzigd t.o.v. originele audit

**Delivery 57 — donation_campaigns legacy cent-velden volledig verwijderd**

De volgende velden uit categorie B (toen "legacy maar nog nodig als fallback") zijn nu **volledig verwijderd uit Directus, types, code en publieke whitelists**:

- `goal_amount` (cents)
- `goal_amount_display` (string)
- `raised_amount` (cents)
- `raised_amount_display` (string)

Frontend-fallbacks (`c.goal_amount ?? 0` in `app/page.tsx` en `app/doneren/page.tsx`) zijn vervangen door directe `goal_amount_eur`-leesoperaties. Klant bevestigde geen waardevolle data → cleanup uitgevoerd met veiligheidsnet (`FORCE_LEGACY_CLEANUP=true` env-var). DonationForm dropdown toont nu auto-format uit `goal_amount_eur` i.p.v. handmatig `goal_amount_display`-veld.

**Delivery 58 — activities.registration_closes_at toegevoegd**

Nieuw veld op `activities` voor automatische sluiting van inschrijfformulier. Server-side gate in `/api/inschrijven`, frontend-melding "Inschrijving is gesloten" op `/agenda/[slug]`. Voor recurring blijft het open tenzij expliciet ingesteld; voor eenmalige fallback naar `start_date`. `isFull` wint boven `isClosed`.

Field-notes op `registration_enabled` en `max_registrations` ook bijgewerkt om de samenhang uit te leggen.

**Delivery 58c — custom exports flow teruggedraaid (hotfix)**

Een eerdere poging om custom CSV-exports te bouwen via `/check-in/organizer/exports` is teruggedraaid wegens security-concern (zelfde code als check-in). Alternatief: deelnemers exporteren gebeurt nu via **Directus admin standaard export** (⋮ → Export) door bevoegde beheerders (Activiteiten beheerder / Administrator).

Geen aparte exportcode toegevoegd. Geen aparte export-cookie. Geen custom routes.

**Delivery 59 — registrations admin-list verbeterd**

Admin-list preset op `registrations` is aangepast naar voor-beide-flows relevante kolommen: naam, e-mail, telefoon, bron-titel, type, status, ingecheckt op, aangemeld op. Onderwijs-specifieke kolommen (`student_number`, `parent_*`) blijven beschikbaar via eigen layout-keuze.

### Bijgewerkte categorie-overzicht

| Cat. | Betekenis | Status mei 2026 (na 57–59) |
|---|---|---|
| A | Zeker actief gebruikt | ongewijzigd grootste deel |
| B | Legacy maar nog nodig als fallback | **6 velden (donation_campaigns) → 0** na delivery 57. Site_settings homepage CTA (7+5 velden) blijft B want page_sections is nog steeds on hold |
| C | Waarschijnlijk ongebruikt | 0 |
| D | Kandidaat om te verbergen | 0 |
| E | Kandidaat om later te verwijderen | 0 (de 4 die hier in zaten zijn nu in delivery 57 verwijderd) |

### Bijgewerkte conclusie

Het systeem is verder opgeschoond. Alle resterende legacy velden (`homepage_cta_*` en `homepage_whatsapp_cta_*` in site_settings) zijn nog steeds **actieve fallback** zolang stap 40 (page_sections) on-hold blijft, en horen daarom niet in een verwijder-categorie thuis.

De originele scope van het auditrapport blijft daarmee inhoudelijk overeind: er is geen veld dat vandaag nog veilig verwijderd kan worden zonder code-aanpassing.

**Stripe-aggregatie privacy** (vermeld in 4.4): nog steeds correct geïmplementeerd via `getCampaignProgress` met whitelist-velden — geen donor-PII naar publieke endpoints. `manual_raised_note` blijft uitgesloten van alle drie publieke whitelists (seed 02 + 52 + 54).

### Beheerder-export via Directus

Sinds delivery 58c is de aanbevolen workflow voor deelnemerslijsten:

1. Directus admin → Registrations
2. Filter op `source_collection=activities` en evt. `source_title`
3. ⋮ → Export → CSV met `;` als scheidingsteken (Excel NL-locale)

Zie `BEHEER_HANDLEIDING.md` sectie 7.8 voor de volledige stappen.

---

> 📜 *Het originele auditrapport hieronder is bewaard als historisch document. Lees het in context van bovenstaande update.*

---

## 1. Methode

Dit rapport is opgesteld door systematisch te zoeken in drie bronnen:

1. **Seed-bestanden** (`scripts/seed/steps/*.mjs`) — wat is aangemaakt, wat is verborgen, wat heeft `[LEGACY]`-notes
2. **Frontend-code** (`lib/`, `app/`, `components/`) — welke velden worden gelezen, in queries, in props, in render-paden
3. **Permissions** (seed 02 + 52 + 54 + role-seeds) — welke velden zijn publiek leesbaar, welke zijn whitelist-gefilterd

Voor elk veld is gekeken naar:
- Wordt het opgehaald in een `fields`-array van `lib/directus.ts`?
- Wordt het gerenderd in een TSX-component?
- Komt het voor in API-routes, mail-templates, sitemap, of analytics?
- Staat het in de publieke whitelist?
- Heeft het een `[LEGACY]`-note in admin (via seed)?

---

## 2. Categorieën — overzicht

| Cat. | Betekenis | Aantal velden geïdentificeerd |
|---|---|---|
| A | Zeker actief gebruikt | grootste deel — geen actie nodig |
| B | Legacy maar nog nodig als fallback | 6 velden (donation_campaigns) + 7 (site_settings homepage CTA) |
| C | Waarschijnlijk ongebruikt — eerst verifiëren | 0 vandaag |
| D | Kandidaat om te verbergen (latere cleanup) | 0 buiten al gehide velden |
| E | Kandidaat om later te verwijderen | **geen** — alles in B blijft fallback |

Conclusie kort: **er is op dit moment geen veld dat veilig verwijderd kan worden.** Alle "legacy" velden zijn nog actieve fallback-paden. Cleanup is een aparte oefening voor later — niet vandaag.

---

## A. Zeker actief gebruikt

> Geen actie. Dit is de kern van het content-model.

### A.1 `daily_hadiths`
- **Doel**: Hadieth-van-de-dag-blok op homepage (sinds delivery 45)
- **Velden in gebruik**: alle (`title`, `arabic_text`, `translation_nl`, `source`, `grade`, `explanation_short`, `sort`, `force_show`, `force_show_until`, `status`, `active`, `display_date`)
- **Gerenderd in**: `lib/directus.ts:getDailyHadiths` + homepage hadith-blok
- **Permissions**: public read met filter `status=published AND active=true`
- **Verwarring-risico**: ⚠️ Beheerders moeten verschil weten met `tv_announcements.type=hadith` (TV-fallback) én `hadieth_series_items` (TV-hoofdroute). Zie BEHEER_HANDLEIDING.md sectie 5–6.

### A.2 `hadieth_series` + `hadieth_series_items` (NIEUW — delivery 56)
- **Doel**: beheerbare hadieth-series voor TV — `/gebedstijden/tv`
- **Schedule-types**: `always`, `date_range`, `weekly_window`, `hijri_month`
- **Templates meegestuurd in seed (draft, inactief)**: "Algemene ahadieth" (priority 0, always) + "Djoemoe'ah" (priority 50, weekly_window)
- **Gerenderd in**: `lib/hadiethSeries.ts:getTvHadiethSeries` → `PrayerTimesTvDisplay:SeriesSlide`
- **Permissions**: NIET publiek — server-side admin-token fetch. Ahadieth beheerder krijgt CRU (geen delete)
- **Verwarring-risico**: gemiddeld — drie hadieth-bronnen tegelijk in het systeem (daily_hadiths, tv_announcements.type=hadith, hadieth_series). Wel: Delivery B filtert automatisch `tv_announcements.type=hadith` uit TV-playlist zodra een serie actief is.

### A.3 `donation_campaigns` — nieuwe euro-velden
- `goal_amount_eur` (decimal, euro's)
- `manual_raised_amount_eur` (decimal, euro's)
- `manual_monthly_donor_count` (integer)
- `manual_raised_note` (text — **interne notitie, BEWUST uitgesloten van publieke whitelist**)
- `progress_default_open` (boolean)
- `show_on_homepage` (boolean)
- `show_on_tv` (boolean — sinds delivery 54)
- `show_progress` (boolean)
- `short_text` (text)
- **Permissions**: whitelist in 3 sync-files (seed 02, 52, 54) — `manual_raised_note` blijft uitgesloten. ✅ Verified.

### A.4 `activities`
- Alle velden actief (`title`, `slug`, `description`, `start_date`, `end_date`, `location`, `image`, `featured`, `registration_enabled`, `target_gender`, `is_recurring*`, `minimum_age`, `teacher`, `show_teacher`, `show_on_tv` (delivery 55), `max_registrations`, `show_registration_limit`, `require_age`, registration_intro_*, ...)
- **Permissions**: public read voor `status=published`. Geen lek van `registration_intro_*` want die zijn meant-to-be-public.
- **Verwarring-risico**: laag — uitgebreid maar elk veld heeft een duidelijk doel.

### A.5 `site_settings` — TV-instellingen (delivery 54 + 55)
- `tv_show_donation_campaign` (boolean, default true)
- `tv_show_next_activity` (boolean, default false — naam historisch, betekent nu "show manually-picked activity")
- `tv_activity_lookahead_days` (integer, default 7)
- `tv_prayer_slide_seconds`, `tv_item_slide_seconds`, `tv_refresh_minutes`
- **Gerenderd in**: `app/gebedstijden/tv/page.tsx`
- **Verwarring-risico**: laag — field-notes zijn herzien in delivery 55

### A.6 `tv_announcements` — non-hadith types
- Types: `announcement`, `reminder`, `event`, `donation` — actief gebruikt op TV als slides
- Hadith-type: zie sectie B.4
- **Permissions**: public read voor `status=published`. Alle velden public (geen interne velden).

### A.7 Andere actief gebruikte collecties (kort)
- `articles`, `videos`, `vacancies`, `education_programs`, `education_categories`, `article_categories`, `video_categories`
- `page_content`, `navigation_items`, `faq_items`, `icon_settings`
- `prayer_time_files`, `hijri_date_overrides`, `prayer_calendar_highlights`
- `contact_subjects`, `contact_messages` (write-only public via API), `registrations` (write-only public via API), `donations` (write-only public via Stripe webhook)
- `directus_files` (assets)

---

## B. Legacy maar nog nodig als fallback

> **Geen actie nu.** Deze velden zijn al gehide in admin (waar relevant) maar het bijbehorende code-pad leest ze nog als veilige fallback. Pas verwijderen wanneer **alle code-paden migreren** naar de nieuwe velden — dat is geen mini-delivery.

### B.1 `donation_campaigns.goal_amount` (cents)
- **Status**: hidden in admin sinds delivery 51 (`[LEGACY — niet meer gebruiken]`)
- **Gelezen in code**: `app/page.tsx:189` en `app/doneren/page.tsx:92` als fallback:
  ```ts
  const goalCents =
    typeof c.goal_amount_eur === "number" && c.goal_amount_eur > 0
      ? Math.round(c.goal_amount_eur * 100)
      : (c.goal_amount ?? 0);
  ```
- **Waarom blijven**: oude campagnes die alleen `goal_amount` (cents) gevuld hebben blijven correct getoond. Migratie zou betekenen: voor elke campagne met `goal_amount > 0 AND goal_amount_eur IS NULL` → `goal_amount_eur = goal_amount / 100`. Dat is een data-migratie, niet bij deze delivery.
- **In CAMPAIGN_FIELDS-whitelist**: ja (lib/directus.ts) — nodig om fallback te laten werken
- **In publieke whitelist**: ja (seed 02/52/54)
- **Advies**: laten staan tot een aparte "donation-campaigns-cents-cleanup" delivery die data + code + permissions tegelijk migreert.

### B.2 `donation_campaigns.goal_amount_display` (string)
- **Status**: hidden + `[LEGACY]`-note sinds delivery 51
- **Gelezen in code**: `components/donation/DonationForm.tsx:313`:
  ```tsx
  {c.goal_amount_display && (
    <span>doel: {c.goal_amount_display}</span>
  )}
  ```
- **Waarom blijven**: oude campagnes die deze string handmatig gezet hebben tonen 'm nog steeds in de campagne-keuzelijst. Nieuwe campagnes vullen 'm niet meer.
- **Advies**: laten staan totdat DonationForm dit ook uit `goal_amount_eur` kan deriveren.

### B.3 `donation_campaigns.raised_amount` + `raised_amount_display`
- **Status**: hidden + `[LEGACY]`-note sinds delivery 51
- **Gelezen in code**: NEE — staan wel in CAMPAIGN_FIELDS-whitelist en publieke whitelist, maar geen code-pad leest ze
- **Waarom blijven in whitelist**: defensive — als een client direct via Directus REST ophaalt, breekt 'm niet stilletjes
- **Risico van verwijderen uit whitelist**: laag (geen frontend-impact)
- **Advies**: kandidaat voor toekomstige cleanup-delivery — verwijder uit CAMPAIGN_FIELDS + uit 3 sync-whitelists tegelijk. **Niet vandaag** om de 3-sync-discipline niet te haasten.

### B.4 `tv_announcements.type=hadith`
- **Status**: blijft bestaan als legacy/fallback sinds delivery 56 (hadieth_series)
- **Gedrag**: Bij actieve hadieth-series wordt `type=hadith` automatisch uit playlist gefilterd in `PrayerTimesTvDisplay`. Bij geen actieve serie blijft 'm zichtbaar.
- **Verwarring-risico**: hoog voor beheerders — drie hadieth-bronnen tegelijk
- **Advies**:
  - Field-note van `tv_announcements.type` updaten om legacy-status van `hadith` te documenteren (bv. "Voor hadith-content gebruik bij voorkeur Hadieth-series — type=hadith hier blijft werken als fallback")
  - **Niet vandaag** (geen seed in deze delivery), maar wel concrete kandidaat voor een mini-seed in een latere docs/notes-only delivery

### B.5 `site_settings.homepage_cta_*` (7 velden)
- `homepage_cta_enabled`, `homepage_cta_title`, `homepage_cta_description`, `homepage_cta_primary_label`, `homepage_cta_primary_url`, `homepage_cta_secondary_label`, `homepage_cta_secondary_url`
- **Status**: niet hidden, niet `[LEGACY]`-note
- **Gelezen in code**: `app/page.tsx:373-395` als fallback ná `page_sections` type=cta:
  ```tsx
  ctaSections.length > 0 ? <PageSectionsList ... /> : settings?.homepage_cta_enabled ? <CTASection ... /> : <Hardcoded fallback />
  ```
- **Waarom blijven**: page_sections (stap 40) is **on hold** — beheerders kunnen via deze site_settings velden de homepage-CTA volledig wijzigen zonder page_sections aan te raken
- **Advies**: laten staan zoals nu. Niet verbergen — actieve fallback is geen legacy.

### B.6 `site_settings.homepage_whatsapp_cta_*` (5 velden)
- `homepage_whatsapp_cta_enabled`, `_title`, `_description`, `_button_label`, `_url`
- **Identiek patroon** als B.5: fallback wanneer `page_sections` type=whatsapp_cta ontbreekt
- **Advies**: laten staan.

---

## C. Waarschijnlijk ongebruikt — eerst verifiëren

### C.1 `donation_campaigns.suggested_amounts` + `default_amount`
- **In CAMPAIGN_FIELDS-whitelist**: ja
- **Gelezen in code**: ja, in `DonationForm` voor de bedrag-knoppen
- **Conclusie**: niet C — gewoon actief (had ik eerder niet getest). Verplaats naar A.

### C.2 `tv_announcements.display_from` / `display_until`
- **Doel**: tijdvenster om aankondiging zichtbaar te maken
- **Gelezen in code**: ja, in `lib/directus.ts:getTvAnnouncements` filtert hierop
- **Conclusie**: actief, A.

**Geen velden in C op dit moment.** Alle aanvankelijke "twijfels" gaven actief gebruik.

---

## D. Kandidaat om te verbergen

**Geen velden vandaag** behalve wat al gehide is. Velden die mogelijk hidden zouden kunnen worden in een latere delivery:

### D.1 `donation_campaigns.raised_amount` + `raised_amount_display`
- Al hidden + `[LEGACY]`-note (delivery 51). Geen actie nodig.

### D.2 Update field-note van `tv_announcements.type` (kandidaat voor docs-only follow-up seed)
- Huidige note (stap 49): "Soort aankondiging — bepaalt subtiele visuele variatie..."
- Voorgestelde aanvulling: "Voor 'Hadieth'-content: gebruik bij voorkeur de Hadieth-series collectie. `type=hadith` hier blijft werken als fallback wanneer geen serie actief is."
- **Geen seed nu** — alleen in audit gedocumenteerd. Klant kan later vragen om mini-stap 57 voor field-notes.

---

## E. Kandidaat om later te verwijderen

> **Geen velden in deze categorie vandaag.** Alle "legacy" velden in B zijn nog actieve fallback. Pas verwijderen wanneer hun code-paden ook gemigreerd zijn.

Een verwijder-delivery zou ten minste deze stappen vereisen (niet vandaag uitvoeren):

1. **Data-migratie**: voor elke `donation_campaigns` rij waar `goal_amount > 0` maar `goal_amount_eur IS NULL` → vul `goal_amount_eur = goal_amount / 100`. Idem voor `raised_amount`.
2. **Code-migratie**: verwijder alle fallback-leesoperaties (`c.goal_amount ?? 0` → alleen `c.goal_amount_eur`)
3. **Permissions-migratie**: verwijder velden uit 3 sync-whitelists (seed 02, 52, 54) + CAMPAIGN_FIELDS in `lib/directus.ts`
4. **Schema-migratie**: PATCH meta `hidden=true` (al gedaan) → veld verwijderen via Directus `DELETE /fields/{collection}/{field}`
5. **TypeScript types update**: verwijder uit `types/directus.ts`
6. **Rollback-plan**: bewaar data-backup vóór verwijdering; restore mogelijk via SQL als kritiek

---

## 3. Specifieke aandachtspunten — bevindingen

### 3.1 `donation_campaigns` cent vs euro
- **Status**: gezonde dual-track met euro-velden als primair en cent-velden als fallback
- **Whitelist sync**: ✅ 3 plekken in sync (seed 02, 52, 54 + `CAMPAIGN_FIELDS` in lib/directus.ts)
- **`manual_raised_note` privacy**: ✅ uitgesloten van alle 3 publieke whitelists
- **Risico**: laag — fallback-pad is goed gemarkeerd

### 3.2 `site_settings` — TV en homepage
- **TV-velden**: helder na delivery 54+55 field-note updates
- **Homepage CTA fallback**: actief, page_sections is voorkeur maar fallback werkt
- **Maps/contact velden** (stap 44): actief

### 3.3 `page_sections` (stap 40 — on hold)
- **Status**: actief in productie, niet uitgebouwd sinds stap 40
- **Beheerder-aanbeveling**: voor nieuwe homepage-secties bestaande types (`cta`, `whatsapp_cta`, `ayah`, `hadith`) gebruiken — geen nieuwe types toevoegen zonder code-update
- **NIET aanraken** in seeds — risico op breken bestaande secties

### 3.4 `tv_announcements.type=hadith` legacy
- Functioneel correct: fallback wanneer geen hadieth-series actief is
- Cosmetisch verbeterpunt: field-note bijwerken om beheerders te informeren (zie D.2)

### 3.5 `daily_hadiths` vs `hadieth_series`
- **Verschil**: `daily_hadiths` is voor **homepage** Hadieth-van-de-dag-blok. `hadieth_series` is voor **TV-route**. Volledig gescheiden code-paden.
- **Beheerder-verwarring**: middelmatig — zie BEHEER_HANDLEIDING.md sectie 5–6 voor duidelijke uitleg.

### 3.6 UTM verwijdering — verified
- **`utm_links` collectie**: opgeruimd in stap 49 (DELETE op productie)
- **Code-referenties**: geen (alleen historische comments in stap 49)
- **Seed 48**: nooit bestaan in productie (teruggedraaid in stap 49). Bevestigd via `ls scripts/seed/steps/`.

---

## 4. Permissions-audit

### 4.1 Publieke read whitelist
- 18 collecties met public read, alle met `status=published` (of `active=true`) filter
- Eén collectie met field-level whitelist: `donation_campaigns` (sluit `manual_raised_note` uit)
- Géén collectie staat met `["*"]` open zonder filter — `directus_files` is uitzondering (assets moeten public zijn voor `<img>`-tags)

### 4.2 Whitelist-sync drift
- Geen drift gevonden. Drie sync-punten voor `donation_campaigns` velden allemaal up-to-date:
  - `lib/directus.ts:CAMPAIGN_FIELDS` (9 mentions show_on_tv)
  - `scripts/seed/steps/02-permissions.mjs:DONATION_CAMPAIGN_PUBLIC_FIELDS`
  - `scripts/seed/steps/52-donation-campaign-public-fields.mjs:DONATION_CAMPAIGN_PUBLIC_FIELDS`
  - (`scripts/seed/steps/54-tv-display-blocks.mjs:DONATION_CAMPAIGN_PUBLIC_FIELDS` voor productie-patch)

### 4.3 Rollen — sluiten goed aan op verantwoordelijkheden
- Geen rol heeft `delete` permissions (uitgezonderd administrator)
- Geen rol behalve content-beheerder heeft `site_settings` (Ahadieth-fix in stap 49 gerespecteerd)
- Geen rol heeft public-write access
- Ahadieth beheerder krijgt sinds delivery 56 CRU op `hadieth_series` en `hadieth_series_items` (geen site_settings)

### 4.4 Privacy bevindingen
- `manual_raised_note`: ✅ niet publiek leesbaar
- `donations.donor_email`, `donations.donor_name`: ✅ donations heeft geen public read
- `registrations.email`, `registrations.phone`: ✅ registrations heeft geen public read
- `contact_messages.*`: ✅ geen public read
- Donateur-totaal-aggregaties op `/doneren`: ✅ alleen `amount` veld gefetched in server-side aggregatie, géén PII

---

## 5. Lijst — velden die NOOIT verwijderd mogen worden

Deze velden zijn structureel kritiek. Verwijdering = directe productie-breuk:

### `donation_campaigns`
- `id`, `status`, `title`, `slug`, `goal_amount_eur`, `manual_raised_amount_eur`, `manual_monthly_donor_count`, `show_on_homepage`, `show_on_tv`, `featured`, `sort`, `allow_one_time`, `allow_monthly`, `use_stripe_payment_link`, `stripe_payment_link_url`, `stripe_payment_link_id`, `progress_default_open`, `show_progress`

### `site_settings`
- alle TV-velden (`tv_*`), alle homepage_cta_* en homepage_whatsapp_cta_* (fallback), `site_name`, `whatsapp_number`, `default_seo_*`, alle map-velden, alle email-velden, `registration_terms_*`

### `activities`
- `id`, `status`, `title`, `slug`, `start_date`, `description`, `show_on_tv`, alle `is_recurring*`, alle `registration_*`, `max_registrations`, `target_gender`

### `daily_hadiths`
- alle huidige velden — geen weggooi-kandidaten

### `hadieth_series` + `hadieth_series_items`
- alle huidige velden — net aangemaakt, nul kandidaten

### `tv_announcements`
- alle huidige velden — ook `type=hadith` (legacy fallback)

### Centraal
- Alle `id`, `status`, `slug`, `sort`, `created_at`, `active` velden op elke collectie

### `manual_raised_note`
- **Mag wel verwijderd worden** als beheerders het niet gebruiken, maar **mag nooit publiek leesbaar worden**. Status nu: privé, in admin alleen.

---

## 6. Voorstel — latere cleanup-delivery

Wanneer klant er klaar voor is, kan een aparte delivery deze opruim-acties bundelen:

### Cleanup-delivery scope (niet uitvoeren zonder akkoord)

**Doel**: stap-voor-stap verwijderen van cent-velden uit donation_campaigns na voltooide data-migratie.

**Fasen** (elk apart goedkeuren):
1. **Audit-uitvoering**: tel hoeveel campagnes alleen `goal_amount` (cents) hebben en geen `goal_amount_eur`
2. **Data-migratie**: voor elke campagne met cents-data → vul euro-velden, behoud cent-velden voorlopig
3. **Code-cleanup**: verwijder fallback `(c.goal_amount ?? 0)` in `app/page.tsx` + `app/doneren/page.tsx`, verwijder `goal_amount_display` lookup in `DonationForm`
4. **Whitelist-cleanup**: verwijder `goal_amount`, `goal_amount_display`, `raised_amount`, `raised_amount_display` uit alle 4 sync-locaties
5. **Schema-cleanup**: verwijder 4 velden uit `donation_campaigns` schema
6. **Types-cleanup**: verwijder uit `types/directus.ts`

**Risico's**: 5 → fout in fase 4 of 5 kan productie-formulier breken. Daarom **fase per fase** met test.

**Andere mini-cleanups als bonus**:
- Stap-57 docs-only seed om field-note van `tv_announcements.type` te updaten (zie D.2)
- Verwijder definitief `utm_links` resterende referenties uit comments in stap 49 (zeer cosmetisch)

---

## 7. Conclusie

Er is **vandaag niets onveilig of dringend**. Het systeem is in gezonde staat:

- ✅ Geen actieve velden zijn ongebruikt
- ✅ Alle legacy velden zijn ofwel hidden+gemarkeerd ofwel functionele fallbacks
- ✅ Geen privé-veld is publiek leesbaar
- ✅ Whitelist-sync is op orde
- ✅ Geen rol heeft te ruime permissions

**Aanbeveling**: focus deze delivery op de **beheerhandleiding** (`docs/BEHEER_HANDLEIDING.md`). De daadwerkelijke schema-cleanup vraagt een **aparte gedisciplineerde delivery met data-migratie** — niet vandaag.

---

**Audit uitgevoerd op**: mei 2026, na delivery 56 (hadieth_series).
**Laatste seed-stap in productie**: 56.
**Volgende vrije seed-stap**: 57.
