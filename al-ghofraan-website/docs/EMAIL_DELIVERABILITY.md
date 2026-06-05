# Email Deliverability — SPF, DKIM, DMARC voor al-ghofraan.nl

Deze doc legt uit waarom mails vanaf `noreply@al-ghofraan.nl` (Directus invites, password-resets, frontend admin-notificaties) in spam kunnen belanden, en hoe je dit oplost via DNS- en cPanel-configuratie.

> **Wanneer gebruik je dit document?**
> Wanneer mails vanaf `al-ghofraan.nl` in de spam-folder van ontvangers belanden, of na elke wijziging van mail-infrastructuur (nieuwe SMTP-server, ander domein, etc.).
>
> Voor de invite-flow zelf: zie [`DIRECTUS_INVITE_FLOW.md`](DIRECTUS_INVITE_FLOW.md).
> Voor password-reset: zie [`PASSWORD_RESET.md`](PASSWORD_RESET.md).

---

## 1. Waarom belanden mails in spam?

Ontvangers (Outlook, Gmail, etc.) gebruiken drie DNS-records om te verifiëren dat een mail **echt** afkomstig is van de claim-domein:

1. **SPF** — welke servers mogen mailen namens dit domein
2. **DKIM** — cryptografische handtekening die bewijst dat de mail niet onderweg is gewijzigd
3. **DMARC** — wat te doen als SPF of DKIM faalt

Ontbreekt één van deze, of staat er een mismatch, dan markeert de ontvanger de mail als **verdacht** of **spam**. Dit gebeurt zelfs als de mail technisch correct is — het gaat puur om **bewijs van legitimiteit**.

### Onze situatie

| Component | Waar het draait |
|---|---|
| Directus (verstuurder) | Contabo VPS |
| SMTP-relay | cPanel mailserver (`mail.al-ghofraan.nl`) |
| Mailbox | cPanel (`noreply@al-ghofraan.nl`) |
| DNS records | DNS-host van `al-ghofraan.nl` (vermoedelijk dezelfde als hosting) |

De mail gaat dus: **Directus (Contabo) → cPanel SMTP → ontvanger**. Voor SPF/DKIM telt alleen de **laatste hop** (cPanel) — dat is de feitelijke verzender. Daarom werkt cPanel's eigen SPF/DKIM-configuratie meestal voor ons setup.

---

## 2. SPF — Sender Policy Framework

### Wat het is

Een **TXT-record** op `al-ghofraan.nl` dat aangeeft welke IPs/domeinen mail mogen versturen "namens" dit domein.

### Voorbeeld waarde

```
v=spf1 +a +mx +ip4:<jouw-cpanel-ip> include:_spf.cpanelmail.com ~all
```

Uitleg:
- `v=spf1` — SPF versie 1
- `+a` — toegestaan: het A-record IP van het domein
- `+mx` — toegestaan: de MX-records (mailservers) van het domein
- `+ip4:<cpanel-ip>` — toegestaan: specifiek IP-adres
- `include:_spf.cpanelmail.com` — toegestaan: alles wat cPanel's eigen SPF toestaat (recursive lookup)
- `~all` — soft-fail voor andere senders (mag in spam, niet automatisch weigeren)

### `~all` vs `-all`

- `~all` (soft-fail) — verdacht maar niet automatisch geweigerd. **Aanbevolen tijdens setup.**
- `-all` (hard-fail) — automatisch geweigerd. Pas overstappen na 1-2 weken succesvolle test-periode.
- `?all` (neutral) — geen oordeel. **Niet gebruiken** — gelijk aan geen SPF.
- `+all` (allow all) — iedereen mag mailen. **Nooit gebruiken** — gelijk aan geen SPF.

### PowerShell check

```powershell
Resolve-DnsName -Name al-ghofraan.nl -Type TXT | Where-Object { $_.Strings -match "spf" } | Select-Object -ExpandProperty Strings
```

**Verwacht**: één regel beginnend met `v=spf1`.

**Geen output**: SPF ontbreekt → mails worden zonder twijfel als spam gemarkeerd.

**Twee of meer regels beginnend met `v=spf1`**: meerdere SPF records → ongeldig (RFC zegt: één per domein). Consolideer naar één record.

### cPanel-fix

Login op cPanel → sectie **Email** → klik **Email Deliverability**.

Voor `al-ghofraan.nl`:
- Status "Valid" / groene vink → SPF is goed
- Status "Problems" / rood → klik **Manage** → klik **Repair** → cPanel genereert automatisch een correct SPF record

