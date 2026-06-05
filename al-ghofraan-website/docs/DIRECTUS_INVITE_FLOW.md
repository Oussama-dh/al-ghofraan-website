# Directus Invite-flow — diagnose en uitrol

Deze doc beschrijft hoe je de Directus invite-flow op productie aan de praat krijgt. Bedoeld voor de **technische beheerder** die toegang heeft tot de productieserver en docker-compose.

> **Wanneer gebruik je dit document?**
> Eenmalig, bij het uitrollen van invite-functionaliteit op productie. Daarna alleen bij troubleshooting als invite-mails niet aankomen.
>
> Voor reguliere gebruikersbeheer: zie [`USER_MANAGEMENT.md`](USER_MANAGEMENT.md).
> Voor password-reset-flow: zie [`PASSWORD_RESET.md`](PASSWORD_RESET.md).

---

## 1. Waarom is deze doc er

Een eerste poging om invite-flow productief te krijgen was niet meteen succesvol. Op basis van Directus 11-docs en bekende foutpatronen zijn er vijf veelvoorkomende oorzaken waarom invite-mails op productie niet werken:

| # | Oorzaak | Impact |
|---|---|---|
| 1 | Verkeerde admin-actie ("Create User" + Status=Invited) i.p.v. "Invite User" knop | Geen mail wordt verstuurd, status klopt wel |
| 2 | `EMAIL_FROM` ontbreekt of leeg in productie `.env` | Mail wordt niet verstuurd (silent fail zonder `EMAIL_VERIFY_SETUP`) |
| 3 | `EMAIL_TRANSPORT` ontbreekt of leeg in `.env` | Mail-transport niet geactiveerd |
| 4 | `DIRECTUS_PUBLIC_URL` verkeerd (localhost, IP, of verkeerd domein) | Mail komt aan, link werkt niet |
| 5 | SMTP-cert/auth-fout (cPanel SSL, AUTH PLAIN denied, etc.) | Mail-versturen faalt op connectie |

Deze doc loopt elk van deze oorzaken na met diagnose-commando's.

---

## 2. Hoe de invite-flow daadwerkelijk werkt

Het is **niet** voldoende om in Directus admin een user met "Create User" aan te maken en daarna handmatig `Status = Invited` te zetten. Dat creëert wel een user-record met status `invited`, maar **stuurt geen mail**.

De juiste flow:

1. Settings → Access Control → Users
2. Klik op het **pijltje naast de "+"-knop** rechtsboven → kies **"Invite User"**
3. Vul **email** + **role** in
4. Klik **Invite**

Directus voert dan twee acties uit:
- Maakt user-record aan met status `invited`
- Verstuurt een mail vanaf `EMAIL_FROM` met een link `{PUBLIC_URL}/admin/accept-invite?token=...`

Alleen deze flow triggert de mail. De API-route is `POST /users/invite` (verschillend van `POST /users`).

Voor de gebruiker:
1. Klikt op link in mail → opent Data Studio "Accept invite"-pagina
2. Kiest zelf wachtwoord
3. Wordt automatisch op `Active` gezet en ingelogd

De link is eenmalig en tijdsbeperkt (Directus default).

---

## 3. Productie-checklist

### Stap 3.1 — `.env` op productie verifiëren

Login op productieserver, ga naar repo-root, run:

```bash
grep -E "^(SMTP_HOST|SMTP_PORT|SMTP_SECURE|SMTP_USER|SMTP_PASS|EMAIL_FROM|EMAIL_TRANSPORT|DIRECTUS_PUBLIC_URL)=" .env
```

Verwacht **8 regels**, allemaal niet-leeg:

```env
SMTP_HOST=mail.al-ghofraan.nl
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@al-ghofraan.nl
SMTP_PASS=<cPanel mailbox-wachtwoord>
EMAIL_FROM=noreply@al-ghofraan.nl
EMAIL_TRANSPORT=smtp
DIRECTUS_PUBLIC_URL=https://cms.al-ghofraan.nl
```

> **Belangrijke check `DIRECTUS_PUBLIC_URL`**: moet **exact** overeenkomen met het domein waarop Directus extern bereikbaar is. Een mismatch (bv. `.com` vs `.nl`, of `http://` vs `https://`, of trailing slash) zorgt voor onbruikbare links in de mail. Test door zelf naar het URL te navigeren in een browser — dat moet de Directus login-pagina openen.

> **`EMAIL_FROM` format**: alleen het mail-adres, geen quotes, geen display-name, geen hoeken-haken. Voorbeeld: `EMAIL_FROM=noreply@al-ghofraan.nl`. De mailbox achter dit adres moet bestaan in cPanel.

