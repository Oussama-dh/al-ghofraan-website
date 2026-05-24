# Hotfix delivery — uitrolen

Deze hotfix bevat **toegevoegde/gewijzigde bestanden**.
Daarnaast moeten **3 bestanden + 2 directories handmatig verwijderd
worden** in je target-repo voor het uitrolen:

## TE VERWIJDEREN bestanden uit delivery 58

```bash
cd frontend
rm -rf app/api/check-in/organizer/export        # route.ts + directory
rm -rf app/check-in/organizer/exports           # page.tsx + directory
rm -f lib/server/registrationExport.ts          # builders
```

Verifieer met:
```bash
ls app/api/check-in/organizer/     # alleen "activate" en "route.ts"
ls app/check-in/organizer/         # alleen "OrganizerAuthForm.tsx" en "page.tsx"
ls lib/server/                     # alleen registrationClose.ts blijft (geen registrationExport.ts)
```

## TE OVERSCHRIJVEN bestanden uit deze zip

Pak de zip uit over `frontend/` heen:
```bash
unzip -o delivery-58c-hotfix-directus-exports.zip
```

Bevat:
- `frontend/scripts/seed/index.mjs`                              (gewijzigd)
- `frontend/scripts/seed/steps/59-registrations-admin-list.mjs`  (nieuw)
- `frontend/app/check-in/organizer/page.tsx`                     (gewijzigd: exports-link verwijderd)
- `docs/BEHEER_HANDLEIDING.md`                                   (sectie 7.7 + 7.8 toegevoegd)

## Daarna

```bash
cd frontend
rm -rf .next
npx tsc --noEmit       # schoon (alleen pre-existing globals.css)
npm run build          # 23/23 routes
npm run seed -- --only 59
```

## Productie
```bash
docker compose exec frontend sh -lc "cd /app && npm run seed -- --only 59"
docker compose restart frontend
```

## Test
1. Bezoek `/check-in/organizer` → login werkt, geen exports-link onder geautoriseerde banner
2. Bezoek `/check-in/organizer/exports` → 404
3. Open Directus admin → Registrations → ⋮ → Export → CSV
