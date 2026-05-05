# Gebedstijden via CSV

Deze handleiding legt uit hoe gebedstijden worden beheerd via Directus.

## 💡 Werkwijze

In plaats van handmatig 365 dagen invullen in Directus, beheren we de
gebedstijden via één **CSV-bestand** dat een vrijwilliger jaarlijks uploadt.

1. Vrijwilliger maakt een CSV met alle dagen van het jaar
2. Vrijwilliger uploadt het CSV-bestand in Directus
3. De website leest het automatisch en toont de tijden

## 📄 Verplicht CSV-format

Het CSV-bestand moet **exact** deze kolommen hebben (let op de hoofdletters!):

```csv
datum,Fajr,Shoeroeq,Dhoehr,Asr,Maghrib,Ishaa
2026-01-01,07:06,08:51,12:47,14:26,16:42,18:27
2026-01-02,07:06,08:51,12:48,14:27,16:43,18:28
2026-01-03,07:06,08:51,12:48,14:28,16:44,18:29
```

### Regels

- **Eén rij per dag** — je krijgt dus 365 of 366 datalijnen plus 1 header
- **Datum is ISO-formaat**: `YYYY-MM-DD` (bv. `2026-01-15`)
- **Kolomnamen exact**: `datum`, `Fajr`, `Shoeroeq`, `Dhoehr`, `Asr`, `Maghrib`, `Ishaa`
- **Tijden in 24-uurs formaat**: `HH:MM` (bv. `06:32`, `13:00`, `18:42`)
- **Komma's als scheiding**, geen puntkomma's
- **UTF-8 codering**

### Dagnaam wordt automatisch berekend

De dag-kolom (maandag, dinsdag, ...) hoef je **niet** in de CSV te zetten —
de website berekent die automatisch uit de datum.

### Voorbeeld

Zie [`directus/sample-gebedstijden-2026.csv`](../directus/sample-gebedstijden-2026.csv) voor een werkend voorbeeld met een volledig jaar.

## 🗂️ Hoe upload ik een CSV in Directus?

### Stap 1 — Bereid je CSV voor

Maak in Excel, Numbers of Google Sheets de kolommen:

| datum       | Fajr  | Shoeroeq | Dhoehr | Asr   | Maghrib | Ishaa |
|-------------|-------|----------|--------|-------|---------|-------|
| 2026-01-01  | 07:06 | 08:51    | 12:47  | 14:26 | 16:42   | 18:27 |
| 2026-01-02  | 07:06 | 08:51    | 12:48  | 14:27 | 16:43   | 18:28 |