cPanel toont de gegenereerde waarde — vergelijk met je huidige DNS. Als het DNS extern wordt gehost (niet bij cPanel), kopieer de waarde en plak hem in jouw DNS-host (TransIP, Cloudflare, etc.) als TXT-record op `@` (root van domein).

---

## 3. DKIM — DomainKeys Identified Mail

### Wat het is

Een cryptografische handtekening die de mailserver toevoegt aan elke uitgaande mail. De **publieke sleutel** staat als TXT-record in DNS; de **private sleutel** zit op de mailserver. Ontvangers verifiëren de handtekening met de publieke sleutel.

### Selector

DKIM gebruikt een "selector" om meerdere sleutels per domein toe te staan. cPanel gebruikt meestal:
- `default._domainkey.al-ghofraan.nl`
- `cpanel._domainkey.al-ghofraan.nl`
- Of een willekeurige string als `dkim202301._domainkey.al-ghofraan.nl`

### Voorbeeld waarde

```
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDfMQI3...lange-string...IDAQAB
```

Uitleg:
- `v=DKIM1` — versie
- `k=rsa` — algoritme
- `p=<base64>` — publieke sleutel (lange string)

### PowerShell check

Probeer eerst `default`:
```powershell
Resolve-DnsName -Name default._domainkey.al-ghofraan.nl -Type TXT
```

Niets? Probeer `cpanel`:
```powershell
Resolve-DnsName -Name cpanel._domainkey.al-ghofraan.nl -Type TXT
```

Nog steeds niets? Selector vinden via een ontvangen mail:
1. Open één van de in-spam beland invite-mails in Outlook
2. Klik **Bestand → Eigenschappen** (of **Bron weergeven**)
3. Zoek in de mail-headers naar regel `DKIM-Signature: ...`
4. Zoek `s=<selector>;` — dat is de selector

Dan check:
```powershell
Resolve-DnsName -Name <selector>._domainkey.al-ghofraan.nl -Type TXT
```

**Verwacht**: lange string beginnend met `v=DKIM1; k=rsa; p=`.

**Geen output op enige selector**: DKIM is niet geactiveerd → mails worden ondertekend als spam.

### cPanel-fix

1. cPanel → **Email Deliverability**
2. Voor `al-ghofraan.nl` → klik **Manage**
3. Status "DKIM: Problem" → klik **Repair**
4. cPanel toont de DKIM-record-waarde (lange string)
5. Als DNS lokaal in cPanel staat: automatisch ingevuld
6. Als DNS extern: kopieer de selector + waarde → plak in externe DNS-host als TXT-record

**Belangrijk**: DKIM-key kan langer zijn dan 255 tekens. Sommige DNS-hosts splitsen dat in meerdere "quoted strings". cPanel doet dit zelf goed — externe host vereist soms handmatige splitsing. Test na propagatie (24-48u) of de record te resolven is.

---

## 4. DMARC — Domain-based Message Authentication

### Wat het is

Een TXT-record op `_dmarc.al-ghofraan.nl` dat aan ontvangers vertelt:
- Wat te doen als SPF én DKIM falen
- Waar rapporten heen te sturen over falende mails

DMARC werkt **bovenop** SPF en DKIM — beide moeten al werken voor DMARC zinvol is.

### Voorbeeld waarde

```
v=DMARC1; p=none; rua=mailto:dmarc@al-ghofraan.nl; ruf=mailto:dmarc@al-ghofraan.nl; fo=1; adkim=r; aspf=r
```

Uitleg:
- `v=DMARC1` — versie
- `p=none` — geen actie bij falen, alleen rapporten
- `rua=mailto:...` — aggregate reports (samenvattingen per dag)
- `ruf=mailto:...` — forensic reports (per failing mail) — optioneel
- `fo=1` — rapporteer bij elke SPF of DKIM fail
- `adkim=r` — relaxed DKIM alignment (subdomain-tolerant)
- `aspf=r` — relaxed SPF alignment

### `p=none` vs `p=quarantine` vs `p=reject`

**Verplicht** in deze volgorde te gebruiken:

1. **`p=none`** — alleen monitoren, geen actie. **Start hiermee.** 1-2 weken loggen, zien wat er wel/niet doorgaat. Geen risico op verloren legitieme mails.

2. **`p=quarantine`** — falende mails naar spam-folder. Overstappen als `p=none` geen problemen toont in rapporten.

3. **`p=reject`** — falende mails weigeren (bouncen). Pas overstappen na 2-4 weken succesvolle `p=quarantine`.

