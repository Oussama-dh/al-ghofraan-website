# Iconen beheren

Iconen op de website zijn aanpasbaar via Directus. De frontend mapt
opgeslagen tekstwaarden naar veilige `lucide-react` componenten.

## Beschikbare icoon-namen

Alleen iconen uit deze whitelist worden geaccepteerd. Onbekende of lege waarden
vallen automatisch terug op het standaardicoon (`info`).

### Tijd & data
`calendar` · `calendar-days` · `clock`

### Mens & gemeenschap
`users` · `user` · `hand-heart` · `heart`

### Plaats & contact
`map-pin` · `mail` · `phone` · `globe`

### Religieus / educatief
`book-open` · `graduation-cap` · `moon` · `star` · `sparkles` · `mosque` *(alias voor moon)*

### Communicatie
`message-circle` · `message-square` · `megaphone` · `help-circle`

### Algemeen
`info` · `arrow-right` · `chevron-right` · `check` · `compass` · `lightbulb`

> 📂 De volledige bron-of-truth staat in **`frontend/lib/icons.tsx`**.

## Waar pas ik iconen aan?

### Optie 1 — Centrale UI-iconen (`icon_settings`)

Directus → **Icon Settings** → wijzig het `icon`-veld bij een rij:

| Key                          | Standaard         | Waar gebruikt                                 |
|------------------------------|-------------------|-----------------------------------------------|
| `activity_date_icon`         | `calendar`        | Datum naast activiteiten                      |
| `activity_location_icon`     | `map-pin`         | Locatie naast activiteiten                    |
| `prayer_times_icon`          | `clock`           | Gebedstijden-banner                           |
| `donation_icon`              | `hand-heart`      | Donatieplaceholder                            |
| `contact_email_icon`         | `mail`            | E-mailregel in footer                         |
| `contact_phone_icon`         | `phone`           | Telefoonregel in footer                       |
| `contact_address_icon`       | `map-pin`         | Adresregel in footer                          |
| `faq_icon`                   | `message-circle`  | Standaard FAQ-icoon                           |
| `page_section_default_icon`  | `info`            | Fallback voor pagina-blokken                  |

### Optie 2 — Per pagina (`page_content.icon`)

Directus → **Page Content** → kies een pagina → vul `icon` in.

### Optie 3 — Per FAQ-item (`faq_items.icon`)

Directus → **FAQ Items** → kies een vraag → vul `icon` in.

## Wat gebeurt er bij een onbekende icoon-naam?

De frontend valt automatisch terug op `info` (een infosymbool). De UI breekt
nooit door een typo of een verkeerde naam.

## Een nieuw icoon beschikbaar maken

Het toevoegen van een nieuw lucide-icoon aan de whitelist vraagt een
codewijziging. Open `frontend/lib/icons.tsx`:

```tsx
// 1. Voeg de import toe bovenaan:
import { Bookmark } from "lucide-react";

// 2. Registreer hem in ICON_MAP:
export const ICON_MAP = {
  // ...
  bookmark: Bookmark,
} as const satisfies Record<string, LucideIcon>;
```

Daarna `npm run build` (controle) en je kan de nieuwe naam in Directus
gebruiken. Bekijk beschikbare iconen op https://lucide.dev/icons/.

## Hoe controleer ik dat een wijziging werkt?

1. Wijzig in Directus → klik **Save**
2. Vernieuw de pagina in de browser
3. Het nieuwe icoon moet meteen zichtbaar zijn

> In ontwikkelmodus is de cache uitgeschakeld — geen container-restart nodig.

## Direct in development zichtbaar?

Ja. Frontend-pagina's gebruiken `dynamic = "force-dynamic"` in development,
dus elke pagina-fetch haalt verse data op. Een `Cmd+R` / `Ctrl+R` is genoeg.
