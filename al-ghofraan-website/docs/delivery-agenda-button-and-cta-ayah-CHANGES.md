# Delivery — agenda-button-and-cta-ayah

Twee kleine, gerichte verbeteringen op de homepage en CTA-secties:

1. **Homepage knopstijl** — "Bekijk de agenda" in de hero krijgt dezelfde filled/taupe stijl als "Doneer hier" in de CTA-sectie.
2. **CTA-ayah uitbreiding** — type=cta sections kunnen nu een Nederlandse vertaling onder de Arabische tekst tonen, met bestaande `ayah_reference` als bronvermelding.

Geen breaking changes, geen nieuwe dependencies, geen DB-migratie, geen rename.

---

## Scope 1 — Homepage knopstijl

### Rationale

In de homepage-hero stonden "Bekijk de agenda" en "Over ons" beiden als outline-knoppen (wit/transparant op donkere achtergrond). Klantwens: "Bekijk de agenda" moet visueel gelijk worden aan "Doneer hier" verderop op de pagina (filled taupe) zodat de primaire actie (agenda bekijken) duidelijker opvalt. "Over ons" blijft outline als secundaire actie.

### Wat is gewijzigd

**`components/sections/HeroSection.tsx`**

De "Bekijk de agenda"-knop is omgezet van:

```tsx
<Button href="/agenda" variant="outline" size="lg"
  className="border-white/40 text-white hover:bg-white hover:text-slate-mosque">
  Bekijk de agenda
</Button>
```

naar:

```tsx
<Button href="/agenda" variant="secondary" size="lg">
  Bekijk de agenda
</Button>
```

De `secondary` variant in `components/ui/Button.tsx` levert exact dezelfde styling als de "Doneer hier"-knop in CTA-secties:

```
bg-taupe text-white hover:bg-taupe-dark shadow-sm hover:shadow-md
```

Plus de basis-classes uit Button (focus-visible ring, rounded-full, transition-all, etc.) blijven ongewijzigd.

**Comment in HeroSection.tsx aangepast** om de nieuwe ontwerpkeuze te documenteren (oude comment verwees naar "delivery A waar klant optie B koos voor identieke outline").

### Wat NIET is gewijzigd (scope 1)

- "Over ons" knop in HeroSection — blijft outline (klantverzoek).
- "Bekijk de agenda" op `/dawahcommissie` — die had al filled taupe (primaryCta in CTASection met `bg-taupe`).
- Button-component zelf — geen wijziging aan variant-definities.

### Hover/focus/visual states

- **Default**: `bg-taupe` (warm beige) met witte tekst.
- **Hover**: `bg-taupe-dark` (donkerder beige) + `hover:shadow-md` (subtiele schaduw, was `shadow-sm`).
- **Focus**: `ring-2 ring-slate-mosque ring-offset-2` (uit Button base classes — werkt op donkere én lichte achtergronden).
- **Active/pressed**: geen aparte state — Tailwind/browser default.

---

## Scope 2 — CTA-ayah uitbreiding

### Rationale

In `components/sections/types/CtaSection.tsx` werd de Arabische tekst boven de titel al ondersteund via het bestaande `eyebrow_ar`-veld op `page_sections`. Maar er was géén ondersteuning voor:

- Nederlandse vertaling van die ayah
- Bronvermelding (welke soera, welk vers)

Bij type=ayah sections (uit on-hold seed 40) bestond `ayah_reference` al wel. Voor type=cta was er geen pad om de ayah-content te verrijken.

### Architectuur-keuze

Eén nieuw veld `eyebrow_translation_nl` op de hele `page_sections` collectie:

- Hergebruikt bestaande `eyebrow_ar` (Arabisch) en `ayah_reference` (bron) — geen duplicate velden.
- Generieke naam (`eyebrow_translation_nl`, niet `cta_ayah_translation_nl`) zodat het veld in de toekomst ook bij andere section-types toegevoegd kan worden zonder migratie.
- Géén heropening van stap 40 — die blijft on-hold. Stap 47 raakt alleen het FIELD-niveau, niet de type-enum of voorbeeld-rijen.

### Wat is gewijzigd

**`types/directus.ts`**

In `PageSection` interface toegevoegd na `ayah_reference`:

```ts
/**
 * Optionele Nederlandse vertaling die hoort bij `eyebrow_ar` (Arabische
 * tekst boven de titel). Primair gebruikt door type='cta' om de ayah
 * uit te breiden met vertaling onder de Arabische tekst. Andere types
 * mogen dit veld ook gebruiken; leeg laten = niet renderen.
 */
eyebrow_translation_nl?: string | null;
```

**`components/sections/types/CtaSection.tsx`**

Drie nieuwe gerenderde elementen onder de bestaande icoon, vóór de titel:

