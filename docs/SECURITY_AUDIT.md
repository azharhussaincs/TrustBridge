# TrustBridge — Security Audit

**Date:** 2026-06-23  
**Scope:** Auth, crypto, sessions, RBAC, audit, rate limiting, Zero Trust  
**Method:** Code review (no penetration test)

---

## 1. Summary

| Area | Rating | Status |
|------|--------|--------|
| Password storage | ✅ Good | bcrypt cost 10 |
| AES-256-GCM (files) | ✅ Good | `encryption.js`, sidecar IV/tag |
| AES-256-GCM (messages) | ❌ Gap | Plaintext in `Message.content` |
| Session management | ⚠️ Weak | JWT only; no refresh/revocation |
| Token validation (REST) | ✅ Good | `auth.middleware.js` |
| Token validation (Socket) | ❌ Critical | Token sent; not verified on connect |
| Role validation | ⚠️ Partial | `authorize()` on REST; inconsistent constants |
| Permission checks (chat) | ⚠️ Partial | Frontend only; socket unguarded |
| Audit logging | ❌ Missing | Mock UI in admin |
| Rate limiting | ❌ Missing | — |
| Brute force protection | ❌ Missing | — |
| Memory cleanup on logout | ❌ Missing | localStorage clear only |
| Zero Trust validation | ❌ Partial | Stubs in `middleware/zero-trust.js` |
| Input validation | ⚠️ Minimal | Ad-hoc; no schema library |
| XSS | ⚠️ Risk | Message content not sanitized |
| SQL injection | ✅ Low risk | Prisma parameterized queries |
| CSRF | N/A | Bearer token API |
| CORS | ⚠️ LAN | `origin: '*'` intentional for LAN |

**Overall security posture:** **C+** (Wave A fixes applied: socket JWT + RBAC, role constants)

### Wave A fixes applied (2026-06-23)
- ✅ Socket JWT verification via `io.use()` in `server.js`
- ✅ Socket RBAC via `permission.service.js` on `private-message`
- ✅ Role constants unified to UPPER_SNAKE in `constants.js`
- ✅ Admin removed from chat communication rules

---

## 2. Password Storage

| Check | Result | Evidence |
|-------|--------|----------|
| Plaintext passwords in DB | ✅ No | `auth.service.js` bcrypt.hash |
| Admin can view passwords | ✅ No | Only reset to new hash |
| Password in logs | ✅ No | — |
| Argon2 | ❌ Not used | bcrypt only (acceptable) |

---

## 3. Encryption (AES-256-GCM)

| Asset | Encrypted | Implementation |
|-------|-----------|----------------|
| Files at rest | ✅ Yes | `file.service.js` + `.iv`/`.tag` |
| Files in transit | ✅ HTTPS optional | LAN HTTP typical |
| Messages at rest | ❌ No | `content` plaintext despite `isEncrypted: true` |
| Messages in transit | ❌ No | Socket JSON plaintext |
| Key in env | ✅ `ENCRYPTION_KEY` | 32-byte padded |
| Key in client | N/A | Server-side file crypto only |

**Recommendation:** Encrypt message body before `prisma.message.create` (additive columns for migration).

---

## 4. Session & Token Management

| Feature | Status | Details |
|---------|--------|---------|
| Access token | ✅ JWT 7d default | `auth.service.js` |
| Refresh token | ❌ | — |
| Session table | ❌ | — |
| Logout invalidates token | ❌ | Client-side only |
| Token in localStorage | ⚠️ | XSS theft risk; document for LAN |
| `GET /api/auth/verify` | ✅ | Decodes JWT |

---

## 5. Role & Permission Validation

### REST API

| Endpoint | Auth | Role check |
|----------|------|------------|
| `/api/auth/login` | Public | — |
| `/api/users` POST/PUT/DELETE | JWT | ADMIN, TEAM_LEAD |
| `/api/users/:id/reset-password` | JWT | ADMIN |
| `/api/messages/*` | JWT | Any authenticated |
| `/api/files/*` | JWT | `canShareFile` on upload |

### Socket

| Event | Auth | Permission |
|-------|------|------------|
| `register-user` | ❌ None | User ID trusted from client |
| `private-message` | ❌ None | No RBAC |
| `typing` | ❌ None | — |
| `mark-read` | ❌ None | — |

### Role constant bug

`config/constants.js` uses `team-lead` (kebab) while DB stores `TEAM_LEAD`.  
`user.service.canCommunicate()` imports broken rules → **always denies or wrong**.

---

## 6. Audit Logging

| Event | Logged |
|-------|--------|
| Login success | ❌ |
| Login failure | ❌ |
| Logout | ❌ |
| User create/delete | ❌ |
| Password reset | ❌ |
| File upload/download | ❌ |
| Message sent | ❌ |
| Permission denied | ❌ |

Admin UI shows **hardcoded** audit rows (`admin/page.tsx`).

---

## 7. Rate Limiting & Brute Force

| Control | Status |
|---------|--------|
| Login rate limit | ❌ |
| API global rate limit | ❌ |
| Failed login counter | ❌ |
| Account lockout | ❌ |
| IP block | ❌ |

---

## 8. Memory Cleanup on Logout

| Item | Cleared on logout |
|------|-------------------|
| `auth_token` | ✅ localStorage |
| `user` object | ✅ localStorage |
| Socket connection | ✅ disconnect on remount |
| In-memory encryption keys | N/A (server-side) |
| Client crypto keys | ❌ Not implemented |

---

## 9. Zero Trust Checklist

| Principle | Implemented |
|-----------|-------------|
| Never trust network | ⚠️ CORS open; LAN model |
| Verify every request | ⚠️ REST yes; socket no |
| Least privilege | ⚠️ UI hides; server gaps |
| Assume breach | ❌ No audit trail |
| Continuous validation | ❌ Long-lived JWT |

---

## 10. Security Risks (Prioritized)

| # | Risk | Severity | Fix (backward compatible) |
|---|------|----------|---------------------------|
| R1 | Socket impersonation via `register-user` | **Fixed** | JWT verified; userId must match token |
| R2 | Unauthorized cross-role messages | **Fixed** | `canUsersChat()` in socket handler |
| R3 | Plaintext messages in SQLite | **High** | Encrypt at rest (additive) |
| R4 | No brute-force protection | **High** | `express-rate-limit` on login |
| R5 | Broken `canCommunicate()` | **Fixed** | UPPER_SNAKE roles in `constants.js` |
| R6 | XSS via message content | **Medium** | Sanitize on save |
| R7 | Mock audit logs | **Low** | Real AuditLog table |
| R8 | JWT in localStorage | **Low** | Document; httpOnly in Phase 2 |

---

## 11. Recommended Fixes (safe order)

1. **Socket JWT** — `io.use()` verify token; reject bad connections  
2. **Socket RBAC** — check sender/receiver roles before message create  
3. **Unify roles** — single `PermissionService` (UPPER_SNAKE)  
4. **Rate limit** — `POST /api/auth/login` 10 req/15min/IP  
5. **AuditLog** — additive migration + login/user/file events  
6. **Message sanitize** — strip HTML in content  
7. **Message encrypt** — dual-write migration  

**Do not remove any existing API.** New endpoints additive only.

---

*See `docs/SRS_COMPLIANCE_REPORT.md` for full traceability.*
