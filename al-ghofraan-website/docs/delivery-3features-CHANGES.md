# Delivery — YouTube import + Maps + Hadith van de dag

Drie kleine features in één delivery, allemaal CMS-beheerd zonder externe API-keys.

## Samenvatting per deel

### DEEL 1 — YouTube import → Directus

- **Standalone CLI-script** `scripts/import-youtube-videos.mjs` haalt YouTube-RSS op en zet nieuwe video's als `status="draft"` in Directus. Geen API-key, geen externe dependencies, geen externe service.
- **CLI-argumenten** ondersteund: `--channel-id=UC...` of `--playlist-id=PL...`. ENV-fallback via `YOUTUBE_CHANNEL_ID` / `YOUTUBE_PLAYLIST_ID` voor cron-jobs.
- **Dedup** op `youtube_video_id`, met fallback op match in `youtube_url`. Bestaande rijen worden NIET overschreven — alleen lege velden aangevuld.
- **4 nieuwe velden** op `videos` (seed-stap 43): `youtube_video_id`, `thumbnail_url`, `imported_from`, `imported_at`.
- **Videopagina-cards** tonen nu thumbnails ipv embed-iframes; klik leidt naar YouTube. Featured-iframe op homepage blijft onveranderd.

### DEEL 2 — Google Maps op contactpagina

- **4 nieuwe velden** op `site_settings` (seed-stap 44): `contact_maps_enabled`, `contact_maps_embed_url`, `contact_maps_place_url`, `contact_address_label`. Allemaal default leeg/uit — contactpagina verandert niet na deploy.
- **Geen API-key nodig** — beheerder plakt de Google Maps embed-URL (uit "Delen → Embed").
- **URL-whitelist** in `ContactMap` component: alleen `https://` op `google.com/maps`, `google.<tld>/maps`, `maps.google.com`. `javascript:` / `data:` worden geweigerd. Place-URL whitelist accepteert ook `maps.app.goo.gl` shortlinks.
- **Self-guarded component**: rendert niets als enabled=false of embed_url ongeldig.

### DEEL 3 — Hadith van de dag

- **Nieuwe collectie** `daily_hadiths` (seed-stap 45) met velden: status, active, title, arabic_text, translation_nl, source, grade, explanation_short, display_date, sort, created_at.
- **Public-read** alleen voor `status=published` EN `active=true` (geen draft-lek).
- **Geen public write, geen delete** voor public policy.
- **Content beheerder rol** krijgt manage rights via stap 25-update.
- **1 voorbeeld-hadith** geseed met `active=false` als template voor beheerder (Bukhari 1, niyyah-hadith).
- **DailyHadithBlock** rendert tussen ayah-blok en body op homepage. Self-guarded.
- **Niet via `page_sections`** — vrij van de on-hold sections-discussie.

## Bestanden

### Nieuw (8)

| Bestand | Doel |
|---|---|
| `scripts/seed/steps/43-video-import-fields.mjs` | 4 import-velden op `videos`. Idempotent. |
| `scripts/seed/steps/44-contact-maps-fields.mjs` | 4 maps-velden op `site_settings`. Idempotent. |
| `scripts/seed/steps/45-daily-hadiths.mjs` | Collectie `daily_hadiths` + 11 velden + 1 sample-rij (active=false). Idempotent. |
| `scripts/import-youtube-videos.mjs` | Standalone CLI voor YouTube-RSS → Directus import. Geen API-key. |
| `lib/youtube.ts` | Helpers `buildYouTubeThumbnailUrl`, `buildYouTubeWatchUrl`. |
| `components/contact/ContactMap.tsx` | Self-guarded iframe + "Open in Google Maps"-knop met URL-whitelist. |
| `components/sections/DailyHadithBlock.tsx` | Presentational hadith-blok, consistent met AyahBlock. |

### Aangepast (8)

