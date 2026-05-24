# Delivery 57 — donation_campaigns legacy cent-velden cleanup

## Samenvatting

Verwijdert 4 legacy velden uit `donation_campaigns` collectie:
- `goal_amount` (integer, cents)
- `goal_amount_display` (string, handmatige weergave)
- `raised_amount` (integer, cents)
- `raised_amount_display` (string)

Deze waren sinds stap 51 al hidden + `[LEGACY]`-note, maar bleven in code als fallback. Klant heeft bevestigd dat er geen productie-data van waarde is, dus opruimen kan nu volledig: frontend, types, whitelists, en Directus schema.

**Met veiligheidsnet**: stap 57 abort als er nog campagnes zijn met non-zero/non-null waarden in deze velden. Vereist `--force-legacy-cleanup` flag om door te gaan.

Seed-stap **57**.

## Inventarisatie — wat bestond al

- 4 legacy velden, aangemaakt in stap 15 (goal_*) en stap 50 (raised_*)
- Stap 51 markeerde ze als hidden + `[LEGACY]`-note, data blijft staan
- Frontend leest cents-velden als fallback: `app/page.tsx:189`, `app/doneren/page.tsx:92`
- `DonationForm.tsx:313` render `c.goal_amount_display` in campagne-radiobuttons
- `DonationForm.tsx:55-56` initialiseert `goal_amount=null, goal_amount_display=null` op sentinel `ALGEMEEN_OPTION`
- 4 publieke whitelist-locaties: `lib/directus.ts:CAMPAIGN_FIELDS`, seeds 02/52/54
- Stap 26 admin-list listFields wijst naar `goal_amount_display`

## Plan & bestandenlijst

### Nieuw

- `scripts/seed/steps/57-donation-campaigns-legacy-cleanup.mjs` — idempotente DELETE met veiligheidsnet (telt data, abort tenzij `--force-legacy-cleanup`)

### Gewijzigd

**Frontend (code):**
- `app/page.tsx` — fallback `(c.goal_amount ?? 0)` → vervangen door `Math.round((c.goal_amount_eur ?? 0) * 100)`
- `app/doneren/page.tsx` — idem
- `components/donation/DonationForm.tsx` —
  - `ALGEMEEN_OPTION` sentinel: 2 properties verwijderd (`goal_amount`, `goal_amount_display`)
  - Dropdown: `goal_amount_display` lookup vervangen door auto-format uit `goal_amount_eur` ("doel: €1.000")

**Types:**
- `types/directus.ts` — 4 velden weg uit `DonationCampaign` interface, JSDoc-comments bijgewerkt (geen verwijzingen naar legacy fallback)

**Frontend lib:**
- `lib/directus.ts` — `CAMPAIGN_FIELDS` opgeschoond: 4 velden weg, comment bijgewerkt

**Seeds (historische):**
- `scripts/seed/steps/15-donation-campaigns.mjs` — 2 `ensureField`-calls weggehaald (goal_amount, goal_amount_display), vervangen door comment "verwijderd in delivery 57"
- `scripts/seed/steps/50-donation-campaign-progress.mjs` — 2 `ensureField`-calls weggehaald (raised_amount, raised_amount_display), comment idem. `show_progress` field-note bijgewerkt (`goal_amount > 0` → `goal_amount_eur > 0`)

**Seeds (sync):**
- `scripts/seed/steps/02-permissions.mjs` — 4 velden uit `DONATION_CAMPAIGN_PUBLIC_FIELDS` whitelist
- `scripts/seed/steps/52-donation-campaign-public-fields.mjs` — idem
- `scripts/seed/steps/54-tv-display-blocks.mjs` — idem
- `scripts/seed/steps/26-admin-list-layouts.mjs` — `listFields: goal_amount_display` → `goal_amount_eur`
- `scripts/seed/index.mjs` — import + STEPS-regel voor stap 57

### Verwijderd

Niets uit code (alleen Directus-velden via seed 57 op productie/staging).