**Direct starten met `p=reject`** kan legitieme mails kapotmaken — niet aanbevolen.

### PowerShell check

```powershell
Resolve-DnsName -Name _dmarc.al-ghofraan.nl -Type TXT
```

**Verwacht**: één regel beginnend met `v=DMARC1; p=...`.

**Geen output**: DMARC ontbreekt → Outlook/Gmail moeten zelf raden wat te doen bij SPF/DKIM mismatch → vaak spam.

### Toevoegen via DNS-host

cPanel kan vaak géén DMARC genereren — dit doe je in de DNS-host (TransIP, Cloudflare, je registrar):

1. Login op DNS-host
2. Zone `al-ghofraan.nl` → DNS records
3. Toevoegen: **type TXT**, **host `_dmarc`**, **waarde** (zie boven), **TTL 3600**
4. Save
5. Wacht 24-48u voor DNS-propagatie
6. Verifieer met PowerShell-commando hierboven

---

## 5. Volledige diagnose-procedure

Een voorbeeld-sessie (kopieer de blokken één voor één):

```powershell
# Stap 1 — SPF
Write-Host "`n=== SPF check ===" -ForegroundColor Cyan
Resolve-DnsName -Name al-ghofraan.nl -Type TXT -ErrorAction SilentlyContinue |
    Where-Object { $_.Strings -match "spf" } |
    Select-Object -ExpandProperty Strings

# Stap 2 — DKIM (probeer 3 gangbare selectors)
Write-Host "`n=== DKIM check (default) ===" -ForegroundColor Cyan
Resolve-DnsName -Name default._domainkey.al-ghofraan.nl -Type TXT -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Strings

Write-Host "`n=== DKIM check (cpanel) ===" -ForegroundColor Cyan
Resolve-DnsName -Name cpanel._domainkey.al-ghofraan.nl -Type TXT -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Strings

Write-Host "`n=== DKIM check (mail) ===" -ForegroundColor Cyan
Resolve-DnsName -Name mail._domainkey.al-ghofraan.nl -Type TXT -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Strings

# Stap 3 — DMARC
Write-Host "`n=== DMARC check ===" -ForegroundColor Cyan
Resolve-DnsName -Name _dmarc.al-ghofraan.nl -Type TXT -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Strings

# Stap 4 — MX (welke server is de "officiële" mailserver?)
Write-Host "`n=== MX records ===" -ForegroundColor Cyan
Resolve-DnsName -Name al-ghofraan.nl -Type MX -ErrorAction SilentlyContinue |
    Select-Object NameExchange, Preference
```

Stuur de output mee bij eventuele troubleshooting-vraag.

---

## 6. Stappenplan: van spam naar inbox

Aanbevolen volgorde:

### Fase 1 — `EMAIL_FROM` syntax fixen (5 min)

Op productie:
```bash
ssh productieserver
cd /pad/naar/repo
grep ^EMAIL_FROM= .env
```

Verwacht na fix:
```
EMAIL_FROM=noreply@al-ghofraan.nl
```

Alleen het mail-adres — geen display-name, geen quotes, geen hoeken-haken. De mailbox moet bestaan in cPanel.

Niet correct? `nano .env`, fix, save, dan:
```bash
docker compose up -d directus
```

Test met een nieuwe invite-mail.

### Fase 2 — SPF + DKIM in cPanel (15 min)

1. Login op cPanel
2. **Email** sectie → **Email Deliverability**
3. Domein `al-ghofraan.nl` → klik **Manage**
4. Voor SPF status "Problem" → klik **Repair** (cPanel maakt zelf record)
5. Voor DKIM status "Problem" → klik **Repair**
6. Verifieer in PowerShell na 5-10 min:
   ```powershell
   Resolve-DnsName -Name al-ghofraan.nl -Type TXT | Where-Object { $_.Strings -match "spf" }
   ```

Als DNS extern wordt gehost (niet bij cPanel): cPanel toont de records → kopieer + plak in jouw DNS-host.

### Fase 3 — DMARC monitoring instellen (10 min, dan 1-2 weken wachten)

Maak een dedicated mailbox `dmarc@al-ghofraan.nl` (in cPanel) om rapporten te ontvangen.

In DNS-host:
- Record type: **TXT**
- Host: **`_dmarc`** (niet de volledige naam — host geeft het voorvoegsel)
- Waarde: `v=DMARC1; p=none; rua=mailto:dmarc@al-ghofraan.nl; fo=1`
- TTL: 3600

Save. 24-48u wachten op DNS-propagatie. Verifieer:
```powershell
Resolve-DnsName -Name _dmarc.al-ghofraan.nl -Type TXT
```

Wacht 1-2 weken. Controleer dmarc-mailbox op aggregate reports. Geen reports = niemand mailt namens jouw domein illegaal → veilig om door te stappen.

### Fase 4 — DMARC aanscherpen (optioneel, na 1-2 weken `p=none`)

Update het DMARC record naar:
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@al-ghofraan.nl; fo=1
```

