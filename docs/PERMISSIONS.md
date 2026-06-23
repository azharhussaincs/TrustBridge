# TrustBridge — Permission Matrix (Baseline + Phase 0 Target)

**Role format:** `UPPER_SNAKE` (matches database)  
**Source of truth after Phase 0:** `backend/src/roles/PermissionService.js`

---

## 1. User Management Permissions

| Action | ADMIN | SUPER_USER | TEAM_LEAD | TEAM_MANAGER | TEAM_MEMBER |
|--------|:-----:|:----------:|:---------:|:------------:|:-----------:|
| Create Super User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update Super User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Super User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Team Lead | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update Team Lead | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete Team Lead | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Team Manager | ❌ | ❌ | ✅ (own team) | ❌ | ❌ |
| Create Team Member | ❌ | ❌ | ✅ (own team) | ❌ | ❌ |
| Update Team Manager/Member | ❌ | ❌ | ✅ (own team) | ❌ | ❌ |
| Delete Team Manager/Member | ❌ | ❌ | ✅ (own team) | ❌ | ❌ |
| Reset password | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lock / disable account | ✅ (Phase 0) | ❌ | ❌ | ❌ | ❌ |
| View plaintext password | ❌ (never) | ❌ | ❌ | ❌ | ❌ |

---

## 2. Communication Permissions (Chat + Files)

| From \ To | ADMIN | SUPER_USER | TEAM_LEAD (own) | TEAM_LEAD (other) | MGR/MEMBER (own) | MGR/MEMBER (other) |
|-----------|:-----:|:----------:|:---------------:|:-----------------:|:----------------:|:------------------:|
| **ADMIN** | ❌ chat | ❌ chat | ❌ chat | ❌ chat | ❌ chat | ❌ chat |
| **SUPER_USER** | ❌ | — | ✅ | ✅ | ✅ | ❌ |
| **TEAM_LEAD** | ❌ | ✅ | — | ✅ | ✅ | ❌ |
| **TEAM_MANAGER** | ❌ | ✅ | ✅ (own lead) | ❌ | ✅ (own team) | ❌ |
| **TEAM_MEMBER** | ❌ | ✅ | ✅ (own lead) | ❌ | ✅ (own team) | ❌ |

**Notes:**
- ADMIN manages users only; no business chat (SRS REQ).
- Team scoping enforced for TEAM_LEAD → own managers/members; TEAM_MANAGER → own members.
- SUPER_USER ↔ TEAM_MEMBER: allowed per extended SRS (reports); team isolation still applies for cross-team.

---

## 3. Dashboard Access

| Route | ADMIN | SUPER_USER | TEAM_LEAD | TEAM_MANAGER | TEAM_MEMBER |
|-------|:-----:|:----------:|:---------:|:------------:|:-----------:|
| `/admin` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/users` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/super-user` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/team-lead` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/team-manager` | ❌ | ❌ | ❌ | ✅ (Phase 0) | ❌ |
| `/team-member` | ❌ | ❌ | ❌ | ❌ | ✅ (Phase 0) |
| `/chat` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard` | ✅ (hub) | ✅ | ✅ | ✅ | ✅ |

---

## 4. API Authorization Map

| Endpoint group | Middleware |
|----------------|------------|
| `/api/auth/login`, `/register` | Public (+ rate limit Phase 0) |
| `/api/auth/verify` | Bearer optional |
| `/api/users` GET | `authenticate` |
| `/api/users` POST/PUT/DELETE | `authenticate` + `authorize` + PermissionService |
| `/api/users/:id/reset-password` | `authenticate` + ADMIN |
| `/api/messages/*` | `authenticate` |
| `/api/files/*` | `authenticate` + PermissionService on upload |
| `/api/crypto/*` | `authenticate` |
| `/api/audit/*` | `authenticate` + ADMIN (Phase 0 new) |
| `/api/notifications/*` | `authenticate` (Phase 0 new) |
| Socket events | JWT on connect + PermissionService per message (Phase 0) |

---

## 5. Current Bug: `constants.js` Mismatch

`config/constants.js` uses kebab-case roles (`team-lead`) but DB stores `TEAM_LEAD`.  
`user.service.canCommunicate()` imports `COMMUNICATION_RULES` from constants → **always fails** for real users.

**Phase 0 fix:** Replace constants with UPPER_SNAKE or add normalization layer in PermissionService.

---

*This matrix is the contract for PermissionService unit tests in Phase 0.*
