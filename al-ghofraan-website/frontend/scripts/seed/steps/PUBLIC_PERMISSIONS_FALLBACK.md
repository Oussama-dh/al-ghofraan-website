# Handmatige fallback — Public permissies in Directus 11

Als `npm run seed` om wat voor reden ook de permissies niet automatisch kan zetten, kan je ze in **2 minuten** handmatig instellen via de Directus UI.

## Wat we willen bereiken

De **Public** policy moet leesrechten hebben op deze collecties:

| Collectie            | Filter                          |
|----------------------|---------------------------------|
| `activities`         | `status` is gelijk aan `published` |
| `prayer_time_files`  | `active` is gelijk aan `true`   |
| `site_settings`      | (geen filter)                   |
| `navigation_items`   | `active` is gelijk aan `true`   |
| `page_content`       | `status` is gelijk aan `published` |
| `faq_items`          | `published` is gelijk aan `true` |
| `directus_files`     | (geen filter — voor afbeeldingen) |

> Alleen **Read** rechten geven aan Public. **Nooit** Create / Update / Delete.

## Stap-voor-stap

### 1. Open de Access Policies

1. Ga naar http://localhost:8055
2. Klik op het tandwiel-icoon (**Settings**) onderin het linkermenu
3. Klik op **Access Policies**

### 2. Open de Public-policy

In de lijst staat een policy genaamd **"Public"** (vaak met een 🌐-icoon).

Klik erop om hem te openen.

> Bestaat er geen "Public" policy? Klik dan rechtsboven op **+ Create Policy** en geef hem de naam `Public`. Laat alle andere velden leeg.

### 3. Voeg permissies toe per collectie

In de geopende policy zie je een tabel **"Permissions"** met kolommen voor elke actie (Create, Read, Update, Delete, Share).

Voor **elke** collectie uit het lijstje hierboven:

1. Klik in de tabel op **+ Add Collection** (of klik in een bestaande rij voor die collectie)
2. Selecteer de collectie (bv. `activities`)
3. Klik op de **Read** kolom voor die collectie → er verschijnt een dropdown
4. Kies één van twee opties:
   - **All Access** → als de tabel hierboven zegt "(geen filter)"
   - **Custom** → als er een filter staat. Dan opent een filter-builder:
     - Klik **+ Add Filter**
     - Veld: bv. `Status`
     - Operator: `Equals`
     - Waarde: bv. `published`
     - Klik **Save**
5. Klik linksboven op de **Save** knop (✓ rechtsboven) om de policy te bewaren

Herhaal dit voor alle 7 collecties.

### 4. Test het resultaat

Open een terminal en draai:

```bash
curl -s http://localhost:8055/items/activities | head -c 200
```

Verwacht: `{"data":[...]}` met daarin je voorbeeldactiviteiten.

Krijg je `{"errors":[{"message":"You don't have permission..."}]}` → herhaal stap 3 voor die collectie.

## Specifiek voor `directus_files`

Voor `directus_files` werkt het **iets anders**: dit is een ingebouwde systeem-collectie. Vink in de Read-kolom **All Access** aan. Optioneel kan je in de **Field Permissions** een lijst van toegestane velden specificeren — voor de site werkt `*` (alle velden).

## Hoe controleer ik of het script al iets gedaan heeft?

In Directus → Settings → Access Policies → Public, zie je bij elke collectie of er al een 👁 (oog) staat in de Read-kolom. Aangevinkt = er is al iets ingesteld.

Het seed-script is **idempotent** — opnieuw draaien is veilig en overschrijft enkel als nodig.

## Ik krijg nog steeds 403

Mogelijke oorzaken:

1. **De Public-policy is niet aan een rol gekoppeld.** In Directus 11 hoeft dat niet — Public werkt automatisch voor alle ongeverifieerde requests. Maar check via Settings → Roles & Permissions of er geen aparte "rol" Public bestaat die je per ongeluk hebt aangepast.

2. **Cache.** Reload de browser hard (Ctrl+Shift+R) of herstart de Directus container:
   ```bash
   docker compose restart directus
   ```

3. **Filter staat verkeerd.** Open de filter en check dat je `_eq` (Equals) gebruikt en niet bv. `_contains`.