1. `eyebrow_ar` (Arabische tekst) — al aanwezig, alleen `mb-4` → `mb-2` om dichter bij vertaling te staan
2. `eyebrow_translation_nl` (Nederlandse vertaling) — **nieuw**, cursief, max-width 2xl, in quotes
3. `ayah_reference` (bronvermelding, bv. "Soerat al-Maa'idah 5:2") — **nieuw**, kleine taupe-tekst

Alle drie self-guarded: leeg = niet renderen, geen lege containers. Als alle drie leeg zijn, vervalt het hele ayah-blok en de CTA toont alleen icoon + titel + intro + knoppen (gedrag exact gelijk aan vóór deze delivery).

Visueel ontwerp blijft rustig en past bij bestaande stijl:

- Arabisch: `font-arabic text-2xl text-taupe-light` (zoals voorheen)
- Vertaling: `font-body text-sand/80 italic text-base sm:text-lg max-w-2xl mx-auto`
- Bron: `font-body text-sand/60 text-xs sm:text-sm`

**`scripts/seed/steps/47-cta-ayah-reference-translation.mjs` (nieuw)**

Idempotente seed-stap die één nieuw veld toevoegt aan `page_sections`:

- `eyebrow_translation_nl` (text, multiline, full width, met admin-note)

Bestaand veld `ayah_reference` (uit seed 40) wordt hergebruikt — geen wijziging.

**`scripts/seed/index.mjs`**

Eén import toegevoegd, één regel in STEPS-array:

```js
import { setupCtaAyahReferenceTranslation } from "./steps/47-cta-ayah-reference-translation.mjs";
// ...
{ id: "47", label: "CTA-ayah: vertaling-veld op page_sections", run: setupCtaAyahReferenceTranslation },
```

> Noot: stap 46 (Ahadieth-rol uit vorige delivery) is in deze `index.mjs` blijven staan zodat de delivery niet conflicteert met de eerder geleverde rol-delivery. Als die vorige delivery nog niet bij u is gedeployed, zorg dat seed 46 + de `site_settings`-correctie daarin meegaan vóór u seed 47 draait.

### Wat NIET is gewijzigd (scope 2)

- **Stap 40 NIET aangeraakt** — `page_sections` type-enum, voorbeeld-rijen, ayah-section-rendering blijven ongewijzigd.
- **Stap 37 NIET aangeraakt** — navigation_items.parent.
- **Stap 39 NIET aangeraakt** — site_settings homepage_cta_* velden blijven werkend als 2e fallback.
- **CTASection.tsx (hardcoded fallback)** NIET aangeraakt — die heeft een hardcoded ayah (`﴿ وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ ﴾`) en wordt alleen gebruikt als noch page_sections noch site_settings CTA-content heeft. Buiten scope.
- **Andere section-types** (split_feature, card_grid, simple_text, ayah, whatsapp_cta) — alleen CtaSection-component gerenderd `eyebrow_translation_nl`. AyahSection en anderen blijven exact zoals voorheen.
- **Geen wijziging aan stap 25/46** rol-permissions — Content beheerder + Ahadieth beheerder hebben al `daily_hadiths`-rechten; voor het nieuwe veld op `page_sections` heeft de Content beheerder al volledige beheerrechten via stap 25.
- **Geen frontend-routing-wijziging**, geen API-wijziging.

---

## Security & risico

**Risico-classificatie: zeer laag.**

- ✅ Geen DB-schema-wijziging buiten één nieuw nullable veld.
- ✅ Geen breaking change in TypeScript-types (`eyebrow_translation_nl?` is optioneel).
- ✅ Frontend is self-guarded: ontbrekend/leeg veld = geen render, geen crash.
- ✅ Geen wijziging aan permissions of rollen.
- ✅ Geen publieke endpoint-wijziging.
- ✅ Public-read op `page_sections` (uit seed 02) was er al — het nieuwe veld erft die filter mee automatisch (`status=published` + bestaande publieke filters).

---

## Handmatige Directus-actie (na deploy)

**Verplicht voor zichtbaarheid op productie**: niets — het nieuwe veld bestaat na seed 47, en de frontend rendert alleen als de beheerder iets invult.

**Optioneel — content invullen per CTA-sectie**:

1. Open Directus → Content → Page Sections.
2. Filter op `type = cta` (of zoek de relevante CTA-rij, bv. `page_slug=home, key=main_cta`).
3. Vul in:
   - **Eyebrow Ar** (al bestaand): Arabische ayah-tekst, bv. `﴿ وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ ﴾`
   - **Eyebrow translation nl** (NIEUW): Nederlandse vertaling, bv. `En helpt elkaar in vroomheid en godsvrucht.`
   - **Ayah Reference** (al bestaand): bronvermelding, bv. `Soerat al-Maa'idah 5:2`
4. Sla op. Frontend toont automatisch alle ingevulde delen.

Velden leeg laten = die delen verschijnen niet op de site. Volledig backward-compatible.

