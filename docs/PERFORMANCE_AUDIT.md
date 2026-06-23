# TrustBridge — Performance Audit

**Date:** 2026-06-23  
**Scope:** Caching, pagination, lazy load, concurrency, scale targets (10k users)

---

## 1. Summary

| Capability | Status | Notes |
|------------|--------|-------|
| Caching | ❌ Not implemented | No Redis/in-memory cache |
| Pagination (messages) | ⚠️ Partial | `limit`/`offset` query params exist |
| Pagination (users) | ❌ | Full list returned |
| Lazy loading (UI) | ❌ | Full message list rendered |
| Virtual lists | ❌ | No react-virtuoso |
| Background workers | ❌ | Single Node process |
| Message optimization | ⚠️ Partial | Indexes missing on Message |
| Large file optimization | ❌ | 50MB single buffer in memory |
| Concurrent file transfers | ⚠️ Sequential | FileSharing loops files |
| 10k+ users target | ❌ Not ready | SQLite + full scans |

**Performance compliance:** **~25%**

---

## 2. Database Performance

### Current engine
- **SQLite** (`prisma/dev.db`) — single writer, fine for LAN prototype

### Missing indexes (recommended)

```sql
-- Message
CREATE INDEX idx_message_receiver_read ON Message(receiverId, read);
CREATE INDEX idx_message_conversation ON Message(senderId, receiverId, createdAt);

-- User  
CREATE INDEX idx_user_role ON User(role);
CREATE INDEX idx_user_team ON User(teamId);
```

### Query patterns

| Operation | Pattern | Risk at scale |
|-----------|---------|---------------|
| List users | `findMany` all | O(n) users |
| Chat history | `findMany` limit 50 | OK with index |
| Unread count | `findMany` all unread | O(messages) |
| Conversations | Last 100 messages + user fetch | OK for small DB |

---

## 3. API Performance

| Endpoint | Pagination | Caching |
|----------|------------|---------|
| `GET /api/users` | ❌ | ❌ |
| `GET /api/messages` | ✅ limit/offset | ❌ |
| `GET /api/messages/unread/count` | N/A | ❌ |
| `GET /api/files` | ❌ | ❌ |
| File upload | 50MB memory buffer | — |

---

## 4. Frontend Performance

| Area | Status |
|------|--------|
| Code splitting | ✅ Next.js automatic |
| Chat message list | ❌ Renders all messages |
| User sidebar | ❌ Renders all filtered users |
| Image optimization | ✅ Next.js for static |
| Socket reconnection | ✅ `reconnection: true` |
| API timeout | ✅ 8s `apiFetch` |

---

## 5. Real-Time / Concurrency

| Component | Model | Limit |
|-----------|-------|-------|
| Socket.io | Single process | ~1k connections practical |
| `connectedUsers` Map | In-memory | Lost on restart |
| Offline queue | DB-backed | ✅ |
| Horizontal scale | ❌ No Redis adapter | — |

---

## 6. File Transfer Performance

| Feature | Status |
|---------|--------|
| Chunk upload | ❌ |
| Chunk download | ❌ |
| Resume | ❌ |
| Parallel uploads | ❌ Sequential in `FileSharing.jsx` |
| Progress UI | ✅ Upload only |
| Stream download | ⚠️ Buffered decrypt |

**Bottleneck:** Multer loads entire file into memory (50MB cap).

---

## 7. Performance Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| P1 | Full user list on every chat load | Slow with 1000+ users | Paginate + search API |
| P2 | No message indexes | Slow history/unread | Add Prisma indexes |
| P3 | SQLite at 10k users | Write contention | PostgreSQL migration path |
| P4 | 50MB in-memory upload | OOM under concurrent uploads | Chunk + stream |
| P5 | No virtual scroll | UI jank long chats | react-virtuoso |
| P6 | Single socket server | Scale ceiling | Redis Socket.io adapter |

---

## 8. Recommendations (safe, incremental)

### Phase A (no breaking changes)
1. Add Message/User indexes via Prisma migration  
2. Default `GET /users?limit=100` with optional pagination  
3. Virtual list in chat for 100+ messages  

### Phase B
4. In-memory cache for user list (30s TTL)  
5. Cursor-based message pagination  
6. Sequential → parallel file upload (max 3 concurrent)  

### Phase C (scale)
7. PostgreSQL + connection pool  
8. Redis for sessions + Socket.io cluster  
9. Chunked file transfer with worker thread  

---

## 9. Current LAN Performance (adequate)

For typical LAN deployment (&lt;50 users, &lt;10 concurrent):
- Message latency: **&lt;100ms** ✅  
- File upload 10MB: **acceptable** ✅  
- UI responsiveness: **good** ✅  

Enterprise scale (10k users) requires Phase B–C.

---

*See `docs/SRS_COMPLIANCE_REPORT.md` for implementation waves.*
