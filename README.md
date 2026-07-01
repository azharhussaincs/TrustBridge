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
- [Step-by-Step Setup on a New System](#step-by-step-setup-on-a-new-system-or-server)
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
- [CI/CD Auto Deploy (GitHub Actions)](#cicd-auto-deploy-github-actions)
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
| Group chat | Team Lead (own team) & Executive (any user); notifications |
| Audit log database | Demo UI only |
| Notification center | Toasts + badges only |
| Chunk file transfer | Single POST upload |
| LAN discovery UI | `discoverServer.js` exists, not wired |
| Dark/light mode toggle | CSS variables prepared |
| My Account | Any user can update name, username, password |

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
│  │ Prisma ORM → SQLite file (`backend/prisma/dev.db`)   │   │
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

#### ChatGroup / ChatGroupMember / GroupMessage
Group chat tables — created by Team Lead (within team) or Executive User (cross-team).

> **Planned tables:** AuditLog, Notification (DB), Session — see [docs/DATABASE.md](docs/DATABASE.md)

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

---

## Step-by-Step Setup on a New System or Server

This section is the **full guide** for installing TrustBridge (OpBridge) on a fresh PC, VM, or LAN server. No separate database server (MySQL/PostgreSQL) is required — the app uses **SQLite**, a single file on disk.

### What you need

| Requirement | Version / notes |
|-------------|-----------------|
| **Node.js** | 20 LTS or newer ([nodejs.org](https://nodejs.org)) |
| **npm** | Comes with Node.js |
| **Git** | To clone the repo (or copy the project folder manually) |
| **OS** | Linux (Ubuntu), Windows 10/11, or macOS |
| **Network** | Ports **3000** (frontend) and **5000** (backend) open on the server |
| **Disk** | ~500 MB for dependencies + space for `dev.db` and `uploads/` |

### Overview — what gets created where

| Item | Location | Purpose |
|------|----------|---------|
| SQLite database | `backend/prisma/dev.db` | Users, messages, teams, groups, files metadata |
| Uploaded files | `backend/uploads/` | AES-GCM encrypted files |
| Backend config | `backend/.env` | Secrets, port, upload path (**you create this**) |
| Frontend config | `frontend/.env.local` | Optional port override (**you create this**) |
| DB schema | `backend/prisma/schema.prisma` | Defines tables (SQLite) |
| Migrations | `backend/prisma/migrations/` | SQL applied to create/update `dev.db` |

---

### Step 1 — Get the project on the new machine

**Option A — Git clone**
```bash
git clone <repository-url> TrustBridge
cd TrustBridge
```

**Option B — Copy folder**  
Copy the entire `TrustBridge` folder (USB, SCP, zip). Do **not** copy `node_modules` if you can avoid it — reinstall dependencies on the new machine instead.

```bash
# On the new machine, after copy:
cd TrustBridge
```

---

### Step 2 — Install Node.js

**Ubuntu / Debian**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v    # should show v20.x or higher
npm -v
```

**Windows**  
Download and install **Node.js 20 LTS** from [nodejs.org](https://nodejs.org), then open PowerShell or CMD.

**macOS**
```bash
brew install node@20
```

---

### Step 3 — Backend: install dependencies

```bash
cd backend
npm install
```

---

### Step 4 — Database setup (SQLite)

TrustBridge uses **SQLite**. You do **not** install MySQL, PostgreSQL, or any database service.

1. The database file is **`backend/prisma/dev.db`** (created automatically).
2. Schema is defined in **`backend/prisma/schema.prisma`**.
3. Migrations in **`backend/prisma/migrations/`** create and update tables.

**On a new system, run migrations once:**

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

| Command | What it does |
|---------|----------------|
| `prisma migrate deploy` | Creates `dev.db` and applies all migrations |
| `prisma generate` | Builds the Prisma client used by the API |
| `npm run seed` | Creates demo users (optional, recommended for first run) |

**Seed demo users (password `admin123` for all):**
```bash
npm run seed
```

**Verify database exists:**
```bash
ls -la prisma/dev.db
```

> **Moving data from an old server:** Copy `backend/prisma/dev.db` and `backend/uploads/` to the new machine **after** the same migrations have been applied, or copy them over an empty migrated database. Always back up before replacing.

---

### Step 5 — Create `backend/.env`

Create the file **`backend/.env`** (it is not committed to Git). Copy this template and **change secrets** on any real deployment:

```env
# Server
PORT=5000
NODE_ENV=development

# REQUIRED — change on every new deployment (use long random strings)
JWT_SECRET=change_me_to_a_long_random_secret_at_least_32_chars
JWT_EXPIRE=7d
ENCRYPTION_KEY=change_me_32_chars_minimum_for_aes256

# Optional — Prisma reads path from schema.prisma (file:./dev.db)
# DATABASE_URL is kept for documentation; schema.prisma controls the SQLite path
DATABASE_URL="file:./dev.db"

# Optional — reference for CORS / docs (not strictly required for LAN)
CLIENT_URL=http://localhost:3000

# File uploads
MAX_FILE_SIZE=10737418240
UPLOAD_DIR=./uploads
```

| Variable | Required? | What to change on a new system |
|----------|-----------|--------------------------------|
| `JWT_SECRET` | **Yes** | Generate a new random string (never reuse from another server unless migrating sessions) |
| `ENCRYPTION_KEY` | **Yes** | At least 32 characters; **must stay the same** if you copy `uploads/` from an old server (files are encrypted with this key) |
| `PORT` | No | Default `5000`; change if port is already in use |
| `UPLOAD_DIR` | No | Default `./uploads`; use an absolute path on production if needed |
| `CLIENT_URL` | No | Set to `http://<server-ip>:3000` for documentation |
| `NODE_ENV` | No | Set to `production` on a live server |

**Generate secrets (Linux/macOS):**
```bash
openssl rand -base64 32
```

---

### Step 6 — Frontend: install dependencies

```bash
cd ../frontend
npm install
```

---

### Step 7 — Create `frontend/.env.local` (optional but recommended)

Create **`frontend/.env.local`**:

```env
# Backend API port (must match backend PORT)
NEXT_PUBLIC_BACKEND_PORT=5000
```

**How the frontend finds the API**

- In the **browser**, the app automatically uses the **same hostname** as the page you opened.
  - Open `http://localhost:3000` → API calls go to `http://localhost:5000/api`
  - Open `http://192.168.1.50:3000` → API calls go to `http://192.168.1.50:5000/api`
- You usually **do not** need `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_WEBSOCKET_URL` unless you use a reverse proxy or split frontend/backend across machines.

**Only if frontend and backend are on different hosts** (uncommon for LAN):
```env
NEXT_PUBLIC_API_URL=http://192.168.1.50:5000/api
NEXT_PUBLIC_WEBSOCKET_URL=http://192.168.1.50:5000
NEXT_PUBLIC_BACKEND_PORT=5000
```

---

### Step 8 — Start the application

Use **two terminals** (or run as background services in production).

**Terminal 1 — Backend**
```bash
cd backend
npm run dev          # development (auto-restart)
# OR
npm start            # production
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev:clean    # development (clears Next.js cache)
# OR for production:
npm run build
npm start
```

Both bind to **all interfaces** (`0.0.0.0`) so other devices on the LAN can connect.

---

### Step 9 — Verify installation

**Backend health**
```bash
curl http://localhost:5000/api/health
```

**Login test**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Browser**  
Open: `http://localhost:3000/login`

Demo accounts (after `npm run seed`):

| Username | Role | Password |
|----------|------|----------|
| `admin` | ADMIN | `admin123` |
| `superuser` | SUPER_USER (Executive) | `admin123` |
| `teamlead` | TEAM_LEAD | `admin123` |
| `teammanager` | TEAM_MANAGER | `admin123` |
| `teammember` | TEAM_MEMBER | `admin123` |

> Change all demo passwords before production use.

---

### Step 10 — Access from other devices on the LAN

1. Find the server IP:
   ```bash
   # Linux
   hostname -I
   # Windows
   ipconfig
   ```
2. Ensure firewall allows **TCP 3000** and **5000**:
   ```bash
   # Ubuntu example
   sudo ufw allow 3000/tcp
   sudo ufw allow 5000/tcp
   ```
3. On another PC/phone on the same network, open:
   ```
   http://<SERVER-IP>:3000/login
   ```
4. No `.env` change is needed on the frontend if you use the LAN IP in the browser — API URLs follow the hostname automatically.

---

### What to change when moving to another system

| File / setting | Action |
|----------------|--------|
| `backend/.env` → `JWT_SECRET` | **Generate new** on fresh install; keep old only if migrating same deployment |
| `backend/.env` → `ENCRYPTION_KEY` | **Keep the same** if copying `uploads/` from old server; **new** if starting fresh |
| `backend/.env` → `PORT` | Change only if 5000 is taken |
| `backend/.env` → `CLIENT_URL` | Update to new IP/hostname |
| `frontend/.env.local` → `NEXT_PUBLIC_BACKEND_PORT` | Match backend `PORT` |
| `backend/prisma/dev.db` | Copy from old server to keep users/messages, or run `migrate deploy` + `seed` for fresh DB |
| `backend/uploads/` | Copy with `dev.db` to keep shared files |
| Firewall | Open 3000 + 5000 on new server |
| `node_modules` | Run `npm install` again in `backend/` and `frontend/` — do not copy |

**Do not copy** `frontend/.next/` — run `npm run build` on the new machine for production.

---

### Quick setup checklist (copy-paste order)

```bash
# 1. Prerequisites: Node.js 20+ installed

# 2. Backend
cd backend
npm install
# Create backend/.env manually — see Step 5 above
npx prisma migrate deploy
npx prisma generate
npm run seed
npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
echo "NEXT_PUBLIC_BACKEND_PORT=5000" > .env.local
npm run dev:clean

# 4. Browser
# http://localhost:3000/login  (or http://<LAN-IP>:3000/login)
```

---

## Installation Guide

Short summary — see [Step-by-Step Setup on a New System](#step-by-step-setup-on-a-new-system-or-server) for the full guide.

### 1. Clone repository
```bash
git clone <repository-url> TrustBridge
cd TrustBridge
```

### 2. Backend — install, configure `.env`, database
```bash
cd backend
npm install
# Create backend/.env — see Step 5 in the full setup guide
npx prisma migrate deploy
npx prisma generate
npm run seed
```

### 3. Frontend — install, optional `.env.local`
```bash
cd ../frontend
npm install
# Create frontend/.env.local with NEXT_PUBLIC_BACKEND_PORT=5000
```

### 4. Start both services
```bash
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm run dev:clean
```

### 5. Open `http://localhost:3000/login` (or `http://<LAN-IP>:3000/login`)

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

### Backend (`backend/.env`) — **create this file yourself**

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | API + WebSocket port |
| `NODE_ENV` | No | `development` / `production` | Runtime mode |
| `JWT_SECRET` | **Yes** | long random string | Signs login tokens — **change on every deployment** |
| `JWT_EXPIRE` | No | `7d` | Token lifetime |
| `ENCRYPTION_KEY` | **Yes** | 32+ characters | AES-256-GCM file encryption — **keep when migrating uploads** |
| `DATABASE_URL` | No | `file:./dev.db` | Documented; actual path is in `prisma/schema.prisma` |
| `CLIENT_URL` | No | `http://192.168.1.10:3000` | Optional reference |
| `MAX_FILE_SIZE` | No | `10737418240` | Max upload size in bytes (10 GB) |
| `UPLOAD_DIR` | No | `./uploads` | Encrypted file storage folder |

**Template** — see [Step 5 — Create backend/.env](#step-5--create-backendenv).

### Frontend (`frontend/.env.local`) — **create this file yourself**

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_BACKEND_PORT` | Recommended | `5000` | Must match backend `PORT` |
| `NEXT_PUBLIC_API_URL` | No | `http://192.168.1.10:5000/api` | Only if API is on a **different host** than the browser |
| `NEXT_PUBLIC_WEBSOCKET_URL` | No | `http://192.168.1.10:5000` | Only if socket server is on a **different host** |

> **LAN tip:** If frontend and backend run on the **same machine**, open the app as `http://<that-machine-IP>:3000` — API and WebSocket URLs are built from the browser hostname automatically. You only need `NEXT_PUBLIC_BACKEND_PORT=5000`.

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

See [Step-by-Step Setup — Step 10](#step-10--access-from-other-devices-on-the-lan) and [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).

1. Find server IP: `hostname -I` (Linux) or `ipconfig` (Windows)
2. Ensure `NEXT_PUBLIC_BACKEND_PORT=5000` in `frontend/.env.local`
3. Open firewall ports **3000** and **5000**
4. Clients browse to `http://<IP>:3000/login` (API follows hostname automatically)

---

## Windows Deployment

1. Install **Node.js 20 LTS** from [nodejs.org](https://nodejs.org)
2. Clone or copy repo to e.g. `C:\TrustBridge`
3. Create `backend\.env` (see [Step 5](#step-5--create-backendenv))
4. In PowerShell:
   ```powershell
   cd C:\TrustBridge\backend
   npm install
   npx prisma migrate deploy
   npx prisma generate
   npm run seed
   npm run dev
   ```
5. Second PowerShell window:
   ```powershell
   cd C:\TrustBridge\frontend
   npm install
   echo NEXT_PUBLIC_BACKEND_PORT=5000 > .env.local
   npm run dev:clean
   ```
6. Allow ports **3000** and **5000** in Windows Firewall
7. Open `http://localhost:3000/login` or `http://<your-ipv4>:3000/login`

---

## Ubuntu Deployment

1. Install Node.js 20 (see [Step 2](#step-2--install-nodejs))
2. Deploy to `/opt/TrustBridge` or `~/TrustBridge`
3. Follow [Step-by-Step Setup](#step-by-step-setup-on-a-new-system-or-server) through database and `.env`
4. Production process managers:
   ```bash
   # Backend with PM2
   cd backend && npm install -g pm2
   pm2 start server.js --name trustbridge-api
   pm2 save

   # Frontend
   cd frontend && npm run build
   pm2 start npm --name trustbridge-web -- start
   ```
5. Firewall: `sudo ufw allow 3000/tcp && sudo ufw allow 5000/tcp`

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

---

## CI/CD Auto Deploy (GitHub Actions)

Push to `main` triggers **Deploy to VM** (`.github/workflows/deploy.yml`). It runs on a **self-hosted runner** on the VM — label `opbridge`.

### Infrastructure

| Item | Value |
|------|--------|
| Proxmox host | `https://192.168.18.9:8006` |
| OpBridge VM IP | `192.168.18.141` (static) |
| App URL | `http://192.168.18.141:3000/login` |
| Deploy path on VM | `/opt/TrustBridge` |
| Process manager | PM2 (`opbridge-api`, `opbridge-web`) |

### Why workflows stay **Queued**

GitHub Actions shows **Queued** when the **self-hosted runner is offline**. That happens when:

1. The VM `192.168.18.141` is **powered off** in Proxmox  
2. The VM is on but the **runner service** is stopped  
3. Your PC cannot reach the VM network (different VLAN / VPN / cable)

**Queued ≠ failed** — jobs run automatically once the VM and runner are online.

### One-time setup on the VM (already done if deploy #1–3 succeeded)

```bash
# On VM 192.168.18.141 — register GitHub runner
export GITHUB_RUNNER_TOKEN="token-from-github-settings-actions-runners"
bash /opt/TrustBridge/deploy/setup-github-runner.sh
```

### Fix: start VM + deploy + runner

**A. From Proxmox web UI** (`https://192.168.18.9:8006`)

1. Log in → select the OpBridge VM → **Start**  
2. Wait 1–2 minutes for boot  

**B. From your PC (same LAN as Proxmox)** — start VM via API:

```bash
export PROXMOX_HOST=192.168.18.9
export PROXMOX_USER=azhar@pam
export PROXMOX_PASS='your-proxmox-password'   # never commit this
bash deploy/proxmox-start-vm.sh
```

**C. SSH to VM and deploy latest code:**

```bash
ssh admin@192.168.18.141
cd /opt/TrustBridge && bash deploy/server-deploy.sh
```

**D. Start GitHub runner (clears Queued jobs):**

```bash
cd ~/actions-runner && sudo ./svc.sh start
sudo ./svc.sh status
```

Queued workflows will then run within 1–2 minutes.

### Manual deploy without waiting for runner

```bash
ssh admin@192.168.18.141
cd /opt/TrustBridge && git pull origin main && bash deploy/ci-deploy.sh
```

### From dev PC (when VM is online)

```bash
bash deploy/deploy-to-vm.sh admin
```

### Security

- Store Proxmox and VM passwords in a password manager — **never** commit them to Git  
- Change default VM password (`admin`) after first login  
- Rotate secrets if they were shared in chat or tickets  

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
| Chat shows offline | Backend must run on `0.0.0.0:5000`; check firewall |
| `Failed to fetch` on login | Backend not running or wrong port; check `curl http://localhost:5000/api/health` |
| `Failed to fetch` on My Account save | Restart backend after CORS update; `PATCH` must be allowed |
| Login timeout / Prisma error | SQLite lock — restart backend; only one `npm run dev` for backend |
| 500 on frontend pages | `rm -rf frontend/.next && npm run dev:clean` |
| Login works, no users in chat | Verify backend running; open app via same hostname as API |
| Prisma client error | `npx prisma generate` + restart backend |
| Deploy workflow stuck **Queued** | VM off or runner stopped — start VM in Proxmox, then `sudo ./svc.sh start` in `~/actions-runner` on VM |
| `192.168.18.141` unreachable | Power on VM at `https://192.168.18.9:8006` or run `deploy/proxmox-start-vm.sh` |

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
Backend not reachable. Start backend, check port 5000, firewall, and `curl http://localhost:5000/api/health`.

### `Failed to fetch` on profile save
Backend CORS must allow `PATCH`. Ensure you run the latest `backend/src/app.js` and restart the server.

### Database locked (SQLite)
Only run **one** backend instance. Stop duplicate `node server.js` / `nodemon` processes and restart.

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
| PATCH | `/users/me/profile` | Bearer | Update own name, username, password |
| GET | `/groups` | Bearer | List user's group chats |
| POST | `/groups` | Bearer (Lead/Exec) | Create group |
| GET | `/groups/:id/messages` | Bearer | Group message history |
| POST | `/groups/:id/members` | Bearer (Lead/Exec) | Add group member |
| GET | `/files/download/:id` | Bearer | Download decrypted file |

**WebSocket events:** `register-user`, `private-message`, `group-message`, `join-group-rooms`, `typing`, `mark-read`, `get-unread-count`

---

## Future Roadmap

| Phase | Items |
|-------|-------|
| **Wave B** | AuditLog, Notifications, rate limiting, account lock |
| **Wave C** | Reactions, reply, search, message status enum |
| **Wave D** | Chunk upload, file preview, LAN discovery UI, QR connect |
| **Wave E** | Automated tests, Docker Compose, optional PostgreSQL migration |

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