---

## Deployment checklist

### A. Pre-deploy

- [ ] ZIP uitpakken in werkkopie
- [ ] Diff bekijken (`git diff`) voor de gewijzigde bestanden
- [ ] Controleer dat seed 46 (uit vorige delivery, met uw `site_settings`-correctie) al in uw werkkopie staat — anders kan `index.mjs` niet importeren

### B. Deploy stappen — productieserver (Linux + Docker)

```bash
# 1. Op productie: pull de wijzigingen
cd /path/to/al-ghofraan-website
git pull origin main

# 2. Seed-stap 47 draaien (idempotent — veilig, tweede run = no-op)
docker compose exec frontend sh -lc "cd /app && npm run seed -- --only 47"

# 3. TypeScript + build checks
docker compose exec frontend sh -lc "cd /app && npx tsc --noEmit"
docker compose exec frontend sh -lc "cd /app && npm run build"

# 4. Frontend restart (om de nieuwe HeroSection styling te activeren)
docker compose restart frontend
```

### C. Lokaal/buiten Docker

```bash
cd frontend
npm run seed -- --only 47
npx tsc --noEmit
npm run build
```

### D. Verificatie

- [ ] Open homepage → "Bekijk de agenda"-knop in hero is nu beige/taupe met witte tekst (zelfde stijl als "Doneer hier" verderop).
- [ ] "Over ons" knop ernaast is nog steeds outline (wit op donker).
- [ ] In Directus admin: open een type=cta page_section → controleer dat het nieuwe veld `Eyebrow translation nl` zichtbaar is in het formulier.
- [ ] Vul in een CTA-section een vertaling in → refresh homepage → vertaling verschijnt onder Arabische tekst.
- [ ] Maak een CTA-section met alleen `eyebrow_ar` (geen vertaling/ref) → controleer dat de site er nog steeds netjes uitziet (zoals voor deze delivery).
- [ ] Maak een CTA-section zonder enige ayah-content → controleer dat alleen icoon/titel/intro/knoppen verschijnen (geen lege ayah-container).

---

## Rollback

### Scope 1 rollback

Eén bestand: `git revert <commit>` of handmatig terug naar oude HeroSection.tsx (twee outline-knoppen).

### Scope 2 rollback

1. Frontend code rollback via `git revert`.
2. Het Directus-veld `eyebrow_translation_nl` op `page_sections` mag blijven staan — leeg veld doet niks. Of, voor schone rollback:

   In Directus admin → Settings → Data Model → page_sections → veld `eyebrow_translation_nl` → delete (verwijdert ook ingevulde data!).

   Of via SQL (alleen als data al ingevuld en u zeker weet wat u doet):

   ```sql
   ALTER TABLE page_sections DROP COLUMN eyebrow_translation_nl;
   DELETE FROM directus_fields
     WHERE collection = 'page_sections' AND field = 'eyebrow_translation_nl';
   ```

Geen impact op andere data of velden.

---

## Geverifieerde checks

- ✅ `npm install` — geen nieuwe dependencies
- ✅ `npm run build` — Compiled successfully, 23/23 static pages
- ✅ `node --check` op stap 47 + index.mjs — syntax OK
- ✅ `node scripts/seed/index.mjs --list` — stap 47 zichtbaar als positie 66
- ✅ Stap 37 NIET aangeraakt
- ✅ Stap 40 NIET heropend (alleen één veld op page_sections-collectie toegevoegd, geen type-enum/voorbeeld-rij wijziging)
- ✅ Stap 39 NIET aangeraakt
- ✅ Geen nieuwe imports of dependencies
- ✅ Geen `next/image` voor Directus assets
- ✅ Geen delete-permissions, geen rol-wijziging
- ✅ Geen DB collection of field rename
- ✅ Seed-stap 47 idempotent: tweede run = no-op
- ✅ CtaSection backward-compatible: lege velden = exact zelfde render als vóór delivery

---

## Bestandenlijst

**Nieuw:**

```
frontend/scripts/seed/steps/47-cta-ayah-reference-translation.mjs
```

**Gewijzigd:**

```
frontend/components/sections/HeroSection.tsx
frontend/components/sections/types/CtaSection.tsx
frontend/types/directus.ts
frontend/scripts/seed/index.mjs
```

**Totaal: 4 bestanden gewijzigd, 1 toegevoegd, 0 verwijderd.**

---

## Wat u handmatig moet doen

1. **Geen handmatige Directus-actie vereist** voor zichtbaarheid — seed 47 maakt het veld aan, frontend rendert defensief.
2. **Optioneel — content invullen** per CTA-sectie (zie sectie "Handmatige Directus-actie" hierboven).
3. **Seed 47 draaien** (lokaal of in Docker — zie deployment checklist).

---

## Commit message

```
Match homepage agenda button to donate style and add CTA ayah metadata
```