| Bestand | Wijziging |
|---|---|
| `scripts/seed/index.mjs` | Imports + aanroepen stap 43, 44, 45 toegevoegd (na 42). Stap 40 (sections, on hold) blijft staan. |
| `scripts/seed/steps/02-permissions.mjs` | `daily_hadiths` public-read filter (`status=published AND active=true`). |
| `scripts/seed/steps/25-roles-policies.mjs` | `daily_hadiths` in "Content beheerder" manage-array. |
| `types/directus.ts` | `Video` interface uitgebreid met 4 import-velden. `SiteSettings` uitgebreid met 4 maps-velden. Nieuwe `DailyHadith` interface + schema-entry. |
| `lib/directus.ts` | `VIDEO_FIELDS` uitgebreid (`youtube_video_id`, `thumbnail_url`). Nieuwe `getActiveDailyHadith()` getter. `DailyHadith` import. |
| `app/videos/page.tsx` | Iframe → thumbnail-anchor in cards. Resolveert videoId via `youtube_video_id` (DB) of `extractYouTubeId(youtube_url)` (fallback). Featured-iframe op homepage blijft ongewijzigd. |
| `app/contact/page.tsx` | `<ContactMap>` onder WhatsApp-knop in linker kolom. |
| `app/page.tsx` | `getActiveDailyHadith` aan Promise.all. `<DailyHadithBlock hadith={hadith} />` tussen ayah-blok en body. |

### NIET aangeraakt

- Stap 37 (productie-fix).
- Stap 40 (sections, on hold) — staat idempotent in `index.mjs`, niet uitgebreid.
- Stap 41 + 42 (recurring + UX) — werken onveranderd.
- Homepage featured-video iframe — bewust niet aangeraakt (scope vroeg overzichtspagina).
- QR-check-in, mails, donatieflow, agenda/recurring, TV-routes, onderwijsfilters — niet geraakt.
- Mobile nav, dark mode, `package.json`, `next.config.mjs`, `tailwind.config.ts`, `docker-compose.yml`.
- Geen nieuwe dependencies.

## Architectuurkeuzes

### YouTube RSS vs Data API

RSS heeft geen API-key nodig en geeft de laatste ~15 video's. Voor "nieuwe video's automatisch oppakken" is dat genoeg. Voor een volledige back-catalog-import zou je YouTube Data API moeten gebruiken (overweeg later als nodig). Scope vroeg expliciet om geen API-key te gebruiken; RSS sluit aan.

### Minimale XML-parser zonder dependency

YouTube's RSS-feed heeft een consistente, stabiele structuur (atom + media-extensions). Een regex-parser voor de paar velden die we nodig hebben (videoId, title, published, description, link) is ~30 regels code en heeft geen XML-library nodig. Risico: als YouTube het feed-format ooit verandert, breekt het. Dat is een acceptabel risico voor een import-script dat handmatig gestart wordt — wel zichtbare error.

### Thumbnail via i.ytimg.com (geen Next image-proxy)

De thumbnails zijn publieke YouTube CDN-bestanden. Gebruik `<img>` direct (geen `next/image`) om consistent te zijn met de project-conventie dat externe assets niet via de Next image-pipeline gaan.

### URL-whitelist voor Google Maps

Beheerder zou een willekeurige iframe-src kunnen plakken; we accepteren alleen `https://` op google.com/maps hosts en regionale TLDs. Voorkomt `javascript:` of phishing. Place-URL whitelist staat ook `maps.app.goo.gl` shortlinks toe.

### Daily hadith niet via page_sections

Scope sloot dit expliciet uit. Eigen collectie + getter + component. Eenvoudig, geen koppeling aan on-hold sections-discussie. Voordeel: hadith-content heeft eigen schema (translation_nl, grade, source) die niet logisch op page_sections past.

### "Active=false" sample-hadith

Zo ziet beheerder direct hoe een hadith-record eruit ziet (alle velden gevuld) maar verschijnt er niets op de site totdat beheerder `status=published` + `active=true` zet. Public-read filter sluit draft uit, dus zelfs als active per ongeluk op true gaat zonder published-status: niet zichtbaar.

## Veiligheidsanalyse

- **Idempotency**: alle drie de seed-stappen gebruiken `ensureField`/`ensureCollection` (skipt bestaand). Stap 45's `upsertHadithByTitle` zoekt op title en vult alleen lege velden aan. Tweede seed-run = 0 wijzigingen.
- **Public-read voor daily_hadiths**: filter `status=published AND active=true`. Drafts blijven onzichtbaar.
- **Geen public write/delete** voor `daily_hadiths`. Geen delete-permissies in het algemeen toegevoegd.
- **URL-validatie**: ContactMap weigert niet-https en niet-google.com hosts. Iframe heeft `referrerPolicy="no-referrer-when-downgrade"`.
- **Import-script** valideert YouTube video-IDs strict (`[A-Za-z0-9_-]{11}`) en CLI-arguments (`[A-Za-z0-9_-]{1,64}`).
- **Geen API-key opgeslagen**, geen externe service-aanroepen anders dan YouTube-RSS (publiek endpoint).

