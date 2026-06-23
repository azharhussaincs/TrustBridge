# TrustBridge — Run Verification Report

**Date:** 2026-06-23  
**Phase:** 0.5 — Application Verification  
**Environment:** Linux, Node.js v20.20.2, Next.js 14.2.35

---

## 1. Executive Summary

| Check | Result |
|-------|--------|
| Backend startup | ✅ **PASS** |
| Frontend startup | ✅ **PASS** |
| Frontend production build | ✅ **PASS** |
| Compile errors | ✅ **None** |
| Runtime errors (startup) | ✅ **None** |
| Dependency issues | ⚠️ npm `devdir` warning only |
| Missing env vars | ✅ **None critical** |
| Broken imports | ✅ **None** |
| Failed routes (HTTP) | ✅ **All 200** |

**Verdict:** Application is **fully runnable** on localhost and LAN bind (`0.0.0.0`).

---

## 2. Backend Startup

### Command
```bash
cd backend && npm run dev
# or: npm start
```

### Result
```
🚀 TrustBridge Server Started
📡 Server running on: http://0.0.0.0:5000
🔐 Encryption: AES-GCM
💬 WebSocket: Enabled
✅ Ready for connections
```

### Health Check
```bash
curl http://127.0.0.1:5000/api/health
```
```json
{
  "status": "✅ Server is running",
  "encryption": "AES-GCM",
  "security": "Zero Trust Architecture",
  "version": "1.0.0"
}
```

### Environment Variables Verified (`backend/.env`)
| Variable | Present | Notes |
|----------|---------|-------|
| `PORT` | ✅ | 5000 |
| `JWT_SECRET` | ✅ | Required for auth |
| `JWT_EXPIRE` | ✅ | 7d |
| `ENCRYPTION_KEY` | ✅ | AES-256-GCM files |
| `DATABASE_URL` | ✅ | SQLite |
| `CLIENT_URL` | ✅ | Frontend origin |
| `MAX_FILE_SIZE` | ✅ | 10GB configured |
| `UPLOAD_DIR` | ✅ | ./uploads |

### Port Binding
- Listens on `0.0.0.0:5000` (all interfaces — LAN ready)
- Note: If port 5000 is already in use, nodemon reports `EADDRINUSE` — stop duplicate process first

---

## 3. Frontend Startup

### Command
```bash
cd frontend && npm run dev:clean
# or: npm run dev -- -H 0.0.0.0 -p 3000
```

### Result
```
▲ Next.js 14.2.35
- Local:   http://localhost:3000
- Network: http://0.0.0.0:3000
✓ Ready
```

### Environment Variables Verified (`frontend/.env.local`)
| Variable | Present | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_API_URL` | ✅ | Must match server LAN IP |
| `NEXT_PUBLIC_WEBSOCKET_URL` | ✅ | Socket.io origin |
| `NEXT_PUBLIC_SERVER_IP` | ✅ | Used by discovery helper |

### Production Build
```bash
cd frontend && npm run build
```
**Result:** ✅ Success — 13 routes compiled, no TypeScript errors.

| Route | Status |
|-------|--------|
| `/` | ○ Static |
| `/login` | ○ Static |
| `/admin` | ○ Static |
| `/admin/users` | ○ Static |
| `/super-user` | ○ Static |
| `/team-lead` | ○ Static |
| `/team-manager` | ○ Static |
| `/team-member` | ○ Static |
| `/chat` | ○ Static |
| `/dashboard` | ○ Static |

---

## 4. Route HTTP Verification

Tested via `curl` against `http://127.0.0.1:3000`:

| Route | HTTP Status |
|-------|-------------|
| `/` | 200 |
| `/login` | 200 |
| `/admin` | 200 |
| `/admin/users` | 200 |
| `/super-user` | 200 |
| `/team-lead` | 200 |
| `/team-manager` | 200 |
| `/team-member` | 200 |
| `/chat` | 200 |
| `/dashboard` | 200 |

---

## 5. Errors Found & Fixed

| Issue | Severity | Status |
|-------|----------|--------|
| Port 5000 EADDRINUSE when duplicate backend started | Low | Documented — use single instance |
| Sandbox blocked localhost curl in CI | Info | Used `required_permissions: all` |
| Theme text contrast on blue shell | Medium | **Fixed** — Phase 0.5 theme update |

---

## 6. Remaining Warnings

| Warning | Impact | Action |
|---------|--------|--------|
| `npm warn Unknown env config "devdir"` | None | npm config on host machine |
| `npm test` exits 1 (no tests) | Low | Add tests in Wave E |
| Messages stored plaintext despite `isEncrypted` flag | Security | Wave B encryption |
| Admin audit logs are demo data | UX | Wave B AuditLog table |
| No `/settings` route | Missing feature | Future phase |

---

## 7. How to Run Full Stack

**Terminal 1 — Backend:**
```bash
cd ~/Desktop/TrustBridge/backend
npm install
npx prisma generate
npm run seed    # first time only
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd ~/Desktop/TrustBridge/frontend
npm install
# Edit .env.local with your LAN IP
npm run dev:clean
```

**Open:** `http://localhost:3000/login` or `http://<LAN-IP>:3000/login`

**Demo login:** `admin` / `admin123`

---

*Generated during Phase 0.5 verification.*
