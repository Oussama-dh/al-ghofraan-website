# Deployment op Contabo VPS

Deze handleiding beschrijft hoe je de Al-Ghofraan website deployt naar een Contabo VPS met Ubuntu 22.04 of 24.04.

> ⚠️ **Bouw eerst lokaal volledig werkend** voordat je deployt!

## 📋 Wat we gaan inrichten

```
┌─────────────────────────────────────────────────┐
│  Contabo VPS (Ubuntu 22.04+)                    │
│                                                 │
│  ┌─────────┐                                    │
│  │  Nginx  │ ← reverse proxy + SSL              │
│  └────┬────┘                                    │
│       │                                         │
│       ├─→ http://localhost:3000  (Next.js)      │
│       └─→ http://localhost:8055  (Directus)     │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Docker Compose                           │  │
│  │  ├─ postgres    (intern)                  │  │
│  │  ├─ directus    (intern + 8055)           │  │
│  │  └─ frontend    (intern + 3000)           │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    ↑ HTTPS (443)
                    │
              al-ghofraan.com
              cms.al-ghofraan.com
```

## 1️⃣ VPS voorbereiden

### SSH inloggen

```bash
ssh root@JOUW_VPS_IP
```

### Systeem updaten

```bash
apt update && apt upgrade -y
```

### Maak een non-root user (aanbevolen)

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Vanaf nu inloggen als `deploy`:

```bash
ssh deploy@JOUW_VPS_IP
```

### Firewall instellen

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### Fail2ban (optioneel, aanbevolen)

```bash
sudo apt install fail2ban -y
sudo systemctl enable --now fail2ban
```

## 2️⃣ Docker installeren

```bash
# Installatie
curl -fsSL https://get.docker.com | sudo sh

# Voeg deploy-user toe aan docker-groep
sudo usermod -aG docker deploy

# Log uit en weer in (of: newgrp docker)
exit
ssh deploy@JOUW_VPS_IP

# Test
docker --version
docker compose version
```

## 3️⃣ DNS configureren

Bij je domeinprovider (waar `al-ghofraan.com` geregistreerd is):

| Type | Naam   | Waarde            | TTL  |
|------|--------|-------------------|------|
| A    | `@`    | `JOUW_VPS_IP`     | 3600 |
| A    | `www`  | `JOUW_VPS_IP`     | 3600 |
| A    | `cms`  | `JOUW_VPS_IP`     | 3600 |

Wacht ~10-30 minuten op DNS propagatie. Test:

```bash
dig al-ghofraan.com +short
dig cms.al-ghofraan.com +short
```

## 4️⃣ Repository clonen

```bash
cd /home/deploy
git clone https://github.com/Oussama-dh/al-ghofraan-website.git
cd al-ghofraan-website
```

## 5️⃣ Productie .env aanmaken

```bash
cp .env.example .env
nano .env
```

Stel **veilige** productie-waarden in:

```env
# Database — STERKE wachtwoorden!
POSTGRES_DB=alghofraan
POSTGRES_USER=alghofraan
POSTGRES_PASSWORD=GEBRUIK_HIER_EEN_STERK_WACHTWOORD

# Directus
DIRECTUS_SECRET=GENEREER_LANGE_RANDOM_STRING_MIN_64_TEKENS
DIRECTUS_ADMIN_EMAIL=el-masoudi@hotmail.com
DIRECTUS_ADMIN_PASSWORD=KIES_EEN_STERK_WACHTWOORD
DIRECTUS_PUBLIC_URL=https://cms.al-ghofraan.com

# Frontend ↔ Directus
NEXT_PUBLIC_DIRECTUS_URL=https://cms.al-ghofraan.com
DIRECTUS_TOKEN=  # vul aan na eerste opstart

# CORS
CORS_ORIGIN=https://al-ghofraan.com,https://www.al-ghofraan.com
```

> 💡 Genereer een `DIRECTUS_SECRET` met:
> ```bash
> openssl rand -base64 64
> ```

### Bestand beveiligen

```bash
chmod 600 .env
```

## 6️⃣ Productie docker-compose

Maak een productie-overlay aan:

```bash
nano docker-compose.prod.yml
```

```yaml
services:
  postgres:
    restart: always
    # Geen poorten extern!
    ports: []

  directus:
    restart: always
    ports:
      - "127.0.0.1:8055:8055"  # alleen lokaal
    environment:
      LOG_LEVEL: "info"

  frontend:
    restart: always
    build:
      target: runner   # productie multi-stage
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      NODE_ENV: production
    volumes: []        # geen mount in productie
```

### Frontend bouwen voor productie