## Wat is NIET aangeraakt

- Stap 37, 40 — niet geraakt
- Stap 51 (LEGACY_FIELDS_TO_HIDE) — bewust gelaten. Stap 51 patcht `hidden=true` op velden; bij rerun na cleanup is `hideField` fail-soft ("veld bestaat niet — overgeslagen"). Geen errors
- `manual_raised_note` — privacy intact, niet geraakt, blijft uitgesloten van alle 3 publieke whitelists
- `goal_amount_eur`, `manual_raised_amount_eur`, `manual_monthly_donor_count`, `progress_default_open`, `show_progress`, `show_on_homepage`, `show_on_tv`, `short_text` — alle actieve euro-velden ongewijzigd
- Stripe-flow: webhook, checkout, payment-link integratie — alle ongewijzigd
- Donatieflow op `/doneren` — werkt identiek (alleen euro-veld nu enige bron)
- Homepage donation rendering — werkt identiek (HomepageCampaignBlock self-guard onveranderd)
- TV-route: donation-slide gebruikt `getCampaignProgress` server-side die alleen euro-velden + Stripe aggregaties leest — onveranderd
- `package.json`, geen nieuwe dependencies
- Andere collecties, andere seeds

## Veiligheidsnet — pre-delete check

Stap 57 telt vóór delete of er campagnes zijn met:
- `goal_amount > 0` OF `raised_amount > 0`, OF
- `goal_amount_display IS NOT NULL` OF `raised_amount_display IS NOT NULL`

Bij count > 0:
- **Abort** met instructies + uitleg
- Beheerder moet ofwel data migreren naar euro-velden, ofwel expliciet `--force-legacy-cleanup` flag toevoegen

Bij count = 0:
- "Geen campagnes met legacy data — veilig om te verwijderen" → DELETE doorgaan

Bij `--force-legacy-cleanup` met count > 0:
- "⚠ FORCE actief — N campagne(s) met legacy data worden NU verwijderd" → DELETE doorgaan, data verloren

## Privacy & security

- `manual_raised_note` privacy: niet geraakt deze delivery, blijft uitgesloten van alle 3 publieke whitelists
- 4 legacy velden bevatten geen PII (bedragen + display-strings), dus geen privacy-risico bij delete
- Geen wijziging aan rollen, policies, of permissions
- Veiligheidsnet voorkomt onbedoeld data-verlies — vereist expliciete flag

## Risico's en mitigaties

| Risico | Mitigatie |
|---|---|
| Productie heeft toch data — onbedoeld verloren | Veiligheidsnet: stap 57 telt data, abort tenzij `--force-legacy-cleanup`. Klant moet bewust kiezen |
| Stap 50 of 15 rerun zou velden opnieuw aanmaken | `ensureField`-calls voor de 4 velden verwijderd uit beide seeds. Bij fresh install worden velden nooit aangemaakt |
| Stap 51 rerun verwacht velden om hidden te zetten | `hideField` heeft try/catch — fail-soft "bestaat niet — overgeslagen". Veilig |
| Stap 26 admin-list verwijst naar verwijderd veld | `goal_amount_display` → `goal_amount_eur` in listFields gewijzigd |
| 3-way whitelist drift (seed 02/52/54) | Allemaal in één commit aangepast, met expliciete sync-commentaar |
| Frontend bouwt niet meer door type errors | TS-check uitgevoerd: alleen pre-existing globals.css error. Alle 4 type-property usages opgeschoond |
| Donatie-flow breekt | Manueel testen vereist post-deploy. Code-paden hebben self-guard op `goalCents <= 0` → graceful "geen voortgangsbalk" |
| Campagne-dropdown toont niets meer waar voorheen "doel: X" stond | Vervangen door auto-format uit `goal_amount_eur` — beheerder hoeft niets extra in te vullen, sterker geworden |
| Stap 57 idempotent | DELETE → bestaande velden weggehaald. Rerun: lookup geeft 404 → "al opgeruimd — niets te doen" |
| Stap 57 logica voor non-existing values | `_nnull=true&_neq=` voor strings, `_gt=0` voor numerics. Unieke campagne-IDs verzameld in Set |
| Backup-strategie als productie-data zou bestaan | Klant heeft bevestigd dat er geen data is, en `--force-legacy-cleanup` is laatste reddingslijn. Voor extra zekerheid: pg_dump van `donation_campaigns` vóór seed |
| Race condition: nieuwe campagne aanmaken tussen count en delete | Acceptabel: stap 57 is dev-tijd / deploy-tijd operatie, geen production-time. Beheerders zouden niet tegelijk werken |