## Functionele teststappen

### Seed
1. `npm run seed` in productie. Verwacht:
   - `📺 Stap 43 · YouTube-import velden op videos` — 4 velden aangemaakt (eerste run)
   - `🗺️ Stap 44 · Maps-velden op site_settings` — 4 velden aangemaakt
   - `📖 Stap 45 · daily_hadiths collectie` — collectie + 11 velden + 1 sample-rij
   - Tweede run: alles ongewijzigd

### DEEL 1 — YouTube import
2. Vraag de moskee om hun channel-ID (UC...) of playlist-ID (PL...).
3. Run script:
   ```bash
   docker exec -it <frontend-container> node scripts/import-youtube-videos.mjs --channel-id=UCxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Controleer in Directus admin → `videos` collectie → er staan rijen met `status=draft`, gevulde `youtube_video_id`, `youtube_url`, `thumbnail_url`, `imported_from`, `imported_at`.
5. Beheerder bewerkt een rij: titel, beschrijving, `category_ref`, zet `status=published` + `featured=true`.
6. Refresh `/videos` → de nieuwe video verschijnt in de grid met thumbnail. Klik → opent YouTube in nieuwe tab.
7. Run script opnieuw → zelfde 15 video's, 0 nieuwe (idempotent), geen overwrites.
8. Voer een handmatig aangemaakte video toe in Directus zonder `youtube_video_id` maar wél met `youtube_url`. Run script. → script vult `youtube_video_id` aan via URL-match, geen duplicaat.

### DEEL 2 — Maps
9. In Directus admin → `site_settings`:
   - Zet `contact_maps_enabled=true`
   - Open Google Maps, kies de moskee-locatie, klik "Delen" → "Een kaart insluiten" → kopieer ALLEEN de waarde van `src="..."` (begint met `https://www.google.com/maps/embed?pb=...`)
   - Plak in `contact_maps_embed_url`
   - Optioneel: plak de "Delen → Link kopiëren" URL in `contact_maps_place_url` (kan een `maps.app.goo.gl/...` URL zijn)
   - Optioneel: vul `contact_address_label` (bv. "Moskee El Mouahidin")
10. Refresh `/contact` → kaart verschijnt onder WhatsApp-knop. Knop "Open in Google Maps" zichtbaar als place_url is gevuld.
11. Test injectie: zet `contact_maps_embed_url=javascript:alert(1)` → kaart wordt NIET gerenderd (URL-whitelist blokt). Geen JS-uitvoering.
12. Test ongeldige URL: zet `contact_maps_embed_url=https://evil.com/maps/embed` → kaart wordt NIET gerenderd.
13. Zet `contact_maps_enabled=false` → kaart verdwijnt, contactpagina blijft normaal.
14. Mobiel: aspect-video iframe schaalt mee, geen overflow.

### DEEL 3 — Daily hadith
15. In Directus admin → `daily_hadiths` collectie → open sample-rij ("Hadith van de dag"). Zet `status=published` + `active=true`. Save.
16. Refresh `/` → hadith verschijnt direct na ayah-blok, vóór body.
17. Beheerder zet `active=false` → hadith verdwijnt van homepage.
18. Beheerder zet `active=true` maar laat `translation_nl` leeg → hadith verdwijnt (self-guard in component).
19. Maak tweede hadith aan met lagere `sort` waarde + active=true → die wordt nu getoond (laagste sort wint).
20. **Anti-leak test**: maak een hadith met `status=draft` + `active=true`. Refresh frontend → hadith verschijnt NIET (public-read filter sluit drafts uit).
21. Voor inschrijfformulier-/admin-rol: log in met "Content beheerder" rol → kan `daily_hadiths` lezen, aanmaken, bewerken. Kan NIET verwijderen (geen delete-permissie).

