# Wachtwoord en invite-flow — Directus beheerders

Deze handleiding legt uit hoe Directus invite-mails en password-reset-mails zijn ingericht, en hoe je ze in productie test en activeert.

> **Wanneer gebruik je dit document?**
> Bij eerste deploy van deze delivery (productie-config), als je een **nieuwe beheerder uitnodigt** zonder een tijdelijk wachtwoord te delen (sectie 7), of als een beheerder meldt dat de "Wachtwoord vergeten"-link op de login niet werkt.

---

## 1. Hoe het werkt

Directus 11 heeft password-reset standaard ingebouwd:

1. Beheerder klikt op **"Wachtwoord vergeten?"** onder het inlogformulier in de Data Studio (`https://cms.al-ghofraan.com`).
2. Vult zijn e-mailadres in.
3. Directus stuurt een mail met een eenmalige reset-link.
4. Beheerder klikt op de link → komt op een pagina in de Data Studio waar hij een nieuw wachtwoord kan kiezen.
5. Inloggen met het nieuwe wachtwoord.

De reset-link is geldig voor een beperkte tijd (Directus default) en kan maar één keer gebruikt worden.

**Belangrijk:** dit werkt alleen voor "lokale" Directus-users (default auth-provider). Als een user via OAuth/SAML/LDAP zou inloggen, ontvangt hij geen reset-mail. In dit project gebruikt iedereen lokale auth, dus dat is niet relevant.

---

## 2. Wat is geconfigureerd

In `docker-compose.yml` zijn op de `directus`-service email-env-vars toegevoegd die de bestaande cPanel SMTP-instellingen hergebruiken (dezelfde mailbox die de frontend gebruikt voor admin-notificaties):

```yaml
EMAIL_TRANSPORT: ${EMAIL_TRANSPORT:-smtp}
EMAIL_FROM: ${EMAIL_FROM:-}
EMAIL_SMTP_HOST: ${SMTP_HOST:-}
EMAIL_SMTP_PORT: ${SMTP_PORT:-}
EMAIL_SMTP_USER: ${SMTP_USER:-}
EMAIL_SMTP_PASSWORD: ${SMTP_PASS:-}
EMAIL_SMTP_SECURE: ${SMTP_SECURE:-}
```

Reset-mails worden verstuurd vanaf `EMAIL_FROM` en bevatten een link terug naar `PUBLIC_URL` (= `DIRECTUS_PUBLIC_URL` op productie, bijv. `https://cms.al-ghofraan.com`).

> Geen `PASSWORD_RESET_URL_ALLOW_LIST` nodig — Directus gebruikt zijn eigen `PUBLIC_URL` als basis voor de reset-link, wat past bij onze setup waar de admin via de Data Studio reset.

### Failure-modus (defensief)

Als één van de `SMTP_*` env-vars ontbreekt op productie, zal Directus opstarten zonder mail-functionaliteit. Geen crash, geen build-fail. De "Wachtwoord vergeten"-knop op de login blijft zichtbaar, maar versturen levert geen mail op (Directus logt dit dan in de container-logs).

Voor de admin betekent dit: **vul de SMTP-env-vars op productie volledig in om password-reset te activeren.**

---

## 3. Productie-checklist (eenmalig, bij deploy)

### A. Env-vars op productieserver

In `.env` op de productieserver moeten deze waarden gevuld zijn (zie ook `.env.example`):

```env
# Bestaande SMTP-config (mogelijk al gevuld voor frontend-mails)
SMTP_HOST=mail.al-ghofraan.nl
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@al-ghofraan.nl
SMTP_PASS=...           # cPanel mailbox-wachtwoord, NIET commiten

# Nieuw voor deze delivery — Directus password-reset
EMAIL_FROM=noreply@al-ghofraan.nl
EMAIL_TRANSPORT=smtp
```

> `EMAIL_FROM` is alleen het mail-adres — geen display-name, geen quotes, geen hoeken-haken. De mailbox moet bestaan in cPanel.

### B. DIRECTUS_PUBLIC_URL controleren

De reset-link in de mail bevat de waarde van `DIRECTUS_PUBLIC_URL`. Controleer dat deze op productie het juiste https-domein bevat:

```env
DIRECTUS_PUBLIC_URL=https://cms.al-ghofraan.com
```

Niet `http://localhost:8055` of een IP — anders krijgt de gebruiker een onbruikbare reset-link.

### C. Containers herstarten

```bash
docker compose down directus
docker compose up -d directus
```

Of als de frontend ook moet meekomen (omdat `.env` is geüpdatet):

```bash
docker compose down
docker compose up -d
```

### D. Containerlogs checken (eerste paar regels)

```bash
docker compose logs directus | head -50
```

Bij een correcte config zie je géén mail-warnings. Bij ontbrekende `EMAIL_*`-vars zal Directus loggen dat e-mail niet beschikbaar is.

---

## 4. Test-procedure (na deploy)

> Gebruik bij voorkeur een **testaccount**, geen echte beheerder. Maak één aan via admin → Users → Create User met een e-mailadres waar je toegang toe hebt.