Pakt mails die falen → spam-folder.

Na nog eens 2-4 weken zonder problemen kun je naar `p=reject` (echt weigeren). Optioneel — voor een dawah-stichting is `p=quarantine` meestal genoeg.

### Fase 5 — Test eind-tot-eind

1. Stuur testinvite naar Gmail-adres
2. Open mail in Gmail → klik **drie-puntjes** → **Toon origineel**
3. Zoek bovenaan: **SPF: PASS**, **DKIM: PASS**, **DMARC: PASS**

Drie keer PASS = succes. Mail komt voortaan in inbox (niet spam) bij grote providers.

---

## 7. Specifiek voor Outlook/Microsoft

Outlook is **strenger dan gemiddeld** met SPF/DKIM/DMARC en spam-classificatie. Ook met perfecte records kan een nieuw domein tijdelijk in spam belanden door **reputatie-warming**:

- Outlook bouwt over weken/maanden een reputatie op per domein
- Nieuwe domeinen / lage volumes worden initieel verdacht
- Reputatie verbetert door consistente legitieme mailverkeer

**Tussentijdse oplossingen**:

1. **Ontvangers laten markeren als "Geen spam"** — Outlook leert van gebruikersgedrag. Vraag de eerste 5-10 ontvangers expliciet om dit te doen.
2. **Mailtester.com check** — stuur een test-mail naar het adres dat mail-tester.com toont. Krijg een score (0-10) met specifieke fixes voor je config. Gratis tot 3 tests per dag.
3. **Microsoft SNDS aanmelden** (Smart Network Data Services) — als je serieus volume gaat versturen. Buiten scope voor dawah-stichting.

---

## 8. Veelgemaakte fouten

| Fout | Symptoom | Fix |
|---|---|---|
| `EMAIL_FROM` met display-name + hoeken-haken | Directus parseert verkeerd, Gmail rejecteert silently | `EMAIL_FROM=noreply@al-ghofraan.nl` (alleen mail-adres) |
| Twee SPF-records op één domein | Mailservers negeren beide, behandelen als geen SPF | Consolideer naar één record |
| DKIM private key per ongeluk gepubliceerd | Iedereen kan namens jouw domein mailen | Roteer DKIM key direct |
| DMARC `p=reject` direct ingesteld | Legitieme mails verdwijnen | Start met `p=none`, escaleer geleidelijk |
| Externe DNS niet gesynchroniseerd met cPanel | cPanel toont "Valid" maar DNS-lookup faalt | Handmatig kopiëren cPanel-waarden naar externe DNS |
| TTL te hoog tijdens testen | Wijzigingen zichtbaar pas na 24-48u | Tijdelijk TTL=300 (5 min) tijdens setup |
| `_dmarc` als volledige hostname ingevuld | DNS-host maakt `_dmarc.al-ghofraan.nl.al-ghofraan.nl` | Voer alleen `_dmarc` in (zonder domein) |

---

## 9. Cross-references

- [`PASSWORD_RESET.md`](PASSWORD_RESET.md) — password-reset flow
- [`DIRECTUS_INVITE_FLOW.md`](DIRECTUS_INVITE_FLOW.md) — invite-flow diagnose
- [`DEPLOYMENT_CONTABO.md`](DEPLOYMENT_CONTABO.md) — productie deploy
- [`USER_MANAGEMENT.md`](USER_MANAGEMENT.md) — beheerders aanmaken

---

## 10. Externe referenties

- RFC 7208 — Sender Policy Framework (SPF)
- RFC 6376 — DomainKeys Identified Mail (DKIM)
- RFC 7489 — Domain-based Message Authentication, Reporting and Conformance (DMARC)
- cPanel docs — [Email Deliverability](https://docs.cpanel.net/cpanel/email/email-deliverability/)
- mail-tester.com — gratis mail-config diagnose tool
- Microsoft Postmaster Tools — voor Outlook/Hotmail reputatie

---

**Versie**: juni 2026 — geschreven na constatering dat invite-mails in Outlook-spam belanden.
