# TrustBridge — Login Test Report

**Date:** 2026-06-23  
**API Base:** `http://127.0.0.1:5000/api`  
**Password (all demo accounts):** `admin123`

---

## 1. Summary

| Test Area | Result |
|-----------|--------|
| All 5 demo accounts login | ✅ **PASS** |
| Invalid credentials rejected | ✅ **PASS** |
| JWT token issued | ✅ **PASS** |
| Token verification | ✅ **PASS** |
| Protected route without token | ✅ **PASS** (401) |
| Role-based redirect paths | ✅ **PASS** |
| Session persistence (localStorage) | ✅ **PASS** |
| Unauthorized role access | ✅ **PASS** (client redirect) |

---

## 2. Demo Account Login Tests

| Username | Password | Success | Role Returned | Token Issued |
|----------|----------|---------|---------------|--------------|
| `admin` | `admin123` | ✅ | `ADMIN` | ✅ JWT |
| `superuser` | `admin123` | ✅ | `SUPER_USER` | ✅ JWT |
| `teamlead` | `admin123` | ✅ | `TEAM_LEAD` | ✅ JWT |
| `teammanager` | `admin123` | ✅ | `TEAM_MANAGER` | ✅ JWT |
| `teammember` | `admin123` | ✅ | `TEAM_MEMBER` | ✅ JWT |

### API Request
```bash
curl -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Sample Success Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "...",
      "username": "admin",
      "name": "Admin User",
      "role": "ADMIN"
    }
  }
}
```

---

## 3. Invalid Login Tests

| Test | Expected | Actual |
|------|----------|--------|
| Wrong password (`admin` / `wrong`) | `success: false` | ✅ `{"success":false,"message":"Invalid credentials"}` |
| Unknown username | `success: false` | ✅ Invalid credentials |
| Empty body | Error | ✅ Validation error |

---

## 4. Token Creation & Verification

| Test | Result |
|------|--------|
| Token format | ✅ JWT (HS256) |
| Payload contains `id`, `username`, `role` | ✅ |
| `GET /api/auth/verify` with valid token | ✅ `success: true` |
| `GET /api/auth/verify` without token | ✅ 401 |
| Expiry | ✅ 7 days (`JWT_EXPIRE`) |

---

## 5. Role Redirect After Login

Frontend uses `getRoleHomePath(role)` in `login/page.tsx`:

| Role | Redirect Path | Page HTTP |
|------|---------------|-----------|
| `ADMIN` | `/admin` | 200 ✅ |
| `SUPER_USER` | `/super-user` | 200 ✅ |
| `TEAM_LEAD` | `/team-lead` | 200 ✅ |
| `TEAM_MANAGER` | `/team-manager` | 200 ✅ |
| `TEAM_MEMBER` | `/team-member` | 200 ✅ |

---

## 6. Protected Routes

| Endpoint | No Token | Admin Token |
|----------|----------|-------------|
| `GET /api/users` | 401 ✅ | 200 ✅ |
| `GET /api/messages/unread/count` | 401 ✅ | 200 ✅ |
| `POST /api/users` | 401 ✅ | 201/200 ✅ |

---

## 7. Session Persistence

| Check | Mechanism | Result |
|-------|-----------|--------|
| Token stored | `localStorage.auth_token` | ✅ |
| User object stored | `localStorage.user` | ✅ |
| Socket reconnect on login | `auth-changed` event | ✅ |
| Logout clears storage | `removeItem` + `auth-changed` | ✅ |
| Page refresh keeps session | localStorage read on mount | ✅ |
| Server-side token revocation | ❌ Not implemented | JWT valid until expiry |

---

## 8. Unauthorized Access Blocking

### Client-Side Route Guards
| Page | Guard | Non-matching role |
|------|-------|-------------------|
| `/admin` | ADMIN check | Redirects to `/dashboard` |
| `/super-user` | SUPER_USER | Redirects to `/dashboard` |
| `/team-lead` | TEAM_LEAD | Redirects to `/dashboard` |
| `/team-manager` | TEAM_MANAGER | Redirects to `/dashboard` |
| `/team-member` | TEAM_MEMBER | Redirects to `/dashboard` |
| `/chat` | Blocks ADMIN | Redirects to `/admin` |

### Server-Side
| Check | Result |
|-------|--------|
| Socket requires JWT | ✅ `io.use()` middleware |
| Socket sender must match token user | ✅ |
| Cross-role message blocked | ✅ `canUsersChat()` |
| User create role restrictions | ✅ CREATION_RULES |

---

## 9. Logout Test

| Step | Expected | Result |
|------|----------|--------|
| Click Logout | Clear localStorage | ✅ |
| Dispatch `auth-changed` | Socket disconnects | ✅ |
| Redirect to `/login` | ✅ | ✅ |
| Access `/chat` without token | Redirect login | ✅ |

---

## 10. Socket Authentication

| Test | Result |
|------|--------|
| Connect with `auth: { token }` | ✅ Connects |
| `register-user` with wrong userId | ✅ Rejected |
| `private-message` as another user | ✅ Rejected |
| `get-unread-count` for other user | ✅ Ignored |

---

## 11. Issues & Recommendations

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| No server logout / token blacklist | Low | Wave B — session table |
| No login rate limiting | Medium | Wave B — express-rate-limit |
| JWT in localStorage (XSS risk) | Low | Document; httpOnly cookies in prod |
| No automated E2E login tests | Low | Add Playwright in Wave E |

---

*All login tests passed during Phase 0.5 verification.*
