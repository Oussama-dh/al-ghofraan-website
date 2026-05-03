# Gebedstijden via CSV

Deze handleiding legt uit hoe gebedstijden worden beheerd via Directus.

## 💡 Werkwijze

In plaats van honderden gebedstijden-rijen één voor één in Directus in te voeren, beheren we de tijden via een **CSV-bestand**:

1. Vrijwilliger maakt jaarlijks een CSV-bestand (bv. via Excel of Numbers)
2. Vrijwilliger uploadt het CSV-bestand in Directus
3. Frontend leest het CSV-bestand automatisch uit en toont de tijden

Dit is **veel sneller** voor de vrijwilliger en biedt meer flexibiliteit (bv. een nieuw jaar = nieuw bestand uploaden).

## 📄 CSV-formaat

Het CSV-bestand moet de volgende kolommen bevatten (volgorde mag wisselen):

| Kolom    | Voorbeeld     | Verplicht |
|----------|---------------|:---------:|
| `datum`  | `01-01-2026`  | ✅        |
| `dag`    | `Donderdag`   | —         |
| `fajr`   | `06:32`       | ✅        |
| `shuruq` | `08:46`       | ✅        |
| `dhuhr`  | `12:42`       | ✅        |
| `asr`    | `14:14`       | ✅        |
| `maghrib`| `16:38`       | ✅        |
| `isha`   | `18:42`       | ✅        |

### Datum-formaat

De parser accepteert meerdere datumformaten:
- `01-01-2026` (DD-MM-JJJJ) ← **aanbevolen**
- `01/01/2026` (DD/MM/JJJJ)
- `2026-01-01` (JJJJ-MM-DD, ISO)

### Tijd-formaat

Tijden moeten in 24-uurs notatie: `HH:MM` (bv. `06:32`, `13:00`, `18:42`).

### Voorbeeld CSV

Zie [`directus/sample-gebedstijden-2026.csv`](../directus/sample-gebedstijden-2026.csv) in deze repository voor een werkend voorbeeld.

```csv
datum,dag,fajr,shuruq,dhuhr,asr,maghrib,isha
01-01-2026,Donderdag,06:32,08:46,12:42,14:14,16:38,18:42
02-01-2026,Vrijdag,06:32,08:46,12:43,14:15,16:39,18:43
...
```

## 🗂️ Hoe upload ik een CSV in Directus?

### Stap 1 — Bereid je CSV voor

In Excel/Numbers:
1. Maak kolommen aan zoals hierboven beschreven
2. Vul de data in voor het hele jaar
3. **Bestand → Opslaan als → CSV (UTF-8 met komma's)**

> ⚠️ **Let op**: gebruik komma's `,` als scheiding, **geen** puntkomma's `;`. Bij Excel NL: kies "CSV UTF-8" en check de output in een teksteditor.

### Stap 2 — Upload in Directus

1. Open Directus → http://localhost:8055
2. Linker menu → **Prayer Time Files**
3. Klik **+** rechtsboven (nieuw item)
4. Vul in:
   - **Title**: `Gebedstijden 2026`
   - **File**: klik en upload je CSV
   - **Year**: `2026`
   - **Active**: ✅ aan (zet de oude automatisch op `false` als je de Flow uit `DIRECTUS_SETUP.md` hebt ingesteld)
5. Klik **Save** (✓ rechtsboven)

### Stap 3 — Controleren

Bezoek http://localhost:3000/gebedstijden — je nieuwe data moet binnen 1 uur zichtbaar zijn (cache).

Voor onmiddellijke verversing: herstart de frontend container:
```bash
docker compose restart frontend
```

## 🔄 Een nieuw jaar uploaden

1. Upload nieuw CSV-bestand met `Year: 2027` en `Active: true`
2. De Flow zet automatisch alle andere bestanden op `Active: false`
3. (Optioneel) Verwijder oude bestanden later

## 🛠️ Technische details

- Parser: [`frontend/lib/prayerTimes.ts`](../frontend/lib/prayerTimes.ts)
- API endpoint: `GET /api/gebedstijden`
- Cache: 1 uur (revalidate = 3600s)
- Bibliotheek: [`papaparse`](https://www.papaparse.com/)

De parser is **hoofdletterongevoelig** voor kolomnamen en herkent ook synoniemen:
- `datum` ↔ `date` ↔ `dag`
- `fajr` ↔ `subh` ↔ `ochtend`
- `shuruq` ↔ `zonsopgang` ↔ `sunrise`
- etc.

## ❓ Veelgestelde vragen

**Q: Kan ik gebedstijden ook handmatig per dag invoeren?**
A: Ja, maar dat raden we af. CSV is sneller en minder foutgevoelig. Voor handmatige invoer zou je een aparte `prayer_times` collectie moeten maken (niet huidige aanpak).

**Q: Wat als mijn CSV een puntkomma `;` als scheidingsteken gebruikt?**
A: Open het bestand in een teksteditor en vervang `;` door `,`, of stel je spreadsheet-tool in om met komma's te exporteren.

**Q: Kan ik meer kolommen toevoegen (bv. iqama-tijden)?**
A: Ja, maar dan moet ook de parser (`lib/prayerTimes.ts`) en het type (`types/directus.ts`) uitgebreid worden.

**Q: Werkt dit met Hijri-data?**
A: De huidige parser gebruikt Gregoriaanse data. Voor Hijri ondersteuning zou je een extra kolom kunnen toevoegen of een conversie-bibliotheek inzetten.