Ontbreekt een regel of is hij leeg? Aanvullen met `nano .env`. Bewaar het `.env`-bestand uitsluitend lokaal op de productieserver (gitignored).

### Stap 3.2 — `docker-compose.yml` aanwezig met `EMAIL_VERIFY_SETUP`

```bash
git pull
grep EMAIL_VERIFY_SETUP docker-compose.yml
```

Verwacht:
```
      EMAIL_VERIFY_SETUP: "true"
```

Deze flag dwingt Directus om bij opstart de SMTP-verbinding te verifiëren en het resultaat in de logs te zetten. Zonder deze flag falen mail-config-fouten stil.

### Stap 3.3 — Directus container herstarten

Eén van bovenstaande gewijzigd? Restart Directus zodat de nieuwe env-vars geladen worden:

```bash
docker compose up -d directus
```

Of forceer een volledige restart:
```bash
docker compose restart directus
```

### Stap 3.4 — Logs controleren

```bash
docker compose logs --tail=200 directus | grep -iE "(email|smtp|mail|verify)"
```

#### Wat je wilt zien (goede config)

Een variant van:
```
Email service connection verified
```
of
```
SMTP connection successful
```

Met `EMAIL_VERIFY_SETUP=true` zou Directus dit binnen enkele seconden na opstart loggen.

#### Wat je niet wilt zien

| Log-bericht | Oorzaak | Fix |
|---|---|---|
| `authentication failed` / `EAUTH` / `535 5.7.8` | Verkeerde `SMTP_USER` of `SMTP_PASS` | Controleer mailbox-credentials in cPanel |
| `connection refused` / `ECONNREFUSED` | Verkeerde `SMTP_HOST` of `SMTP_PORT`, of firewall blocked | `nslookup mail.al-ghofraan.nl`, `telnet host 465` vanaf server |
| `wrong version number` / `ESOCKET` | `SMTP_SECURE` mismatch met poort (e.g. port 465 + SECURE=false, of port 587 + SECURE=true) | Voor port 465 moet SECURE=true. Voor port 587 SECURE=false |
| `self signed certificate` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | cPanel gebruikt soms self-signed cert | Niet-blokkerend voor production-mail; bevestig hostnaam |
| `Invalid From` / `invalid address` | Syntax van `EMAIL_FROM` niet correct | Format: `Display Name <email@domain.com>` of pure email |
| `getaddrinfo ENOTFOUND` | DNS-resolution naar SMTP_HOST faalt vanuit container | Container-network DNS check |
| Geen email/smtp-output in logs | `EMAIL_TRANSPORT` is niet `smtp` of EMAIL_FROM ontbreekt | Verifieer stap 3.1 |

#### Geen output bij grep?

```bash
docker compose logs --tail=50 directus
```

Toont laatste 50 regels. Als hierin niets over email staat én `EMAIL_VERIFY_SETUP=true` is gezet, is een van de SMTP-vars vermoedelijk leeg (Directus verifieert dan niets).

---

## 4. Test-procedure

### Stap 4.1 — Test password-reset eerst (eenvoudigste pad)

Password-reset gebruikt dezelfde SMTP-config. Als reset werkt, werkt invite ook qua mail-config.

1. Log uit van Directus (privé-venster aanbevolen)
2. Open `https://cms.al-ghofraan.nl`
3. Klik onder login-form op **"Wachtwoord vergeten?"** / **"Forgot Password?"**
4. Vul je eigen admin-email in
5. Klik **Request Password Reset**
6. Check inbox binnen 1–2 minuten (ook spam)
7. Klik link → check of de URL `https://cms.al-ghofraan.nl/admin/...` is (NIET localhost of `.com`)

Krijg je geen mail? Terug naar stap 3.4 (logs). Krijg je mail met verkeerde URL? `DIRECTUS_PUBLIC_URL` is fout — terug naar stap 3.1.

### Stap 4.2 — Test invite-flow met testaccount

1. Maak een test-email beschikbaar waar je zelf inbox van hebt (Gmail, etc.)
2. Settings → Access Control → Users
3. Klik op het **pijltje naast "+"-knop** rechtsboven → **"Invite User"**
4. Vul:
   - Email: het testadres
   - Role: bv. "Content beheerder"
5. Klik **Invite**
6. Check inbox van testadres (incl. spam) binnen 1–2 min
7. Klik link → kies wachtwoord → bevestig
8. Je zou ingelogd moeten zijn op Data Studio

### Stap 4.3 — Test resend invite

Voor het geval een nieuwe beheerder de invite-mail kwijt raakt:

