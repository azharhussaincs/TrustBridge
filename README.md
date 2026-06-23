# TrustBridge

**Secure LAN Communication Platform** — Role-based encrypted messaging and file sharing for organizational internal networks. No cloud dependency required.

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-Proprietary-blue)]()

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Database Structure](#database-structure)
- [Role Structure](#role-structure)
- [Permission Matrix](#permission-matrix)
- [Installation Guide](#installation-guide)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Running Backend](#running-backend)
- [Running Frontend](#running-frontend)
- [Running Full Stack](#running-full-stack)
- [Testing](#testing)
- [LAN Deployment](#lan-deployment)
- [Windows Deployment](#windows-deployment)
- [Ubuntu Deployment](#ubuntu-deployment)
- [Docker Deployment](#docker-deployment)
- [Docker Compose Deployment](#docker-compose-deployment)
- [NGINX Deployment](#nginx-deployment)
- [Production Deployment](#production-deployment)
- [Backup Strategy](#backup-strategy)
- [Security Features](#security-features)
- [Troubleshooting](#troubleshooting)
- [Common Errors](#common-errors)
- [API Overview](#api-overview)
- [Future Roadmap](#future-roadmap)
- [Contributing Guide](#contributing-guide)
- [License](#license)

---

## Project Overview

TrustBridge is an enterprise-oriented **LAN-first** communication system designed for organizations that need secure internal messaging without relying on external cloud services. It provides:

- **Five distinct user roles** with isolated dashboards and permission boundaries
- **Real-time 1:1 chat** via Socket.io with offline message delivery
- **AES-256-GCM encrypted file sharing** between authorized users
- **JWT-authenticated REST API** with socket-level RBAC
- **Zero Trust principles** — every request and socket event is validated

**Current SRS compliance:** ~42% — core LAN chat, auth, roles, and file sharing are operational. See [docs/SRS_COMPLIANCE_REPORT.md](docs/SRS_COMPLIANCE_REPORT.md) for the full gap analysis.

---

## Features

### Implemented ✅
| Feature | Description |
|---------|-------------|
| Username login | bcrypt password hashing, JWT sessions |
| Role-based dashboards | Admin, Super User, Team Lead, Manager, Member |
| Real-time chat | Socket.io, typing indicators, online status, read receipts |
| Unread badges | Per-user and total counts |
| File sharing | AES-GCM encrypted upload/download with progress |
| LAN binding | Server listens on `0.0.0.0` for network access |
| Socket security | JWT verification + `canUsersChat()` RBAC |
| Enterprise blue UI | Centralized theme via `theme.ts` + CSS variables |

### Planned / Partial ⚠️
| Feature | Status |
|---------|--------|
| Group / team chat | Not implemented |
| Audit log database | Demo UI only |
| Notification center | Toasts + badges only |
| Chunk file transfer | Single POST upload |
| LAN discovery UI | `discoverServer.js` exists, not wired |
| Dark/light mode toggle | CSS variables prepared |
| Settings page | Not implemented |

---

## Screenshots

> Screenshots are captured from the running application at `http://<LAN-IP>:3000`.

| Screen | Path | Description |
|--------|------|-------------|
| Login | `/login` | Blue enterprise login with role preview cards |
| Admin Panel | `/admin` | System overview, hierarchy, audit placeholder |
| Super User | `/super-user` | Executive dashboard with chat access |
| Team Lead | `/team-lead` | Team manager/member CRUD |
| Chat | `/chat` | Sidebar, bubbles, typing, file attach |
| Team Manager | `/team-manager` | Operational workspace |
| Team Member | `/team-member` | Staff workspace |

To capture locally:
```bash
# After starting the app
xdg-open http://localhost:3000/login
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browsers (LAN)                       │
│              Next.js 14 App  :3000  (0.0.0.0)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP /api/*
                           │ WebSocket (Socket.io)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              TrustBridge Backend  :5000  (0.0.0.0)           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Express API │  │ Socket.io    │  │ Permission Service  │ │
│  │ JWT Auth    │  │ JWT + RBAC   │  │ canUsersChat()      │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────────────┘ │
│         │                │                                   │
│         ▼                ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Prisma ORM → SQLite (dev.db)                        │   │
│  │ uploads/ — AES-GCM encrypted files + .iv/.tag       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**No external cloud services** are required for runtime operation.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Node.js 20, Express 5, Socket.io 4 |
| Database | SQLite via Prisma 5 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Encryption | AES-256-GCM (Node crypto) |
| Real-time | Socket.io |
| Notifications | react-hot-toast |

---

## Folder Structure

### Repository Root
```
TrustBridge/
├── backend/                 # Node.js API + WebSocket server
├── frontend/                # Next.js web application
├── docs/                    # Audit reports, deployment, permissions
├── README.md                # This file
├── docker-compose.yml       # Stub — see DEPLOYMENT_GUIDE.md
├── fix-multi-router.sh      # LAN IP env helper
└── forward-ports.sh         # iptables forwarding helper
```

### Backend (`backend/`)
```
backend/
├── server.js                # Entry point — HTTP + Socket.io, JWT middleware
├── prisma/
│   ├── schema.prisma        # Database models
│   ├── seed.js              # Demo user accounts
│   ├── dev.db               # SQLite database (runtime)
│   └── migrations/          # Schema migrations
├── uploads/                 # Encrypted file storage (+ .iv, .tag sidecars)
└── src/
    ├── app.js               # Express app, routes, CORS, health check
    ├── config/
    │   ├── constants.js     # Roles, communication rules, encryption constants
    │   └── encryption.js    # Key loading utilities
    ├── services/
    │   └── permission.service.js  # canUsersChat() — RBAC for messaging
    └── modules/
        ├── auth/            # Login, JWT, middleware
        │   ├── auth.service.js
        │   ├── auth.controller.js
        │   ├── auth.middleware.js
        │   └── auth.routes.js
        ├── user/            # User CRUD, role creation rules
        │   ├── user.service.js
        │   ├── user.controller.js
        │   └── user.routes.js
        ├── messaging/       # Message history, unread counts
        │   ├── message.service.js
        │   ├── message.controller.js
        │   └── message.routes.js
        ├── file-transfer/   # Upload, download, AES-GCM encryption
        │   ├── file.service.js
        │   ├── file.controller.js
        │   └── file.routes.js
        └── crypto/          # Encryption API endpoints
            ├── encryption.js
            ├── crypto.controller.js
            └── crypto.routes.js
```

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `src/modules/auth/` | Authentication & JWT | `auth.service.js`, `auth.middleware.js` |
| `src/modules/user/` | User management & RBAC creation rules | `user.service.js` |
| `src/modules/messaging/` | Chat message persistence | `message.service.js` |
| `src/modules/file-transfer/` | Encrypted file handling | `file.service.js` |
| `src/modules/crypto/` | Crypto utilities exposed via API | `encryption.js` |
| `src/services/` | Cross-cutting business logic | `permission.service.js` |
| `src/config/` | Constants and encryption config | `constants.js` |
| `prisma/` | Schema, migrations, seed | `schema.prisma`, `seed.js` |

### Frontend (`frontend/`)
```
frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── login/           # Authentication page
│   │   ├── admin/           # Admin dashboard + users
│   │   ├── super-user/      # Executive dashboard
│   │   ├── team-lead/       # Team Lead panel
│   │   ├── team-manager/    # Team Manager panel
│   │   ├── team-member/     # Team Member panel
│   │   ├── chat/            # Real-time messaging UI
│   │   ├── dashboard/       # Generic role hub
│   │   ├── globals.css      # Design system + CSS variables
│   │   └── layout.tsx       # Root layout, SocketProvider
│   ├── components/
│   │   ├── layout/          # Navbar, RoleHero, QuickActionGrid
│   │   ├── ui/              # Button, Card, Badge, Input, etc.
│   │   ├── chat/            # FileSharing component
│   │   └── providers/       # ToastProvider
│   ├── context/
│   │   └── SocketContext.jsx  # Socket.io state, unread, typing
│   └── lib/
│       ├── api/             # apiUrl(), fetch helpers
│       ├── roles.ts         # Role labels, colors, home paths
│       ├── theme.ts         # Centralized design tokens
│       ├── discoverServer.js  # LAN health probe (unused in UI)
│       └── utils.ts         # cn() classname helper
├── tailwind.config.js       # Tailwind theme extensions
└── .env.local               # API/WebSocket URLs (not committed)
```

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `src/app/` | Route pages per role | `login/page.tsx`, `chat/page.tsx` |
| `src/components/layout/` | Shared layout chrome | `Navbar.tsx`, `RoleHero.tsx` |
| `src/components/ui/` | Reusable UI primitives | `Button.tsx`, `Card.tsx` |
| `src/components/chat/` | File upload in chat | `FileSharing.jsx` |
| `src/context/` | Global React state | `SocketContext.jsx` |
| `src/lib/` | Utilities & config | `roles.ts`, `theme.ts`, `api/config.ts` |

### Documentation (`docs/`)
```
docs/
├── SRS_COMPLIANCE_REPORT.md
├── SECURITY_AUDIT.md
├── NETWORK_AUDIT.md
├── PERFORMANCE_AUDIT.md
├── RUN_VERIFICATION.md
├── BROWSER_TEST_REPORT.md
├── LOGIN_TEST_REPORT.md
├── DEPLOYMENT_GUIDE.md
├── PERMISSIONS.md
├── DATABASE.md
└── PHASE0_IMPLEMENTATION_PLAN.md
```

---

## Database Structure

**Engine:** SQLite (`backend/prisma/dev.db`)

### Models

#### User
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| username | String (unique) | Login identifier |
| password | String | bcrypt hash |
| name | String | Display name |
| role | String | ADMIN, SUPER_USER, TEAM_LEAD, TEAM_MANAGER, TEAM_MEMBER |
| teamId | String? | Team assignment |
| isOnline | Boolean | Socket presence |
| lastSeen | DateTime | Last activity |

#### Message
| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| content | String | Message body |
| senderId / receiverId | String | Participants |
| fileId | String? | Linked file |
| read / readAt | Boolean / DateTime | Read receipt |
| isEncrypted | Boolean | Flag (encryption at rest planned) |

#### File
| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| filename | String | Original name |
| path | String | Storage path |
| size | Int | Bytes |
| mimeType | String | MIME type |
| senderId / receiverId | String | Transfer parties |
| isEncrypted | Boolean | Always true (AES-GCM) |

#### Team
| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| name | String | Team name |
| leadId | String? | Team Lead reference |

> **Planned tables:** AuditLog, Notification, Session — see [docs/DATABASE.md](docs/DATABASE.md)

### Migrations
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

---

## Role Structure

| Role | Code | Dashboard | Chat | User Management |
|------|------|-----------|------|-----------------|
| Admin | `ADMIN` | `/admin` | ❌ No | Create Super User & Team Lead |
| Super User | `SUPER_USER` | `/super-user` | ✅ Leads & Managers | ❌ None |
| Team Lead | `TEAM_LEAD` | `/team-lead` | ✅ Team scope | CRUD Managers & Members |
| Team Manager | `TEAM_MANAGER` | `/team-manager` | ✅ Team scope | ❌ None |
| Team Member | `TEAM_MEMBER` | `/team-member` | ✅ Team scope | ❌ None |

---

## Permission Matrix

Full matrix: [docs/PERMISSIONS.md](docs/PERMISSIONS.md)

### User Creation
| Creator | Can Create |
|---------|------------|
| ADMIN | SUPER_USER, TEAM_LEAD |
| TEAM_LEAD | TEAM_MANAGER, TEAM_MEMBER |
| All others | None |

### Chat (simplified)
| From | Can Message |
|------|-------------|
| ADMIN | Nobody |
| SUPER_USER | Team Leads, Team Managers |
| TEAM_LEAD | Super User, other Leads, own team |
| TEAM_MANAGER | Super User, own Lead, own team |
| TEAM_MEMBER | Super User, own Lead/Manager, own team |

---

## Installation Guide

### 1. Clone repository
```bash
git clone <repository-url> TrustBridge
cd TrustBridge
```

### 2. Install backend
```bash
cd backend
npm install
npx prisma generate
npm run seed
```

### 3. Install frontend
```bash
cd ../frontend
npm install
```

### 4. Configure environment (see below)

### 5. Start services (see Running Full Stack)

---

## Local Development

```bash
# Backend
cd backend && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev:clean
```

Open http://localhost:3000/login

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | API port |
| `JWT_SECRET` | **Yes** | random string | JWT signing key |
| `JWT_EXPIRE` | No | `7d` | Token lifetime |
| `ENCRYPTION_KEY` | **Yes** | 32+ chars | AES-256-GCM key |
| `DATABASE_URL` | No | `sqlite:./dev.db` | Prisma connection |
| `CLIENT_URL` | No | `http://IP:3000` | CORS reference |
| `MAX_FILE_SIZE` | No | `10737418240` | Max upload bytes |
| `UPLOAD_DIR` | No | `./uploads` | File storage path |

### Frontend (`frontend/.env.local`)
| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | `http://192.168.1.10:5000/api` | REST API base |
| `NEXT_PUBLIC_WEBSOCKET_URL` | **Yes** | `http://192.168.1.10:5000` | Socket.io origin |
| `NEXT_PUBLIC_SERVER_IP` | No | `192.168.1.10` | LAN discovery helper |

> **Important:** Use your server's **LAN IP**, not `localhost`, when accessing from other devices.

---

## Running Backend

```bash
cd backend

# Development (auto-restart)
npm run dev

# Production
npm start
```

Health check:
```bash
curl http://localhost:5000/api/health
```

---

## Running Frontend

```bash
cd frontend

# Development (clears .next cache)
npm run dev:clean

# Production
npm run build
npm start -- -H 0.0.0.0 -p 3000
```

---

## Running Full Stack

```bash
# Terminal 1
cd ~/Desktop/TrustBridge/backend && npm run dev

# Terminal 2
cd ~/Desktop/TrustBridge/frontend && npm run dev:clean
```

**Demo accounts** (password: `admin123` for all):

| Username | Role |
|----------|------|
| `admin` | ADMIN |
| `superuser` | SUPER_USER |
| `teamlead` | TEAM_LEAD |
| `teammanager` | TEAM_MANAGER |
| `teammember` | TEAM_MEMBER |

---

## Testing

### Manual verification reports
- [docs/RUN_VERIFICATION.md](docs/RUN_VERIFICATION.md)
- [docs/BROWSER_TEST_REPORT.md](docs/BROWSER_TEST_REPORT.md)
- [docs/LOGIN_TEST_REPORT.md](docs/LOGIN_TEST_REPORT.md)

### Quick API test
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Automated tests
```bash
cd backend && npm test   # Not yet implemented — exits 1
```

---

## LAN Deployment

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for full details.

1. Find server IP: `hostname -I`
2. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WEBSOCKET_URL` to `http://<IP>:5000`
3. Open firewall ports 3000 and 5000
4. Clients browse to `http://<IP>:3000/login`

---

## Windows Deployment

1. Install Node.js 20 LTS
2. Clone repo to `C:\TrustBridge`
3. Configure `frontend\.env.local` with your IPv4 from `ipconfig`
4. Allow ports 3000/5000 in Windows Firewall
5. Run `npm start` in backend and `npm run build && npm start` in frontend

---

## Ubuntu Deployment

1. Install Node.js 20 via NodeSource
2. Deploy to `/opt/TrustBridge`
3. Create systemd service for backend
4. Use PM2 or systemd for frontend
5. Configure `ufw allow 3000,5000/tcp`

Full guide: [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

---

## Docker Deployment

Docker Compose template and Dockerfile examples are in [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md#10-docker-deployment).

---

## Docker Compose Deployment

```bash
# After creating docker-compose.yml per deployment guide
docker compose up -d
```

---

## NGINX Deployment

Reverse proxy configuration for port 80/443 with WebSocket upgrade support — see [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md#12-nginx-reverse-proxy).

---

## Production Deployment

| Step | Action |
|------|--------|
| 1 | Generate strong `JWT_SECRET` and `ENCRYPTION_KEY` |
| 2 | Change all demo passwords |
| 3 | `npm run build` frontend |
| 4 | Use PM2/systemd for process management |
| 5 | Set up NGINX + TLS (optional) |
| 6 | Configure daily backups |
| 7 | Set `NODE_ENV=production` |

---

## Backup Strategy

| Asset | Path | Frequency |
|-------|------|-----------|
| Database | `backend/prisma/dev.db` | Daily |
| Files | `backend/uploads/` | Daily |
| Secrets | `backend/.env` | On change (secure vault) |

```bash
cp backend/prisma/dev.db backup/dev.db.$(date +%Y%m%d)
tar -czf backup/uploads.$(date +%Y%m%d).tar.gz backend/uploads/
```

---

## Security Features

| Feature | Status |
|---------|--------|
| bcrypt password hashing | ✅ |
| JWT REST authentication | ✅ |
| Socket JWT verification | ✅ |
| Role-based chat RBAC | ✅ `canUsersChat()` |
| AES-256-GCM file encryption | ✅ |
| Admin cannot chat | ✅ |
| CORS open for LAN | ✅ (by design) |
| Rate limiting | ⚠️ Planned |
| Audit log DB | ⚠️ Planned |
| Message encryption at rest | ⚠️ Planned |

Full audit: [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Chat shows offline | Check `NEXT_PUBLIC_WEBSOCKET_URL`; restart backend |
| 500 on frontend pages | `rm -rf frontend/.next && npm run dev:clean` |
| Login works, no users in chat | Verify backend running; check API URL |
| Prisma client error | `npx prisma generate` + restart backend |
| Port in use | `lsof -i :5000` and kill duplicate process |

---

## Common Errors

### `Cannot find module './474.js'`
Stale Next.js cache. Fix:
```bash
cd frontend && rm -rf .next && npm run dev:clean
```

### `EADDRINUSE :5000`
Another backend instance is running:
```bash
kill $(lsof -t -i:5000)
```

### `Invalid credentials`
Run seed: `cd backend && npm run seed`  
Default password: `admin123`

### Socket `Authentication required`
Token missing or expired. Log out and log in again.

### `Connection error` on login
`NEXT_PUBLIC_API_URL` points to wrong IP. Update `.env.local` and restart frontend.

---

## API Overview

**Base URL:** `http://<host>:5000/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | Public | Server status |
| POST | `/auth/login` | Public | Login, returns JWT |
| GET | `/auth/verify` | Bearer | Validate token |
| GET | `/users` | Bearer | List users |
| POST | `/users` | Bearer + role | Create user |
| PUT | `/users/:id` | Bearer + role | Update user |
| DELETE | `/users/:id` | Bearer + role | Delete user |
| POST | `/users/:id/reset-password` | Admin | Reset password |
| GET | `/messages` | Bearer | Chat history |
| GET | `/messages/unread/count` | Bearer | Unread summary |
| POST | `/files/upload` | Bearer | Upload encrypted file |
| GET | `/files/download/:id` | Bearer | Download decrypted file |

**WebSocket events:** `register-user`, `private-message`, `typing`, `mark-read`, `get-unread-count`

---

## Future Roadmap

| Phase | Items |
|-------|-------|
| **Wave B** | AuditLog, Notifications, rate limiting, account lock |
| **Wave C** | Group chat, reactions, reply, search, message status enum |
| **Wave D** | Chunk upload, file preview, LAN discovery UI, QR connect |
| **Wave E** | Automated tests, Docker Compose, PostgreSQL migration |

See [docs/PHASE0_IMPLEMENTATION_PLAN.md](docs/PHASE0_IMPLEMENTATION_PLAN.md)

---

## Contributing Guide

1. **Audit first** — read `docs/SRS_COMPLIANCE_REPORT.md` before adding features
2. **No breaking changes** — preserve API contracts and LAN compatibility
3. **Small commits** — one concern per commit
4. **Match conventions** — UPPER_SNAKE roles, existing module layout
5. **Use theme tokens** — edit `src/lib/theme.ts` and `globals.css`, not hardcoded colors
6. **Test manually** — login all 5 roles, send chat message, upload file
7. **Document** — update README or `docs/` for deployment-impacting changes

### Branch workflow
```bash
git checkout -b feature/your-feature
# make changes
npm run build   # frontend
# test locally
git commit -m "feat: description"
```

---

## License

Proprietary — All rights reserved. Unauthorized distribution prohibited.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) | Full deployment scenarios |
| [SRS Compliance](docs/SRS_COMPLIANCE_REPORT.md) | Requirement traceability |
| [Security Audit](docs/SECURITY_AUDIT.md) | Security posture |
| [Permissions](docs/PERMISSIONS.md) | RBAC matrix |
| [Run Verification](docs/RUN_VERIFICATION.md) | Startup test results |

---

**TrustBridge** — Secure communication for your LAN. 🔐