Pas eenmalig `next.config.ts` aan om standalone output in te schakelen — voeg toe:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  // ...rest blijft gelijk
};
```

(Of voeg dit toe via een PR in GitHub.)

### Eerste start

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Volg de logs:

```bash
docker compose logs -f
```

## 7️⃣ Nginx installeren en configureren

```bash
sudo apt install nginx -y
```

### Site config voor frontend

```bash
sudo nano /etc/nginx/sites-available/al-ghofraan.com
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name al-ghofraan.com www.al-ghofraan.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Beveiligingsheaders
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 50M;
}
```

### Site config voor Directus

```bash
sudo nano /etc/nginx/sites-available/cms.al-ghofraan.com
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name cms.al-ghofraan.com;

    location / {
        proxy_pass http://127.0.0.1:8055;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 50M;
}
```

### Activeren

```bash
sudo ln -s /etc/nginx/sites-available/al-ghofraan.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/cms.al-ghofraan.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

sudo nginx -t          # syntaxis-check
sudo systemctl reload nginx
```

## 8️⃣ SSL via Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y

sudo certbot --nginx \
  -d al-ghofraan.com \
  -d www.al-ghofraan.com \
  -d cms.al-ghofraan.com \
  --email el-masoudi@hotmail.com \
  --agree-tos \
  --no-eff-email
```

Certbot werkt je Nginx-configs automatisch bij voor HTTPS.

### Auto-renewal testen

```bash
sudo certbot renew --dry-run
```

## 9️⃣ Backups instellen

### PostgreSQL dagelijkse dump

Maak het script:

```bash
sudo nano /usr/local/bin/backup-alghofraan.sh
```

```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/al-ghofraan"
DATE=$(date +%Y-%m-%d_%H-%M)
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

# Postgres dump
docker exec alghofraan_postgres pg_dump -U alghofraan alghofraan \
  | gzip > "$BACKUP_DIR/postgres_${DATE}.sql.gz"

# Directus uploads
docker run --rm \
  -v alghofraan_directus_uploads:/data \
  -v "$BACKUP_DIR:/backup" \
  alpine tar czf "/backup/uploads_${DATE}.tar.gz" -C /data .

# Verwijder oude backups
find "$BACKUP_DIR" -name "postgres_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz"  -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup voltooid: $DATE"
```

```bash
sudo chmod +x /usr/local/bin/backup-alghofraan.sh
```

### Cronjob (dagelijks 03:00)

```bash
sudo crontab -e
```

Voeg toe:
```
0 3 * * * /usr/local/bin/backup-alghofraan.sh >> /var/log/al-ghofraan-backup.log 2>&1
```

### Off-site backups (sterk aanbevolen)

Sync naar externe storage (Backblaze B2, S3, of Contabo Object Storage) met `rclone` of `restic`. Voorbeeld met restic:

```bash
sudo apt install restic
restic init --repo b2:bucketnaam:al-ghofraan-backup
# Voeg in cronjob na backup-script:
# restic backup /var/backups/al-ghofraan
```

## 🔄 Updates deployen

### Code wijzigingen pullen en herbouwen

```bash
cd /home/deploy/al-ghofraan-website
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Alleen frontend opnieuw bouwen

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend
```

### Logs bekijken

```bash
docker compose logs -f --tail=100
```

## 🛡️ Security checklist productie

- [ ] Sterke wachtwoorden in `.env` (min. 24 tekens, random)
- [ ] `.env` heeft permissies `600`
- [ ] Firewall aan (`ufw status`)
- [ ] SSH key-only login (`PasswordAuthentication no` in `/etc/ssh/sshd_config`)
- [ ] Fail2ban actief
- [ ] Automatische OS-updates via `unattended-upgrades`:
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```
- [ ] SSL geforceerd (Certbot doet dit standaard)
- [ ] Backups draaien en zijn off-site
- [ ] Postgres alleen intern bereikbaar (geen poort 5432 in `docker-compose.prod.yml`)
- [ ] Directus admin-rol heeft 2FA aan

## 📊 Monitoring (optioneel)

- **Uptime**: [UptimeRobot](https://uptimerobot.com/) (gratis tier)
- **Logs**: `journalctl -u nginx`, `docker compose logs`
- **Server stats**: `htop`, `docker stats`

## ❓ Troubleshooting

**Frontend laadt niet**:
```bash
docker compose logs frontend
sudo systemctl status nginx
```

**Directus 502**:
```bash
docker compose logs directus
docker compose ps
```

**SSL renewal mislukt**:
```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

**Disk vol**:
```bash
docker system prune -a    # ⚠️ Verwijdert ongebruikte images
df -h
```

## 📞 Support

Bij problemen: zie de Directus en Next.js documentatie of open een issue op de GitHub repo.