1. Settings → Access Control → Users
2. Klik op de user die status `Invited` heeft
3. Bovenaan: **Resend Invite** knop
4. Klik → nieuwe mail wordt verstuurd

Geen knop zichtbaar? Mogelijk verschilt het tussen Directus-versies. Alternatief: open de user → wijzig Role of klik Save → in sommige versies stuurt dit ook opnieuw een invite.

---

## 5. Geen allow-lists nodig

Volgens Directus 11-documentatie zijn `USER_INVITE_URL_ALLOW_LIST` en `PASSWORD_RESET_URL_ALLOW_LIST` env-vars **alleen nodig** wanneer je een **custom URL** voor invite/reset wilt instellen (een eigen frontend-pagina).

Wij gebruiken de standaard Data-Studio-flow → de mail-link leidt naar `{PUBLIC_URL}/admin/accept-invite` of `{PUBLIC_URL}/admin/reset-password` op het Directus-domein zelf. Dat valt automatisch binnen de toegestane URL's.

**Niet toevoegen aan docker-compose.yml.** Toevoegen zonder waarde of met verkeerde waarde kan de huidige werkende password-reset breken.

---

## 6. Wat NIET te doen

- **Geen** custom invite-URL-frontend bouwen (geen Next.js route voor accept-invite). Houd Data-Studio-flow.
- **Geen** tijdelijke wachtwoorden meer delen als A.1 werkt — gebruik A.1 (invite-flow). Alleen hoofdbeheerder bij echte noodsituaties.
- **Geen** Status handmatig op `Invited` zetten en hopen dat mail gaat. Gebruik altijd de **"Invite User"-actie**.
- **Geen** `USER_INVITE_URL_ALLOW_LIST` of `PASSWORD_RESET_URL_ALLOW_LIST` toevoegen zonder dat een custom frontend bestaat (kan password-reset breken).
- **Geen** wachtwoorden noteren, doorgeven of in mail/chat zetten.
- **Geen** `.env` committen naar git (al gitignored — verifieer).

---

## 7. Privacy & security

- **Geen wachtwoorden** in env-vars, code, logs, of mail (alleen SMTP-credentials)
- **Eenmalige, tijdsbeperkte links** voor zowel invite als reset (Directus default)
- **Geen analytics** op auth-flows
- **`.env` is gitignored** en alleen op productieserver aanwezig
- **Container-logs kunnen mail-adressen bevatten** bij verbose logging — bewaar logs intern, niet delen
- **SPF/DKIM/DMARC** op `al-ghofraan.nl` correct ingesteld voor spam-bescherming — zie [`EMAIL_DELIVERABILITY.md`](EMAIL_DELIVERABILITY.md) voor de volledige procedure

---

## 8. Cross-references

- [`PASSWORD_RESET.md`](PASSWORD_RESET.md) — sectie 7 (invite-flow) verwijst hier voor diagnose
- [`USER_MANAGEMENT.md`](USER_MANAGEMENT.md) — Workflow A.1 (invite-voorkeur) + A.2 (nood-fallback)
- [`DEPLOYMENT_CONTABO.md`](DEPLOYMENT_CONTABO.md) — sectie 5 (productie .env)
- [`EMAIL_DELIVERABILITY.md`](EMAIL_DELIVERABILITY.md) — SPF/DKIM/DMARC + `EMAIL_FROM` syntax voor spam-classificatie fix
- [`BEHEER_HANDLEIDING.md`](BEHEER_HANDLEIDING.md) — niet-technische uitleg voor nieuwe beheerders

---

## 9. Status — productie-uitrol voltooid (juni 2026)

Productie-deploy succesvol uitgevoerd. Invite-flow getest end-to-end op zowel Outlook (in spam — reputation-warming) als Gmail (in inbox). Accept-flow + wachtwoord-instellen + login werkt.

Werkende productie-config:
- `EMAIL_FROM=noreply@al-ghofraan.nl` (zonder display-name, zonder quotes)
- `EMAIL_TRANSPORT=smtp`
- `EMAIL_VERIFY_SETUP=true` in `docker-compose.yml`
- SMTP-relay via cPanel
- SPF/DKIM/DMARC actief op `al-ghofraan.nl`

Dit document blijft staan als referentie voor toekomstige troubleshooting.

---

## 10. Referenties

- Directus 11 docs — [Creating users (invite)](https://directus.io/docs/guides/auth/creating-users)
- Directus 11 docs — [Email configuration](https://directus.io/docs/configuration/email)
- Directus 11 docs — [User Directory](https://docs.directus.io/user-guide/user-management/user-directory)
- Directus 11 docs — [Access Control / status-waarden](https://directus.io/docs/guides/auth/access-control)
