# TrustBridge — Deployment Guide

**Version:** 1.0.0  
**Last updated:** 2026-06-23  
**Audience:** Developers, IT administrators, DevOps

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Local Development](#3-local-development)
4. [Single PC Deployment](#4-single-pc-deployment)
5. [LAN Deployment](#5-lan-deployment)
6. [Office Deployment](#6-office-deployment)
7. [Multi-Router Deployment](#7-multi-router-deployment)
8. [Ubuntu Deployment](#8-ubuntu-deployment)
9. [Windows Deployment](#9-windows-deployment)
10. [Docker Deployment](#10-docker-deployment)
11. [Docker Compose Deployment](#11-docker-compose-deployment)
12. [NGINX Reverse Proxy](#12-nginx-reverse-proxy)
13. [Production Setup](#13-production-setup)
14. [Backup Strategy](#14-backup-strategy)
15. [Disaster Recovery](#15-disaster-recovery)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Overview

TrustBridge is a **LAN-first** secure communication platform. It does **not require cloud services** for core operation. Deploy one backend server on your network; clients connect via browser.

**Default ports:**
| Service | Port |
|---------|------|
| Backend API + WebSocket | 5000 |
| Frontend (Next.js) | 3000 |

**Bind address:** `0.0.0.0` (all interfaces) — required for LAN access.

---

## 2. Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18+ (20 LTS recommended) |
| npm | 9+ |
| SQLite | Bundled via Prisma |
| OS | Ubuntu 20.04+, Windows 10+, macOS 12+ |

**Network:**
- All clients must reach server IP on ports 3000 and 5000 (or NGINX proxy ports)
- No internet required after `npm install`

---

## 3. Local Development

### Clone & install
```bash
git clone <repository-url> TrustBridge
cd TrustBridge

cd backend && npm install && npx prisma generate
cd ../frontend && npm install
```

### Seed database (first run)
```bash
cd backend
npm run seed
```

### Configure frontend
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:5000/api
NEXT_PUBLIC_WEBSOCKET_URL=http://127.0.0.1:5000
NEXT_PUBLIC_SERVER_IP=127.0.0.1
```

### Run
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev:clean
```

Open: http://localhost:3000/login  
Login: `admin` / `admin123`

---

## 4. Single PC Deployment

Use when server and all users run on one machine (testing/demo).

1. Follow [Local Development](#3-local-development)
2. Use `127.0.0.1` in all env URLs
3. Access only from that PC

---

## 5. LAN Deployment

### Step 1 — Find server LAN IP
```bash
# Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig
```

Example: `192.168.18.139`

### Step 2 — Configure backend (`backend/.env`)
```env
PORT=5000
JWT_SECRET=<generate-strong-random-secret>
ENCRYPTION_KEY=<exactly-32-characters-minimum>
CLIENT_URL=http://192.168.18.139:3000
```

### Step 3 — Configure frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://192.168.18.139:5000/api
NEXT_PUBLIC_WEBSOCKET_URL=http://192.168.18.139:5000
NEXT_PUBLIC_SERVER_IP=192.168.18.139
```

### Step 4 — Start services
```bash
cd backend && npm start &
cd frontend && npm run build && npm start -H 0.0.0.0 -p 3000
```

### Step 5 — Client access
From any device on the same network:
```
http://192.168.18.139:3000/login
```

### Firewall (Ubuntu)
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
```

---

## 6. Office Deployment

**Recommended topology:**

```
[Workstations / Phones on LAN]
         │
         ▼
[TrustBridge Server — Ubuntu PC or VM]
  ├── Node backend :5000
  ├── Next.js frontend :3000
  ├── SQLite database
  └── uploads/ (encrypted files)
```

**Checklist:**
- [ ] Dedicated server machine with static LAN IP
- [ ] UPS for server (optional but recommended)
- [ ] Daily backup of `backend/prisma/dev.db` and `backend/uploads/`
- [ ] Change default `JWT_SECRET` and `ENCRYPTION_KEY`
- [ ] Change demo passwords after first login
- [ ] Document server IP for all staff

---

## 7. Multi-Router Deployment

When clients and server are on **different subnets** (e.g. 192.168.1.x vs 192.168.18.x):

1. Ensure **routing** between subnets (router static routes or same core switch)
2. Run `forward-ports.sh` on server (if provided) for iptables forwarding
3. Run `fix-multi-router.sh` to auto-detect and rewrite `.env.local`
4. Set `NEXT_PUBLIC_API_URL` to the **routable** server IP, not localhost
5. Verify from client: `curl http://<SERVER-IP>:5000/api/health`

**CORS:** Backend allows `origin: '*'` for LAN flexibility.

---

## 8. Ubuntu Deployment

### Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Deploy as systemd service (backend)
Create `/etc/systemd/system/trustbridge-api.service`:
```ini
[Unit]
Description=TrustBridge API Server
After=network.target

[Service]
Type=simple
User=trustbridge
WorkingDirectory=/opt/TrustBridge/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable trustbridge-api
sudo systemctl start trustbridge-api
```

### Frontend production
```bash
cd /opt/TrustBridge/frontend
npm run build
npm start -- -H 0.0.0.0 -p 3000
```

Or use PM2:
```bash
npm install -g pm2
pm2 start npm --name trustbridge-web -- start -- -H 0.0.0.0 -p 3000
pm2 save
```

---

## 9. Windows Deployment

### Install Node.js
Download from https://nodejs.org (LTS 20.x)

### Run backend
```powershell
cd C:\TrustBridge\backend
npm install
npx prisma generate
npm run seed
npm start
```

### Run frontend
```powershell
cd C:\TrustBridge\frontend
npm install
npm run build
npm start -- -H 0.0.0.0 -p 3000
```

### Windows Firewall
Allow inbound TCP 3000 and 5000 for Private networks.

### Find IP
```powershell
ipconfig
```
Use IPv4 address in `frontend/.env.local`.

---

## 10. Docker Deployment

> **Note:** `docker-compose.yml` in repo root is a stub. Use the template below.

### Backend Dockerfile (example)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
RUN npx prisma generate
EXPOSE 5000
CMD ["node", "server.js"]
```

### Build & run
```bash
docker build -t trustbridge-api -f Dockerfile.backend .
docker run -d \
  --name trustbridge-api \
  -p 5000:5000 \
  -v trustbridge-data:/app/prisma \
  -v trustbridge-uploads:/app/uploads \
  -e JWT_SECRET=your-secret \
  -e ENCRYPTION_KEY=your-32-byte-encryption-key!! \
  trustbridge-api
```

---

## 11. Docker Compose Deployment

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "5000:5000"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - PORT=5000
    volumes:
      - ./backend/prisma:/app/prisma
      - ./backend/uploads:/app/uploads
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:5000/api
      - NEXT_PUBLIC_WEBSOCKET_URL=http://api:5000
    depends_on:
      - api
    restart: unless-stopped
```

```bash
docker compose up -d
```

For LAN clients, set `NEXT_PUBLIC_*` to the **host machine's LAN IP**, not `api`.

---

## 12. NGINX Reverse Proxy

Use NGINX to serve on port 80/443 with TLS.

```nginx
upstream trustbridge_api {
    server 127.0.0.1:5000;
}

upstream trustbridge_web {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name trustbridge.local;

    location /api/ {
        proxy_pass http://trustbridge_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://trustbridge_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://trustbridge_web;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Update frontend env:
```env
NEXT_PUBLIC_API_URL=http://trustbridge.local/api
NEXT_PUBLIC_WEBSOCKET_URL=http://trustbridge.local
```

---

## 13. Production Setup

| Item | Action |
|------|--------|
| Secrets | Generate new `JWT_SECRET` (64+ chars) |
| Encryption | New `ENCRYPTION_KEY` (32 bytes) — **do not change after files encrypted** |
| Passwords | Reset all demo accounts |
| NODE_ENV | `production` |
| Process manager | systemd or PM2 |
| TLS | NGINX + Let's Encrypt (if internet available) or self-signed LAN cert |
| Logs | Redirect stdout to `/var/log/trustbridge/` |
| Updates | `git pull` → `npm install` → `npx prisma migrate deploy` → restart |

---

## 14. Backup Strategy

### What to backup
| Path | Contents |
|------|----------|
| `backend/prisma/dev.db` | All users, messages, metadata |
| `backend/uploads/` | Encrypted files + `.iv`/`.tag` sidecars |
| `backend/.env` | Secrets (store securely) |
| `frontend/.env.local` | Client config |

### Daily backup script (Ubuntu)
```bash
#!/bin/bash
BACKUP_DIR=/backup/trustbridge/$(date +%Y%m%d)
mkdir -p "$BACKUP_DIR"
cp /opt/TrustBridge/backend/prisma/dev.db "$BACKUP_DIR/"
tar -czf "$BACKUP_DIR/uploads.tar.gz" -C /opt/TrustBridge/backend uploads
```

### Retention
- Daily: 7 days
- Weekly: 4 weeks
- Test restore monthly

---

## 15. Disaster Recovery

### Database lost
1. Stop backend
2. Restore `dev.db` from latest backup
3. Run `npx prisma generate`
4. Restart backend

### Uploads lost
1. Restore `uploads/` from backup
2. Encrypted files require matching `.iv` and `.tag` sidecars

### Encryption key lost
⚠️ **Encrypted files cannot be recovered** without `ENCRYPTION_KEY`. Store key in secure vault.

### Full server rebuild
1. Install Node.js 20
2. Clone repo
3. Restore `dev.db`, `uploads/`, `.env`
4. `npm install` in backend and frontend
5. `npx prisma generate`
6. Start services

**RTO target:** < 1 hour with prepared backups  
**RPO target:** 24 hours (daily backup)

---

## 16. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Frontend 500 / module not found | Stale `.next` cache | `rm -rf frontend/.next && npm run dev:clean` |
| Cannot connect to API | Wrong `NEXT_PUBLIC_API_URL` | Use server LAN IP, not localhost from remote PC |
| Socket offline | WebSocket URL mismatch | Match `NEXT_PUBLIC_WEBSOCKET_URL` to API host |
| EADDRINUSE :5000 | Duplicate backend | `kill $(lsof -t -i:5000)` |
| Login works, chat fails | Socket JWT / firewall | Check port 5000 open; restart backend |
| File upload fails | Size limit | Default 50MB multer; check `MAX_FILE_SIZE` |
| Prisma errors after migration | Stale client | `npx prisma generate` + restart backend |

See also: [README.md](../README.md) Troubleshooting section.

---

*TrustBridge Deployment Guide — Phase 0.5*
