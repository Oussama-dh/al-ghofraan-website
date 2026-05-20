# Delivery — Selective Directus seed runner

CLI-flags voor de seed-runner. Eén bestand gewijzigd: `scripts/seed/index.mjs`. Geen seed-stap inhoudelijk geraakt, geen schema-wijziging, geen nieuwe dependencies.

## Samenvatting

- `npm run seed` zonder flags: identiek aan voorheen. 64 stappen in dezelfde volgorde.
- Nieuwe flags: `--only`, `--from`, `--to`, `--list`, `--help`.
- Output toont in selectieve modus duidelijk **welke stappen draaien** (✓-lijst) en **welke worden overgeslagen** (compacte ID-lijst).
- Onbekende stap-IDs of conflicterende flags → duidelijke foutmelding met exit code 2.

## CLI-voorbeelden

```bash
# Volledige seed (default — niets verandert)
npm run seed

# Lijst van alle stappen + IDs
npm run seed -- --list

# Help
npm run seed -- --help

# Eén stap
npm run seed -- --only 45

# Meerdere stappen (komma-separated, ook --only=43,44,45 vorm werkt)
npm run seed -- --only 43,44,45

# Vanaf stap X tot einde
npm run seed -- --from 43

# Van begin tot stap X (inclusief)
npm run seed -- --to 25

# Range (inclusief beide grenzen)
npm run seed -- --from 43 --to 45

# Sub-IDs werken ook
npm run seed -- --only 1b
npm run seed -- --only 12b,12c
```

## Bestanden

### Aangepast (1)

| Bestand | Wijziging |
|---|---|
| `scripts/seed/index.mjs` | Herwerkt naar een `STEPS`-array (single source of truth) + CLI-parser + selectie-resolver. **Volgorde is identiek aan de oude await-keten** (64 stappen, lijn-voor-lijn match met git-diff voor `npm run seed` zonder flags). |

### NIET aangeraakt

- Stap 37 of welke andere seed-stap dan ook. Alleen de runner is herwerkt.
- `package.json` — `npm run seed` script blijft `node scripts/seed/index.mjs`.
- `lib/env.mjs`, `lib/client.mjs`, `lib/helpers.mjs` — onaangeroerd.
- Geen TS-bestand geraakt; geen build-impact.

## Architectuurkeuzes

### Array als single source of truth

```js
const STEPS = [
  { id: "1",   label: "Basis-collecties",     run: setupCollections },
  { id: "1b",  label: "Icon-velden + …",      run: setupIconFields },
  ...
  { id: "45",  label: "daily_hadiths + sample", run: setupDailyHadiths },
];
```

Volgorde komt **letterlijk** uit de oude `await x; await y; await z` keten. Geverifieerd met diff:

```
old: setupCollections setupIconFields … setupDailyHadiths   (64 functies)
new: STEPS.map(s=>s.run.name)                                (64 functies)
diff = empty → IDENTICAL
```

### `--from`/`--to` op array-positie, niet numerieke ID

Reden: huidige volgorde is bewust **niet** numeriek. Voorbeelden van non-numerieke pakkans uit de keten:

| Array-positie | ID | Aanroep |
|---|---|---|
| 22 | 24 | `setupVideoCategories` |
| 23 | **12b** | `setupFollowupFields` (komt ná 24!) |
| 24 | 12c | `setupEducationFields` |
| 25 | 1h | `setupTargetGender` (ná 24!) |
| … | … | |
| 30 | 2 | `setupPermissions` (ná 24!) |
| 31 | 25 | `setupRolesAndPolicies` |

Numeriek `--from 12 --to 24` zou een onlogische subset opleveren die dependencies breekt. **Array-positie respecteert de bewust-gekozen volgorde**. Dat staat ook expliciet in `--help`:

> `--from`/`--to` gebruiken de array-volgorde (niet numeriek), zodat de keten dezelfde afhankelijkheidsvolgorde respecteert als zonder flags.

### `--only` en `--from`/`--to` mutually exclusive

Combinatie zou ambigu zijn. Botsing → 400-achtige error met clear message + exit code 2.

### Geen `process.argv.includes("--list")` shortcut

Bewust een echte parser geschreven die ook combined-vorm (`--only=43,44,45`) snapt en unknown flags afwijst. Voorkomt typo's stilletjes negeren.