1. Open `https://cms.al-ghofraan.com` in een privé-venster (om uitgelogd te zijn).
2. Klik onder het inlogformulier op **"Forgot Password?"** / **"Wachtwoord vergeten?"**
3. Vul het e-mailadres van het testaccount in.
4. Klik op **"Request Password Reset"**.
5. Controleer de inbox van dat adres (kan tot 1-2 minuten duren — check ook spam).
6. Klik op de link in de mail.
7. Vul een nieuw wachtwoord in.
8. Log in met dat nieuwe wachtwoord.

### Wat te checken in de mail

- ✅ Afzender = `EMAIL_FROM`
- ✅ Link begint met `https://cms.al-ghofraan.com` (niet `http://localhost` of IP)
- ✅ Link bevat een token-parameter
- ✅ Mail komt netjes aan, niet in spam (controleer SPF/DKIM op cPanel-domein als spam-issue)

### Bij fouten

| Symptoom | Vermoedelijke oorzaak | Oplossing |
|---|---|---|
| Geen mail (ook niet in spam) | SMTP env-vars ontbreken/onjuist | Controleer `.env` + `docker compose logs directus` |
| Mail verstuurd maar link defect (404 of redirect-error) | `DIRECTUS_PUBLIC_URL` niet correct gezet | Pas `.env` aan, restart directus |
| Link komt aan op `localhost:8055` | `DIRECTUS_PUBLIC_URL` heeft nog dev-waarde | Pas `.env` aan, restart directus |
| Mail in spam-folder | SPF/DKIM/DMARC-records op `al-ghofraan.nl` ontbreken/onjuist | cPanel DNS-records controleren (Email Deliverability) |
| 403 / "user not found" | Email-adres bestaat niet in directus_users | Maak gebruiker eerst aan (admin → Users) |

---

## 5. Beveiligingsoverwegingen

- **Geen wachtwoord wordt opgeslagen in env-vars.** Alleen SMTP-credentials (om mails te versturen).
- **Reset-link is single-use** en tijdsbeperkt (Directus default).
- **Alleen lokale users** kunnen resetten — externe auth-providers (niet in gebruik in dit project) krijgen geen mail.
- **Rate limiting** is door Directus zelf geregeld; geen extra config nodig.
- **Geen secrets in deze repository** — alle credentials staan in `.env` op de productieserver en zijn `.gitignored`.

---

## 6. Onderscheid met "admin reset password" (bestaande functionaliteit)

Tot deze delivery konden beheerders alleen worden geholpen door een admin: de admin opent de user in Directus → Users → Reset Password → typt een tijdelijk wachtwoord → geeft dat door. Zie `USER_MANAGEMENT.md` sectie "Workflow C".

**Dat blijft werken zoals voorheen.** De nieuwe functionaliteit hier is een **self-service** reset: de beheerder doet het zelf zonder dat een admin tussenbeide hoeft te komen. Beide flows naast elkaar.

---

## 7. Invite-flow — nieuwe beheerders zonder tijdelijk wachtwoord

> **Status (juni 2026)**: invite-flow draait productief. Voor troubleshooting / diagnose-procedure: zie [`DIRECTUS_INVITE_FLOW.md`](DIRECTUS_INVITE_FLOW.md). Mocht de invite-mail om wat voor reden niet werken: tijdelijk uitwijken naar de noodprocedure uit `USER_MANAGEMENT.md` Workflow A.2.

Directus 11 heeft een **ingebouwde invite-flow** waarbij de nieuwe gebruiker zelf zijn wachtwoord instelt via een eenmalige link. Geen tijdelijke wachtwoorden meer delen via WhatsApp of e-mail.

### Hoe het werkt

1. Admin gebruikt de **"Invite User"-actie** in de Directus admin (Settings → Access Control → Users → driehoek-naast-+-knop → "Invite User"). **Niet** de standaard "Create User" actie + handmatig Status=Invited zetten — dat triggert geen mail.
2. Vult email + role in → klikt Invite.
3. Directus maakt automatisch een user-record aan met status `invited` **én** verstuurt een mail naar het e-mailadres met een link naar `{DIRECTUS_PUBLIC_URL}/admin/accept-invite?token=...`
4. Nieuwe gebruiker klikt op de link → komt op de Data Studio "Accept invite"-pagina → kiest zelf een wachtwoord.
5. Account wordt automatisch op `Active` gezet en de gebruiker kan direct inloggen.

De link in de mail is **eenmalig** en **tijdsbeperkt** (Directus default).

### Stap-voor-stap voor de admin

> Vooraf nodig: SMTP-config geverifieerd (zie [`DIRECTUS_INVITE_FLOW.md`](DIRECTUS_INVITE_FLOW.md) sectie 3 voor verificatie).