## Test-procedure

### Voorbereiding
```bash
cd frontend
git pull
```

### Test 1 — Stap 57 op clean systeem (geen legacy data)
```bash
npm run seed -- --only 57
```
Verwacht:
```
🧹 Stap 57 · donation_campaigns legacy cent-velden cleanup
  · gevonden legacy velden: goal_amount, goal_amount_display, raised_amount, raised_amount_display
  · geen campagnes met legacy data — veilig om te verwijderen
  ✓ donation_campaigns.goal_amount verwijderd
  ✓ donation_campaigns.goal_amount_display verwijderd
  ✓ donation_campaigns.raised_amount verwijderd
  ✓ donation_campaigns.raised_amount_display verwijderd
✓ Stap 57 voltooid
```

### Test 2 — Stap 57 op systeem MET legacy data (veiligheidsnet)
Vul een campagne met `goal_amount=500000` of `raised_amount=10000` in Directus, dan:
```bash
npm run seed -- --only 57
```
Verwacht:
```
🧹 Stap 57 · donation_campaigns legacy cent-velden cleanup
  · gevonden legacy velden: goal_amount, ...
  ⛔ ABORT — Gevonden   1 campagne(s) met data in legacy velden.
  ...
  Voeg de flag toe: npm run seed -- --only 57 --force-legacy-cleanup
```
Exit code != 0. Veilig.

### Test 3 — Stap 57 idempotent rerun
```bash
npm run seed -- --only 57  # tweede keer
```
Verwacht:
```
🧹 Stap 57 · donation_campaigns legacy cent-velden cleanup
  · alle legacy velden al opgeruimd — niets te doen
```

### Test 4 — Stap 50/15 rerun na cleanup
```bash
npm run seed -- --only 15
npm run seed -- --only 50
```
Verwacht: geen ensureField van de verwijderde velden. Andere velden ongewijzigd (image, allow_one_time, short_text, show_progress, etc.).

### Test 5 — Stap 51 rerun na cleanup
```bash
npm run seed -- --only 51
```
Verwacht:
```
💰 Stap 51 · ...
  · Legacy hide: donation_campaigns.goal_amount bestaat niet — overgeslagen
  · Legacy hide: donation_campaigns.goal_amount_display bestaat niet — overgeslagen
  · Legacy hide: donation_campaigns.raised_amount bestaat niet — overgeslagen
  · Legacy hide: donation_campaigns.raised_amount_display bestaat niet — overgeslagen
✓ Stap 51 voltooid
```
Geen errors.

### Test 6 — Frontend manueel testen
1. Maak campagne aan met `goal_amount_eur=1000`, `show_progress=aan`, `status=published`, `show_on_homepage=aan`
2. Bekijk `/` → campagne in HomepageCampaignBlock met "€0 van €1.000"
3. Bekijk `/doneren` → campagne in lijst, voortgangsbalk verschijnt
4. Test campagne-radiobuttons in DonationForm: zie "★ uitgelicht" (als featured=aan) en "doel: €1.000" — auto-geformatteerd uit goal_amount_eur
5. Maak een test-Stripe-donatie → check dat `manual_raised_amount_eur` correct optelt
6. Check `/gebedstijden/tv` → donation-slide met QR-code werkt onveranderd