### `--list` en `--help` exit'en vóór de Directus-verbinding

Beide werken offline en zonder admin credentials. Handig voor scripting in CI of remote support sessies.

### Output-formaat

In selectieve modus:

```
→ Modus        : SELECTIEF (3 van 64 stappen)
→ --only       : 43,44,45

Uitvoeren:
  ✓ [43 ]  YouTube-import velden op videos
  ✓ [44 ]  Maps-velden op site_settings
  ✓ [45 ]  daily_hadiths collectie + sample

Overgeslagen (61):
  · 1, 1b, 1c, 1d, 1e, 1f, 1g, 11, 12, 13, 14, 15, 15b, …
```

Compacte ID-lijst voor de skipped-output zodat 61 overgeslagen stappen geen vol scherm vullen.

In volledige modus:

```
→ Modus        : VOLLEDIG (64 stappen)
```

Geen lijst — gedraagt zich identiek aan het oude script.

## Veiligheidsanalyse

- **Geen seed-stap gedrag gewijzigd**: alle 64 imports + functie-references zijn ongewijzigd. Selectie-runner roept dezelfde functies aan in dezelfde volgorde.
- **Geen schema- of data-wijziging**: dit is een dispatcher-refactor.
- **Argument-validatie**: onbekende flags, onbekende stap-IDs, lege `--only`, en onmogelijke ranges geven heldere fouten + exit code 2. Geen stille fallback naar "alles draaien" — dat zou destructief kunnen aanvoelen.
- **Backward compatibility**: `npm run seed` zonder flags volgt exact het oude code-pad. Volgorde-diff = empty.
- **Geen nieuwe dependencies**: pure Node `process.argv` parsing.
- **Stap 37 onaangeroerd**: alleen runner herwerkt.

## Risico's & wat te doen

- ⚠️ **Beheerder draait `--only 25` (rollen) zonder eerst `--only 2` (permissies)**: rollen bouwen bovenop public-policy. Bestaande installatie heeft die al, dus prima. Verse installatie zou nooit `--only 25` als eerste draaien.
- ⚠️ **Beheerder draait `--only 13` (registration-relations) op verse DB**: registrations-collectie bestaat dan nog niet → stap faalt. Verwacht gedrag: gebruik selectieve flags alleen op een al-geseed'de productie-DB.
- ⚠️ **Beheerder typt verkeerde ID**: krijgt duidelijke "Onbekende stap-id" foutmelding + tip om `--list` te draaien. Geen run.

Niets hiervan is een nieuwe risico — het zijn dependency-realiteiten van de bestaande seed-keten die nu zichtbaar worden door de flexibiliteit. De heads-up in CHANGES + de duidelijke output is de bescherming.

## Testcommando's

```bash
# Sanity-checks (geen Directus nodig — exit'en vóór connect)
npm run seed -- --help
npm run seed -- --list

# Error-paden (verwachten exit code 2)
npm run seed -- --only 999          # onbekende ID
npm run seed -- --only 45 --from 43 # conflict
npm run seed -- --from 45 --to 43   # lege range
npm run seed -- --bogus             # onbekend argument

# Selectie-output controle (lokaal, met onbereikbare Directus URL)
DIRECTUS_URL=http://127.0.0.1:1 timeout 5 npm run seed -- --only 43,44,45

# Volledige run (productie/staging — voer hier echte URL in)
npm run seed
```

## Deployment

```powershell
git add frontend/scripts/seed/index.mjs

git commit -m "Add selective Directus seed runner"
```

- [ ] Push + pull
- [ ] Container in productie: test eerst `npm run seed -- --list` om te bevestigen dat alle 64 stappen verschijnen
- [ ] Eventueel: `npm run seed -- --only 43,44,45` om alleen de recente delivery te draaien
- [ ] Volledig: `npm run seed` blijft werken zoals voorheen

## Rollback

Git revert deze commit → terug naar de pure await-keten. Geen DB-side effect, geen aanpassing aan seed-stappen, dus volledig clean rollback.

## Build status

```
npx tsc --noEmit           → 0 errors (geen TS-bestand geraakt)
npx next build             → ✓ 23/23 routes
node --check seed/index    → OK
--list / --help / errors   → verwacht gedrag
```