1. Log in als admin op Directus.
2. Linksonder **tandwiel** (Settings) → **Access Control** → **Users**.
3. Klik op het **pijltje naast de "+"-knop** rechtsboven → kies **"Invite User"**. (NIET op de "+"-knop zelf — die maakt een Active user zonder mail.)
4. Vul in:
   - **Email** — het inlog-adres (en waar de invite-mail heen gaat)
   - **Role** — kies de juiste afdelingsrol uit de dropdown (Content beheerder, Activiteiten beheerder, Ahadieth beheerder, etc.)
5. Klik op **Invite**.
6. Directus maakt automatisch een user-record aan met status `invited` én stuurt een invite-mail naar het e-mailadres. **Niets handmatig doen** — geen wachtwoord noteren, geen Status wijzigen, geen mail kopiëren.
7. Vertel de nieuwe beheerder dat hij/zij een mail van `EMAIL_FROM` kan verwachten. Check de spam-folder bij twijfel.

> **Belangrijk verschil met "Create User"**: de standaard "+"-knop maakt een gebruiker aan met status `Active` en **stuurt geen mail**. Alleen de "Invite User"-actie triggert de mail-flow. Dit is een veelvoorkomende vergissing.

### Wat de nieuwe gebruiker ziet

1. Inbox: mail van `noreply@al-ghofraan.nl` met onderwerp "You've been invited to Directus". Kan in spam-folder belanden — daar even checken.
2. Klikt op de link → opent `https://cms.al-ghofraan.nl/admin/accept-invite?token=...`
3. Pagina "Accept invite" met een wachtwoord-veld.
4. Vult zelf een sterk wachtwoord in (**minimaal 8 tekens** — bij korter krijgt de gebruiker een generieke foutmelding) → bevestigt.
5. Word automatisch doorgestuurd naar de Data Studio en is ingelogd.
6. Ziet alleen de collecties waar de toegewezen rol toegang toe heeft.

### Wat te doen als de invite-mail verloopt of zoek raakt

- **Optie 1 — Resend invite**: admin opent de user → Status staat nog op `Invited` → klik **Resend Invite** (knop bovenaan de user-detail). Directus genereert een nieuwe link en stuurt opnieuw mail.
- **Optie 2 — Status terugzetten en opnieuw**: zelden nodig. User → Status van `Active` (per ongeluk) terug naar `Invited` + Save.
- **Optie 3 — Noodprocedure (sectie 6 + USER_MANAGEMENT.md Workflow C)**: alleen als SMTP niet werkt of de gebruiker écht niet bereikt kan worden via e-mail. Admin zet een tijdelijk wachtwoord en deelt dat via een veilig kanaal. Gebruiker moet bij eerstvolgende login direct via "Wachtwoord vergeten" een eigen wachtwoord instellen.

### Geen custom URL-allowlist nodig

Directus 11 ondersteunt zowel de **standaard Data-Studio-flow** (gebruiker komt op `https://cms.al-ghofraan.com/admin/accept-invite`) als een **custom URL-flow** waarbij de invite-link naar een eigen front-end leidt. Voor de custom-flow moet `USER_INVITE_URL_ALLOW_LIST` als env-var worden gezet.

**Wij gebruiken de standaard Data-Studio-flow.** Geen `USER_INVITE_URL_ALLOW_LIST` of `PASSWORD_RESET_URL_ALLOW_LIST` nodig. Niet toevoegen aan docker-compose.yml.

### Beveiligingsoverwegingen

- **Geen wachtwoord wordt gedeeld of opgeslagen** — gebruiker kiest zelf, server slaat alleen de hash op (Directus default).
- **Link is single-use en tijdsbeperkt** (Directus default).
- **Audit-trail**: Directus logt user-aanmaak en status-wijzigingen in `directus_revisions`.
- **Rate-limiting** is door Directus zelf geregeld.
- **Spam-bescherming**: zorg dat SPF/DKIM/DMARC op `al-ghofraan.nl` correct staan ingesteld — anders eindigen invite/reset-mails in spam. Volledige procedure (PowerShell checks + cPanel-fix): zie [`EMAIL_DELIVERABILITY.md`](EMAIL_DELIVERABILITY.md).

---

## 8. Referenties

- Directus docs — Email configuration: https://directus.io/docs/configuration/email
- Directus docs — Auth & password reset: https://directus.io/docs/guides/auth/email-login
- Directus docs — Creating users (incl. invite-flow): https://directus.io/docs/guides/auth/creating-users
- [`EMAIL_DELIVERABILITY.md`](EMAIL_DELIVERABILITY.md) — SPF/DKIM/DMARC + `EMAIL_FROM` syntax
- [`DIRECTUS_INVITE_FLOW.md`](DIRECTUS_INVITE_FLOW.md) — invite-flow diagnose-procedure
- [`USER_MANAGEMENT.md`](USER_MANAGEMENT.md) — beheerders aanmaken en rollen toewijzen
- [`DEPLOYMENT_CONTABO.md`](DEPLOYMENT_CONTABO.md) — productie deploy
- [`BEHEER_HANDLEIDING.md`](BEHEER_HANDLEIDING.md) — handleiding voor niet-technische beheerders