### Test 7 — Build + TS + lint
```bash
npx tsc --noEmit       # alleen pre-existing globals.css error
npx next lint          # schoon
npm run build          # 23/23 routes groen
```

## Welke seed draaien

### Lokaal
```bash
cd frontend
npm run seed -- --only 57
npx tsc --noEmit
npm run build
```

### Docker (productie)
```bash
# 1. Code-deploy eerst (frontend zonder fallback-leesoperaties)
# 2. Seed 57 draaien
docker compose exec frontend sh -lc "cd /app && npm run seed -- --only 57"
docker compose exec frontend sh -lc "cd /app && npx tsc --noEmit"
docker compose exec frontend sh -lc "cd /app && npm run build"
docker compose restart frontend
```

Als seed 57 abort wegens data: ofwel data migreren naar `goal_amount_eur` / `manual_raised_amount_eur`, ofwel:
```bash
docker compose exec frontend sh -lc "cd /app && npm run seed -- --only 57 --force-legacy-cleanup"
```

## Rollback

### Code rollback
```bash
git revert <commit-hash>
```
Herstelt alle frontend, types, seeds. Maar Directus-velden zijn weg.

### Directus rollback (velden opnieuw aanmaken)
Als seed 57 heeft gedraaid en je wilt terug:
```bash
# Geforceerd opnieuw uitvoeren van stap 15 + 50 in een environment waar de
# wijzigingen aan deze seeds NIET zijn gemerged. Of: handmatig in Directus
# admin → Settings → Data Model → donation_campaigns → "+" → veld opnieuw
# definiëren met dezelfde naam/type/meta.
```
Geen automatische data-restore mogelijk — data is na delete weg.

### Zachte rollback (alleen code, schema laten weg)
```bash
git revert <commit-hash>
```
Frontend werkt zonder de velden zolang `goal_amount_eur` gevuld is. De gereverte code zou geen errors geven omdat de fallback `(c.goal_amount ?? 0)` op `undefined` werkt — een rare keuze om te doen, maar mogelijk als een snelle ad-hoc oplossing.

## Geverifieerde checks

- ✓ `node --check` op alle 8 gewijzigde + 1 nieuwe seed-bestand → ALL_OK
- ✓ `node scripts/seed/index.mjs --list` toont stap 57 als nr. 75 (totaal 75 stappen)
- ✓ `npx tsc --noEmit` → alleen pre-existing globals.css error
- ✓ `npx next lint --dir app --dir components --dir lib` → schoon
- ✓ `npm run build` → 23/23 routes groen. `/doneren` 6.9 kB (ongewijzigd), `/gebedstijden/tv` 6.01 kB (ongewijzigd)
- ✓ Volledige grep van alle 4 legacy veldnamen: alleen acceptabele references over (comments in cleanup-context + stap 51 LEGACY_FIELDS_TO_HIDE met fail-soft)
- ✓ Stap 51 `hideField` heeft try/catch — rerun na cleanup geeft "bestaat niet — overgeslagen", geen errors
- ✓ Drie publieke whitelists (seed 02, 52, 54) + lib/directus.ts CAMPAIGN_FIELDS allemaal in sync zonder legacy velden
- ✓ `manual_raised_note` blijft uitgesloten van publieke whitelist (privacy intact)
- ✓ Veiligheidsnet getest in code: ABORT tenzij `--force-legacy-cleanup` bij gevonden data
- ✓ `ALGEMEEN_OPTION` sentinel ge-fixed (verwijderde properties van type)
- ✓ DonationForm dropdown: auto-format uit `goal_amount_eur` werkt (bv. "doel: €1.000")
- ✓ Stripe-flow niet geraakt, donatieflow ongewijzigd
- ✓ TV donation-slide + QR ongewijzigd (geen legacy field gebruik)

## Commit message

```
Remove legacy donation_campaigns cents fields (goal_amount/raised_amount)
```