### Regression
22. `/videos` zonder categorie-filter → grid met thumbnails. Filter per categorie werkt.
23. Bestaande handmatig aangemaakte video (zonder `youtube_video_id`): wordt nog steeds correct gerenderd via `extractYouTubeId(youtube_url)`.
24. Homepage featured-video onder de hero blijft een iframe (ongewijzigd).
25. QR-check-in, mails, donatieflow, agenda, recurring, TV: niet geraakt — geen wijziging aan die paden.

## Deployment checklist

- [ ] PowerShell: `git add` + `commit` (zie onder)
- [ ] Push naar git
- [ ] Pull op productie
- [ ] Container restart frontend
- [ ] `npm run seed` in container → verwacht logs van stap 43, 44, 45
- [ ] Optioneel: tweede `npm run seed` om idempotentie te bevestigen
- [ ] Run YouTube-import handmatig (eenmalig om te testen):
   ```bash
   docker exec -it <frontend-container> node scripts/import-youtube-videos.mjs --channel-id=UCxxxxxxxxxxxxxxxxxxxxxxxx
   ```
- [ ] Verifieer in Directus admin: 4 nieuwe velden op videos, 4 nieuwe velden op site_settings, nieuwe collectie `daily_hadiths` met 1 draft-rij
- [ ] Configureer Maps + Hadith handmatig in Directus zoals in teststappen 9-21
- [ ] (Optioneel) Cron-job aanmaken voor scheduled YouTube-import:
   ```cron
   0 7 * * * docker exec <frontend-container> node /app/scripts/import-youtube-videos.mjs --channel-id=UC...
   ```

## Rollback

**YouTube import**:
- Velden blijven in DB; oude code negeert ze. Geen actie nodig.
- Beheerder kan importeerde draft-video's gewoon verwijderen of behouden.

**Maps**:
- Zet `contact_maps_enabled=false` in Directus → kaart verdwijnt direct. Geen code-revert nodig.

**Hadith**:
- Zet alle hadiths op `active=false` → blok verdwijnt direct.
- Volledig: git revert; collectie blijft bestaan in DB maar wordt niet meer gelezen door frontend.

## PowerShell git commands

```powershell
git add `
  frontend/scripts/seed/steps/43-video-import-fields.mjs `
  frontend/scripts/seed/steps/44-contact-maps-fields.mjs `
  frontend/scripts/seed/steps/45-daily-hadiths.mjs `
  frontend/scripts/seed/steps/02-permissions.mjs `
  frontend/scripts/seed/steps/25-roles-policies.mjs `
  frontend/scripts/seed/index.mjs `
  frontend/scripts/import-youtube-videos.mjs `
  frontend/lib/youtube.ts `
  frontend/lib/directus.ts `
  frontend/types/directus.ts `
  frontend/components/contact/ContactMap.tsx `
  frontend/components/sections/DailyHadithBlock.tsx `
  frontend/app/videos/page.tsx `
  frontend/app/contact/page.tsx `
  frontend/app/page.tsx

git commit -m "Add YouTube video import, contact map and daily hadith"
```

## Import-command voorbeelden

```bash
# Kanaal-ID (UC...)
node scripts/import-youtube-videos.mjs --channel-id=UCxxxxxxxxxxxxxxxxxxxxxxxx

# Playlist-ID (PL...)
node scripts/import-youtube-videos.mjs --playlist-id=PLxxxxxxxxxxxxxxxxxxxxxxxx

# Via ENV (handig voor cron)
YOUTUBE_CHANNEL_ID=UC... node scripts/import-youtube-videos.mjs

# In Docker container
docker exec -it <container-name> node /app/scripts/import-youtube-videos.mjs --channel-id=UC...
```

Hoe vind je de Channel-ID?
1. Open het YouTube-kanaal in een browser.
2. Klik rechtsboven op de drie puntjes → "Channel ID kopiëren" (alleen voor kanaaleigenaar zichtbaar), of:
3. Open de page-source en zoek naar `"externalId":"UC...`, of:
4. Gebruik een tool als `commentpicker.com/youtube-channel-id.php` met de @handle-URL.

## Build status

```
npx tsc --noEmit  → 0 errors
npx next build    → ✓ 23/23 static pages
node --check      → OK (stap 43, 44, 45, index, import-script)
```