Daarna: **Bestand → Opslaan als → CSV (UTF-8 met komma's)**.

> ⚠️ **Excel NL-gebruikers**: Excel gebruikt vaak `;` als scheidingsteken
> i.p.v. `,`. Open het bestand in een teksteditor om dit te checken.

### Stap 2 — Upload in Directus

1. Open Directus → http://localhost:8055
2. Linker menu → **Prayer Time Files**
3. Klik **+** rechtsboven (nieuw item)
4. Vul in:
   - **Title**: `Gebedstijden 2026`
   - **File**: klik en upload je CSV (zie troubleshooting hieronder als de upload-knop niet werkt)
   - **Year**: `2026`
   - **Active**: ✅ aan
5. Klik **Save** (✓ rechtsboven)

### Stap 3 — Oude bestand op inactief zetten

⚠️ Slechts één bestand mag tegelijk `active = true` zijn.

1. Klik op het oude bestand
2. Zet **Active** uit
3. Save

### Stap 4 — Controleren

Bezoek http://localhost:3000/gebedstijden — je nieuwe data moet zichtbaar
zijn na een refresh.

## 📅 Maandoverzicht

Bezoek http://localhost:3000/gebedstijden/overzicht voor het volledige
maandoverzicht. Je kunt:

- Een maand kiezen via de dropdown
- Een jaar kiezen (alleen zichtbaar als er meerdere jaren beschikbaar zijn)
- Vandaag wordt automatisch gemarkeerd
- Kolommen: **Dag · Datum · Fajr · Shoeroeq · Dhoehr · Asr · Maghrib · Ishaa**

## 🔵 "Volgende gebed" highlight

Op /gebedstijden zie je vandaag-blok met zes kaarten. Het **eerstvolgende
gebed** krijgt automatisch een blauwe highlight, op basis van de huidige tijd.

- Voor Fajr → Fajr is blauw
- Tussen Fajr en Shoeroeq → Shoeroeq is blauw
- ...
- Na Ishaa → niets is blauw, met een tekstje "Tot morgen"

## 🔄 Een nieuw jaar uploaden

1. Maak een nieuwe CSV voor het volgende jaar
2. Upload als **nieuw** Prayer Time File-record met `active: true`
3. Zet het oude bestand op `active: false`

## 🛠️ Technische details

- **Parser**: [`frontend/lib/prayerTimes.ts`](../frontend/lib/prayerTimes.ts)
- **API endpoint**: `GET /api/gebedstijden`
- **Cache**: 1 uur in productie, 0 sec in development
- **Bibliotheek**: [`papaparse`](https://www.papaparse.com/)

### Veldnamen-spelling

We hanteren consequent deze spelling — zowel in de CSV-headers als in de UI:

| Spelling      | Arabisch  | Engels-equivalent |
|---------------|-----------|-------------------|
| `Fajr`        | الفجر     | Fajr              |
| `Shoeroeq`    | الشروق    | Sunrise           |
| `Dhoehr`      | الظهر     | Dhuhr             |
| `Asr`         | العصر     | Asr               |
| `Maghrib`     | المغرب    | Maghrib           |
| `Ishaa`       | العشاء    | Isha              |

> Backwards compatibility: de parser herkent ook oude spelling
> (`Shuruq`, `Dhuhr`, `Isha`) als alias zodat oude CSV's blijven werken.

## 🔧 Troubleshooting — File-veld in Directus werkt niet

Als je in Directus → **Prayer Time Files** geen werkende File-uploadknop
ziet (maar bv. een gewone tekstinvoer voor een UUID, of de melding
"Interface 'file' not found"), volg dan deze stappen:

### Optie A — Automatische fix via seed

```bash
cd frontend
npm run seed
```

De stap `01g · Repareren prayer_time_files.file relatie` patcht het veld
en maakt de relatie naar `directus_files` aan.

Refresh daarna de Directus admin met **Ctrl+Shift+R** om de gecachete
schema-info te vernieuwen.

### Optie B — Handmatige fix

Werkt de seed-stap niet, dan kun je het veld handmatig opnieuw aanmaken:

1. Open Directus → linker menu **Settings** (tandwiel) → **Data Model**
2. Klik op **Prayer Time Files**
3. Zoek het veld **`file`** in de lijst
4. Klik op het prullenbak-icoontje **alleen bij `file`** (niet bij andere velden!)
5. Bevestig de verwijdering — bestaande records verliezen hun file-koppeling, maar de records zelf blijven staan
6. Klik op **Create Field** → kies **File** (uit de "Selection" categorie)
7. Vul in:
   - **Key**: `file` (exact, kleine letters)
   - **Type**: blijft automatisch UUID
   - **Required**: aanvinken
   - **Note**: "CSV-bestand met gebedstijden"
8. Klik **Save**
9. Ga terug naar **Prayer Time Files** → open een record → het file-veld
   moet nu een nette upload-knop tonen
10. Upload je CSV opnieuw

### Optie C — Permissies controleren

Als het veld er goed uitziet maar de website nog steeds geen tijden toont:

1. Settings → **Access Policies** → **Public** → **Permissions**
2. Zorg dat `prayer_time_files` en `directus_files` allebei **read-toegang** hebben
3. Voor `prayer_time_files` mag je een filter zetten: `active = true`

> 💡 De seed-stap **02 · permissies** doet dit automatisch.

## ❓ Veelgestelde vragen

**Q: Mijn CSV is geüpload maar de tijden zijn niet zichtbaar.**
A: Check 4 dingen:
1. Staat **Active** op `true` voor je bestand?
2. Heeft het oude bestand **Active** op `false`?
3. Is de CSV-format correct? Open in een teksteditor en check de header.
4. Heb je de pagina vernieuwd?

**Q: De parser herkent mijn datums niet.**
A: Gebruik bij voorkeur ISO-formaat `YYYY-MM-DD`. Andere formaten die werken:
`dd-mm-yyyy` en `dd/mm/yyyy`.

**Q: Wat als mijn CSV een puntkomma `;` als scheidingsteken gebruikt?**
A: Open het bestand in een teksteditor en vervang `;` door `,`.

**Q: Kan ik meer kolommen toevoegen (bv. iqama-tijden)?**
A: Ja, maar dat vraagt een codewijziging in `lib/prayerTimes.ts` en
`PrayerTimeRow` type.

**Q: Hoe wordt de dag-kolom in het overzicht berekend?**
A: Automatisch uit de datum. De CSV hoeft geen `dag`-kolom te bevatten.
