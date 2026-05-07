# Pre-deployment cleanup — overzicht

Pak deze ZIP uit **op je projectroot** zodat de bestanden op de juiste
plek terechtkomen. Alle paden zijn relatief aan de root van het project:

```
project-root/
├── .env.example                                       (vervangen)
├── docs/
│   ├── PRE_DEPLOYMENT_CHECKLIST.md                    (NIEUW)
│   ├── STRIPE_SETUP.md                                (vervangen)
│   └── CMS_BEHEER.md                                  (vervangen)
└── frontend/
    ├── lib/utils.ts                                   (vervangen — getSiteUrl helper toegevoegd)
    ├── app/
    │   ├── layout.tsx                                 (vervangen — metadataBase via getSiteUrl)
    │   ├── page.tsx                                   (vervangen — geen demo-activiteiten meer)
    │   ├── api/doneren/checkout/route.ts              (vervangen — getSiteUrl-fallback)
    │   ├── gebedstijden/page.tsx                      (vervangen — geen fake-card op productie)
    │   ├── contact/page.tsx                           (vervangen — fallback-email weg)
    │   └── artikelen/page.tsx                         (vervangen — neutralere lege staat)
    ├── components/layout/Footer.tsx                   (vervangen — fallback-email weg)
    └── scripts/seed/
        ├── lib/helpers.mjs                            (vervangen — softCreateItem toegevoegd)
        └── steps/
            ├── 04-site-settings.mjs                   (vervangen — contact_email default leeg)
            ├── 05-page-content.mjs                    (vervangen — soft-create + emails weg)
            ├── 07-activities.mjs                      (vervangen — geen voorbeeld-activiteiten meer)
            ├── 17-contact.mjs                         (vervangen — soft-create page_content)
            └── 18-privacy.mjs                         (vervangen — emails weg, naar /contact)
```

> ❗ **Niet aangeraakt** (per harde regels uit projectsamenvatting):
> `next.config.mjs`, `docker-compose.yml`, alle andere seed-stappen,
> de Stripe-flow zelf.

## Test-stappen na uitpakken

```bash
cd frontend
npm run build                # moet groen zijn
npm run seed                 # idempotent — overschrijft niets
npm run dev                  # smoke test
```

Loop daarna `docs/PRE_DEPLOYMENT_CHECKLIST.md` door.

## Snelle hardcoded-URL controle

```bash
grep -rn "localhost:3000\|localhost:8055\|al-ghofraan\.com\|el-masoudi" \
  --include="*.tsx" --include="*.ts" --include="*.mjs" \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude="next.config.mjs" --exclude="env.mjs"
```

Verwacht resultaat: niets in runtime-code. `next.config.mjs` is bewust
overgeslagen — staat genoteerd in PRE_DEPLOYMENT_CHECKLIST §12.
