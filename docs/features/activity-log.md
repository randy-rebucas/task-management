# Activity Log Feature — Full Documentation & Audit

> **Module:** `activity-log`  
> **Last audited:** 2026-02-01  
> **Stack:** Next.js 15 App Router · MongoDB/Mongoose · SWR

---

## Overview

The Activity Log is a read-only, append-only audit trail that records every significant action performed in the system. It is written to automatically by `logActivity()` from any feature route and is surfaced to admins as a paginated, filterable timeline.

**Route:** `/activity-log`  
**Permission:** `activity_logs:view`  
**Nav group:** Admin / Audit

---

## Data Model — `ActivityLog` (`src/models/ActivityLog.ts`)

| Field | Type | Constraints | Description |
|---|---|---|---|
| `actor` | ObjectId → User | required | User who performed the action |
| `action` | String | required | Verb describing the action (e.g. `"created"`, `"updated"`, `"deleted"`) |
| `resource` | String | — | Entity type acted upon (e.g. `"task"`, `"user"`, `"department"`) |
| `resourceId` | ObjectId | — | ID of the affected record |
| `details` | Mixed | — | Supplementary metadata object (field names changed, file references, etc.) |
| `ipAddress` | String | — | Client IP from the originating request |
| `userAgent` | String | — | Browser/agent string from the originating request |
| `createdAt` | Date | auto | MongoDB timestamp |

**Indexes:**
- `{ actor, createdAt: -1 }` — per-user timeline queries
- `{ resource, resourceId, createdAt: -1 }` — per-record history queries
- `{ action }` — action-type filtering
- `{ createdAt: -1 }` — global chronological listing

---

## Activity Logger (`src/lib/activity-logger.ts`)

All feature routes log activity via:

```ts
await logActivity({
  actor,        // user ObjectId
  action,       // verb string
  resource,     // entity type
  resourceId,   // entity ObjectId
  details,      // optional metadata object
  req           // Next.js Request (for ipAddress/userAgent extraction)
});
```

---

## API Reference

### `GET /api/activity-logs`

**File:** `src/app/api/activity-logs/route.ts`  
**Permission:** `activity_logs:view`  
**Auth:** `withPermission`

Returns a paginated, filtered list of activity log entries with actor populated.

| Query Param | Type | Description |
|---|---|---|
| `resource` | string | Filter by entity type (e.g. `task`, `user`) |
| `entity` | string | Alias for `resource` — accepted by API |
| `resourceId` | string | Filter by a specific record's ObjectId |
| `actor` | string | Filter by actor ObjectId |
| `action` | string | Regex filter on the action verb (case-insensitive) |
| `search` | string | Free-text regex search across `action` and `resource` fields (applied only when `action` is not set) |
| `page` | number | Page number (default 1) |
| `limit` | number | Page size (default 20) |

**Response shape:**
```json
{
  "data": [
    {
      "_id": "...",
      "actor": { "firstName": "Ana", "lastName": "Cruz", "email": "..." },
      "action": "created",
      "resource": "task",
      "resourceId": "...",
      "details": { "name": "Fix login bug" },
      "ipAddress": "::1",
      "createdAt": "2026-01-20T09:30:00.000Z"
    }
  ],
  "total": 148,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

## UI — Pages & Components

| Route | File | Description |
|---|---|---|
| `/activity-log` | `src/app/(dashboard)/activity-log/page.tsx` | Paginated, filterable activity log timeline |

### Filters (all wired to query params)

| Filter | State | Param sent | API param |
|---|---|---|---|
| Free-text search | `search` | `?search=` | `search` (regex on `action`+`resource`) |
| Action dropdown | `action` | `?action=` | `action` (regex) |
| Entity type dropdown | `entity` | `?resource=` | `resource` |
| Pagination | `page` | `?page=` | `page` |

### Log Row Display

Each row renders:
- **Avatar + name:** from `log.actor.firstName` / `log.actor.lastName`
- **Action badge:** from `log.action` with colour mapping (`actionColors`)
- **Entity badge:** from `log.resource`
- **Details summary:** key-value pairs from `log.details` (first 3 keys)
- **Timestamp:** formatted with `date-fns`

---

## Roles & Permissions

| Permission | Description | Default Roles |
|---|---|---|
| `activity_logs:view` | View the activity log list | Admin |

---

## Notifications & Activity Logging

The Activity Log module itself does **not** produce notifications or further activity log entries (no recursive logging).

---

## Audit Findings

### Summary

| ID | Severity | Status | Title |
|---|---|---|---|
| ACTLOG-01 | 🔴 High | ✅ Resolved | Entity dropdown filter silently ignored by API |
| ACTLOG-02 | 🔴 High | ✅ Resolved | All log row display fields were blank (field name mismatch) |
| ACTLOG-03 | 🟡 Medium | ✅ Resolved | Search input had no effect (unhandled query param in API) |

---

### ACTLOG-01 — Entity dropdown filter silently ignored ✅ RESOLVED

**File:** `src/app/(dashboard)/activity-log/page.tsx` (param set), `src/app/api/activity-logs/route.ts` (param read)

**Issue:** The UI entity dropdown appended `?entity=task` etc. to the URL, but the API only read `?resource=`. The `entity` param was never mapped, so selecting "Tasks", "Users", etc. returned completely unfiltered results with no visual indication of failure.

**Fix:** Added `entity` as an alias for `resource` in the API:
```ts
const resource = url.searchParams.get("resource") || url.searchParams.get("entity");
```
And updated the page to send `?resource=` (canonical name) instead of `?entity=`:
```ts
if (entity) params.set("resource", entity);
```

---

### ACTLOG-02 — All log row display fields blank ✅ RESOLVED

**File:** `src/app/(dashboard)/activity-log/page.tsx`

**Issue:** The JSX rendered `log.user`, `log.entity`, and `log.description` — none of which exist in the API response. The API returns `actor` (populated), `resource`, and `details`. Result: every row showed empty avatar initials, blank entity badge, and no description text.

| Wrong field | Correct field | Notes |
|---|---|---|
| `log.user?.firstName` | `log.actor?.firstName` | Populated author |
| `log.user?.lastName` | `log.actor?.lastName` | Populated author |
| `log.entity` | `log.resource` | Entity type string |
| `log.description` | derived from `log.details` | No description field in schema; now renders first 3 key-value pairs from `details` |

**Fix:** Updated all field references and the inline TypeScript type annotation on the `.map()` callback. Description line now renders:
```tsx
{Object.entries(log.details).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ")}
```

---

### ACTLOG-03 — Search input had no effect ✅ RESOLVED

**File:** `src/app/api/activity-logs/route.ts`

**Issue:** The page sends `?search=X` via a debounced text input, but the API had no handler for this param — the input was visually present but completely non-functional.

**Fix:** Added `search` support to the route. When `search` is provided and no `action` filter is set, adds a `$or` regex across `action` and `resource`:
```ts
if (search && !action) {
  filter.$or = [
    { action: { $regex: search, $options: "i" } },
    { resource: { $regex: search, $options: "i" } },
  ];
}
```
