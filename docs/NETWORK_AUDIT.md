# TrustBridge — LAN & Network Audit

**Date:** 2026-06-23  
**Scope:** Discovery, multi-router, subnet, cloud independence

---

## 1. Summary

| Capability | Status |
|------------|--------|
| LAN-only operation (no cloud) | ✅ **Full** |
| Bind all interfaces | ✅ `0.0.0.0:5000` / `0.0.0.0:3000` |
| Env-based server URL | ✅ `NEXT_PUBLIC_API_URL`, `WEBSOCKET_URL` |
| Health endpoint | ✅ `GET /api/health` |
| Auto discovery | ⚠️ **Partial** — code exists, unused |
| Manual IP entry (UI) | ❌ **Missing** |
| Different router / subnet | ⚠️ **Partial** — scripts + env |
| DNS / mDNS discovery | ❌ **Missing** |
| QR connection | ❌ **Missing** |
| Offline LAN (no internet) | ✅ **Full** |
| WebSocket over LAN | ✅ Socket.io same host |
| Multi-server deployment | ❌ Not implemented |

**Network compliance:** **~55%**

---

## 2. Current Architecture

```
[Client Browser :3000]
        │
        │ HTTP  /api/*
        │ WS    Socket.io
        ▼
[TrustBridge Server :5000  0.0.0.0]
        │
        ├── SQLite (local)
        └── uploads/ (local encrypted files)
```

No external services required for core chat/files.

---

## 3. Configuration Evidence

| File | Purpose |
|------|---------|
| `backend/server.js` | `listen(PORT, '0.0.0.0')` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEBSOCKET_URL`, `NEXT_PUBLIC_SERVER_IP` |
| `frontend/src/lib/api/config.ts` | `apiUrl()`, `getServerOrigin()` |
| `frontend/src/context/SocketContext.jsx` | Connects to `NEXT_PUBLIC_WEBSOCKET_URL` |
| `fix-multi-router.sh` | Rewrites env with detected LAN IP |
| `forward-ports.sh` | iptables / IP forwarding helper |

---

## 4. LAN Discovery (`discoverServer.js`)

**Path:** `frontend/src/lib/discoverServer.js`

**Behavior:**
- Probes `http://{host}:5000/api/health` for:
  - `window.location.hostname`
  - `localhost`
  - `NEXT_PUBLIC_SERVER_IP`
- 2s timeout per host

**Gap:** **Never imported** by login or settings. Users must manually configure `.env.local`.

---

## 5. Multi-Router / Subnet Support

| Scenario | Works today | How |
|----------|-------------|-----|
| Same router, same subnet | ✅ | Set LAN IP in `.env.local` |
| Different subnet | ⚠️ | Requires routing/`forward-ports.sh`; manual |
| Client on 192.168.18.x → server 192.168.18.139 | ✅ | Documented in README |
| Auto-detect server | ❌ | discoverServer not wired |

Backend CORS `origin: '*'` allows browser from any LAN origin.

---

## 6. Cloud Dependency Check

| Service | Used |
|---------|------|
| Firebase | ❌ |
| AWS S3 | ❌ |
| Google Cloud | ❌ |
| External auth | ❌ |
| CDN for app | ❌ |

✅ **SRS "no cloud dependency" satisfied** for runtime.

---

## 7. Gaps & Recommendations

| ID | Gap | Priority | Fix |
|----|-----|----------|-----|
| NET-1 | Discovery not in UI | P0 | Login "Server URL" field + scan button |
| NET-2 | No QR connect | P2 | Encode `http://IP:3000` QR on server admin |
| NET-3 | No mDNS | P3 | Optional `bonjour` broadcast `trustbridge.local` |
| NET-4 | Empty docker-compose | P2 | Populate from README examples |
| NET-5 | No network info API | P1 | `GET /api/network/info` returns WS URL, version |
| NET-6 | WebSocket without TLS | Info | LAN HTTP acceptable; NGINX TLS for prod |

---

## 8. Safe Implementation Plan

1. Add login page server config (manual IP + "Test connection" → `/api/health`)  
2. Call `discoverServer()` on login mount as optional auto-detect  
3. Store selected server in `localStorage` override for `apiUrl()` (fallback to env)  
4. Add `GET /api/network/info` (additive)  
5. Document multi-router in `docs/DEPLOYMENT.md`  

**Must not break:** existing `NEXT_PUBLIC_*` env configuration.

---

*See `docs/SRS_COMPLIANCE_REPORT.md` § LAN Discovery.*
