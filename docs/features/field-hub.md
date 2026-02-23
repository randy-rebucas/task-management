# Field Hub Feature

## Overview

The Field Hub is a mobile-optimised landing page for field staff. It provides quick actions, a live task preview with due/overdue counts, and the underlying API for GPS check-in/check-out sessions and coverage heatmap.

**Route:** `/field`  
**Permission (view):** `visit_logs:create` (nav gate)  
**Nav group:** Field

---

## Data Model

### FieldSession (`src/models/FieldSession.ts`)

| Field | Type | Description |
|---|---|---|
| `user` | ObjectId → User | Session owner |
| `task` | ObjectId → Task | Optional linked task |
| `date` | Date (indexed) | Calendar date of session (midnight, no time) |
| `checkIn.time` | Date | Exact check-in timestamp |
| `checkIn.location` | `{ lat, lng }` | GPS coordinates |
| `checkIn.address` | String | Optional reverse-geocoded address |
| `checkIn.photo` | String | Optional photo URL |
| `checkOut.time` | Date | Exact check-out timestamp |
| `checkOut.location` | `{ lat, lng }` | GPS at check-out |
| `checkOut.photo` | String | Optional photo URL |
| `duration` | Number | Minutes between check-in and check-out |
| `routePoints` | `[{ lat, lng, timestamp }]` | GPS breadcrumbs |
| `notes` | String | Optional notes |
| `status` | `"active"` \| `"completed"` | Session state |

Index: `date`

---

## API Routes

### `GET /api/field/sessions`

Auth: `withAuth` (own sessions by default; managers with `visit_logs:view_all` can filter by `userId`)

**Query params:**

| Param | Description |
|---|---|
| `userId` | Filter by user (managers only) |
| `date` | Filter by date string (`YYYY-MM-DD`) — matches full day range |
| `status` | `"active"` or `"completed"` |
| `page`, `limit` | Pagination (default limit 20, max 100) |

**Response:**

```json
{
  "data": [
    {
      "_id": "...",
      "user": { "firstName": "...", "lastName": "...", "email": "..." },
      "task": { "taskNumber": "T-001", "title": "..." },
      "date": "2026-02-23T00:00:00.000Z",
      "checkIn": { "time": "...", "location": { "lat": 10.72, "lng": 122.55 }, "address": "..." },
      "status": "completed",
      "duration": 145
    }
  ],
  "total": 24,
  "page": 1,
  "limit": 20,
  "totalPages": 2
}
```

---

### `POST /api/field/sessions`

Auth: `withAuth` — creates a check-in session for the session user.

**Body:**

```json
{
  "lat": 10.72,
  "lng": 122.55,
  "address": "Optional street address",
  "photo": "/uploads/field/uuid.jpg",
  "notes": "Optional notes",
  "taskId": "<optional ObjectId>"
}
```

- `lat` and `lng` are required numbers
- Returns `409` if user already has an `active` session
- Sets `date` to midnight of current day

---

### `GET /api/field/sessions/[sessionId]`

Auth: `withAuth` — own session; managers (`visit_logs:view_all`) can view any.

Returns full session document with `user` and `task` populated.

---

### `PATCH /api/field/sessions/[sessionId]`

Auth: `withAuth` — own session only.

**Body actions:**

| `action` | Required fields | Effect |
|---|---|---|
| `"checkout"` | `lat`, `lng`, `photo` (opt), `notes` (opt) | Sets `checkOut`, computes `duration` in minutes, marks `status: "completed"` |
| `"route_point"` | `lat`, `lng` | Appends to `routePoints` breadcrumb trail |

---

### `GET /api/field/coverage`

Auth: `withPermission("visit_logs:view_all")`

**Query param:** `days` (1–90, default 30)

Returns all check-in GPS points within the window for heatmap rendering.

**Response:**

```json
{
  "points": [
    {
      "lat": 10.72,
      "lng": 122.55,
      "user": { "firstName": "Ana", "lastName": "Cruz" },
      "date": "2026-02-23T00:00:00.000Z",
      "time": "2026-02-23T08:15:00.000Z",
      "status": "completed"
    }
  ],
  "total": 87
}
```

---

### `POST /api/field/photos`

Direct `NextRequest` handler (no `withAuth` wrapper — manually calls `auth()`).

Accepts `multipart/form-data` with a `file` field.

| Constraint | Value |
|---|---|
| Max size | 10 MB |
| Allowed types | `image/jpeg`, `image/png`, `image/webp` |
| Storage | `public/uploads/field/<uuid>.<ext>` |

**Response:** `{ "url": "/uploads/field/uuid.jpg" }` (201)

---

## UI — `/field`

Single page (`src/app/(dashboard)/field/page.tsx`). Mobile-optimised, max-width layout.

**SWR key:** `/api/tasks/my?limit=100`  
**Task list display:** Sliced to first 5 (`allTasks.slice(0, 5)`)  
**Quick stats:** Computed from full `allTasks` array (up to 100):
- `dueToday` — tasks whose `dueDate` matches today's calendar date  
- `overdue` — tasks whose `dueDate` is in the past (< today midnight)

**Quick Actions grid** (navigation links only, no API calls):

| Label | Href |
|---|---|
| My Tasks | `/my-tasks` |
| Log Visit | `/visit-logs/new` |
| Upload Proof | `/proof-of-work` |
| Update CRM | `/crm` |
| Submit Report | `/reports` |

---

## Audit Findings

### FIELD-01 — Quick stats derived from 5-task sample — **HIGH** — ✅ RESOLVED

**Problem:** The Field Hub page fetched `/api/tasks/my?limit=5` and computed "Due today" and "Overdue" stat card counts from that same 5-task slice. The API sorts by `dueDate ASC`, so overdue tasks appear first — but a user with more than 5 overdue tasks would see a count capped at however many fit in the first 5 results. Due-today tasks beyond position 5 were invisible to the count.

Example: user has 8 overdue + 3 due today → only 5 results returned → counts show overdue=5 (wrong), dueToday=0 (wrong).

**Fix:**
- Changed fetch URL to `limit=100` to cover realistic workloads
- Renamed `tasks` → `allTasks` for the full result set
- Added `const tasks = allTasks.slice(0, 5)` for the list display (unchanged UI behaviour)
- Updated `dueToday` and `overdue` filters to use `allTasks` (not the sliced 5)
