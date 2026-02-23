# Field Monitoring

## Overview
The Field Monitoring module provides GPS-based check-in/check-out tracking for field workers, live session management, route history visualisation on an interactive map, and a territory coverage heatmap for managers. It is built on the `FieldSession` Mongoose model and exposed via four API routes under `/api/field/`.

---

## File Inventory

| Path | Purpose |
|------|---------|
| `src/models/FieldSession.ts` | Mongoose schema — sessions, route points, check-in/out |
| `src/types/index.ts` (L384) | `IFieldSession`, `IRoutePoint` TypeScript interfaces |
| `src/app/api/field/sessions/route.ts` | `GET` list + `POST` check-in |
| `src/app/api/field/sessions/[sessionId]/route.ts` | `GET` single + `PATCH` checkout / route-point push |
| `src/app/api/field/coverage/route.ts` | `GET` heatmap data |
| `src/app/api/field/photos/route.ts` | `POST` multipart photo upload → `public/uploads/field/` |
| `src/app/(dashboard)/field-monitoring/page.tsx` | Manager dashboard (tabs: check-in, sessions, route map, coverage) |
| `src/app/(dashboard)/field/page.tsx` | Field worker hub (quick actions + task list) |
| `src/components/field/check-in-panel.tsx` | Check-in/out card with GPS + optional photo/notes |
| `src/components/field/route-map.tsx` | Leaflet map — renders single session route |
| `src/components/field/coverage-map.tsx` | Leaflet map — clustered heatmap of all check-in locations |
| `src/config/nav.ts` (L56–58) | Nav entries: Field Hub, Field Monitoring, Visit Logs |
| `src/config/permissions.ts` (L46–49) | `visit_logs:{create,view,view_all,delete}` |

---

## Data Model

```ts
// src/models/FieldSession.ts
{
  user:      ObjectId → User      // required
  task:      ObjectId → Task      // optional
  date:      Date                 // midnight of check-in day (indexed)
  checkIn: {
    time:     Date                // required
    location: { lat, lng }        // required
    address?: string
    photo?:   string              // URL to uploaded photo
  }
  checkOut?: {
    time:     Date
    location: { lat, lng }
    photo?:   string
  }
  duration?:    number            // minutes (rounded), min 0
  routePoints:  [{ lat, lng, timestamp }]
  notes?:       string
  status:       "active" | "completed"   // default "active"
}
```

**Indexes:** `{ user, date: -1 }`, `{ status: 1 }`, `{ checkIn.location.lat, checkIn.location.lng }`

---

## API Routes

### `GET /api/field/sessions`
- **Auth:** `withAuth`
- **Scope:** `visit_logs:view_all` → can filter any user; otherwise own sessions only
- **Query params:** `userId`, `date` (YYYY-MM-DD), `status`, standard pagination
- **Response:** `{ data, total, page, limit, totalPages }` — populates `user` + `task`

### `POST /api/field/sessions` (check-in)
- **Auth:** `withAuth`
- **Body:** `{ lat, lng, address?, photo?, notes?, taskId? }`
- **Validates:** `lat`/`lng` must be numbers; 409 if active session exists
- **Behavior:** Sets `date` to today midnight; seeds `routePoints` with check-in coords

### `GET /api/field/sessions/:sessionId`
- **Auth:** `withAuth`
- **Scope:** Non-managers: filtered to own sessions (404 if not owner)

### `PATCH /api/field/sessions/:sessionId`
- **Auth:** `withAuth` (own sessions only — always filtered by `user: session.user.id`)
- **Body `action: "checkout"`:** `{ lat, lng, photo?, notes? }` — computes `duration`, stamps check-out, status → `"completed"`
- **Body `action: "route_point"`:** `{ lat, lng }` — pushes to `routePoints[]`

### `GET /api/field/coverage`
- **Auth:** `withPermission("visit_logs:view_all")`
- **Query:** `days` (default 30, hard-capped 90)
- **Response:** `{ total, points: [{ lat, lng, user, date, time, status }] }`

---

## Permissions

| Permission | Granted to |
|-----------|------------|
| `visit_logs:create` | All roles incl. field workers |
| `visit_logs:view` | All roles incl. field workers |
| `visit_logs:view_all` | Admin, Super Admin, Manager, HR Manager |
| `visit_logs:delete` | Admin, Super Admin, Manager, HR Manager |

---

## UI Pages

### `/field-monitoring` — Manager Dashboard
- **Tab: Check In / Out** — renders `<CheckInPanel>` + own recent sessions list
- **Tab: Sessions** — date + staff filters, summary cards (total / active / avg duration), paginated table with admin-only "Route" detail button
- **Tab: Route History** — staff + date filter → `<SessionPicker>` → `<RouteMap>` (lazy-loaded Leaflet); shows check-in/out photos
- **Tab: Coverage Map** — day-range picker → `<CoverageMap>` heatmap (lazy-loaded)
- Admin-only tabs filtered client-side using `usePermissions().can("visit_logs:view_all")`

### `/field` — Field Worker Hub
- Greeting header with task due-today + overdue counts
- Quick-action grid: My Tasks, Log Visit, Upload Proof, Update CRM, Submit Report
- Recent tasks list (last 5 from `/api/tasks/my`)
- Mobile-first layout (`max-w-lg`, `pb-24` for bottom nav clearance)

---

## Components

### `CheckInPanel`
- SWR-polls `/api/field/sessions?status=active` to detect session state
- Shows elapsed time (rendered at SWR fetch; not live-updating between refreshes)
- Optional notes + camera capture (`capture="environment"`)
- Uploads photo to `/api/field/photos` before submitting check-in/out

### `RouteMap`
- Dynamically imports `leaflet` (avoids SSR)
- Green marker = check-in, red = check-out, blue dots + dashed polyline = route points
- Falls back to Manila (14.5995, 120.9842) if no points provided
- Cleanup via `aborted` flag + `map.remove()` on unmount

### `CoverageMap`
- Clusters check-in coordinates at 4-decimal precision (~11 m grid)
- Bubble radius and opacity proportional to visit count; colour shifts blue → orange → red
- Shows legend overlay; empty state shown if `points.length === 0`

---

## Audit Findings

### FIELD-01 — Leaflet CSS injected from CDN instead of npm package import — HIGH
**Files:** `src/components/field/route-map.tsx`, `src/components/field/coverage-map.tsx`  
**Problem:** Both map components inject `<link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">` via DOM manipulation. This creates an external CDN dependency that fails in firewalled/offline environments and hardcodes a version string that could drift from the installed npm package.  
**Fix:** Replace DOM injection with `import "leaflet/dist/leaflet.css"` at the top of each file. `leaflet` is already declared as a dependency in `package.json`.  
**Status:** RESOLVED

---

### FIELD-02 — `RouteMap` `useEffect` has empty dependency array — map never re-draws on prop changes — MEDIUM
**File:** `src/components/field/route-map.tsx`  
**Problem:** `useEffect(() => { ... }, [])` runs only on mount. If the component is kept in the DOM while props change (e.g. via parent re-renders with a new session object), the rendered map shows stale data.  
**Fix:** Add `checkIn`, `checkOut`, and `routePoints` to the dependency array so the map is rebuilt whenever the displayed session changes.  
**Status:** RESOLVED

---

### FIELD-03 — PATCH handler casts Mongoose document to `any` — MEDIUM
**File:** `src/app/api/field/sessions/[sessionId]/route.ts`  
**Problem:** `const fieldSession = await models.FieldSession.findOne({...}) as any` suppresses all TypeScript type-checking on the document, allowing typos in field names and incorrect types to pass compilation silently.  
**Fix:** Type the result as `(IFieldSession & Document) | null`; import `Document` from `mongoose` and `IFieldSession` from `@/types`. Remove the `as any` cast.  
**Status:** RESOLVED

---

### FIELD-04 — `GET /api/field/coverage`: `days` param not validated; `NaN` produces invalid date query — MEDIUM
**File:** `src/app/api/field/coverage/route.ts`  
**Problem:** `Math.min(parseInt(url.searchParams.get("days") || "30"), 90)` — if `days` is a non-numeric string, `parseInt` returns `NaN`; `Math.min(NaN, 90)` is `NaN`; the date arithmetic `Date.now() - NaN * …` produces `Invalid Date`, causing the MongoDB `$gte` filter to silently fail.  
**Fix:** Add an `|| 30` fallback after `parseInt`:  
```ts
const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30") || 30, 1), 90);
```  
**Status:** RESOLVED

---

### FIELD-05 — `CheckInPanel` elapsed-time display is stale — LOW
**File:** `src/components/field/check-in-panel.tsx`  
**Problem:** `sessionDuration` is calculated once per render using `new Date()`. Without a timer, the displayed elapsed time (e.g. "2h 15m") never updates until the user triggers a re-render, making it misleading during long sessions.  
**Fix:** Extract `now` to a `useState<Date>` value driven by a `setInterval` (60 s) that calls `setNow(new Date())`. Base the duration calculation on that state.  
**Status:** RESOLVED

---

### FIELD-06 — `field-monitoring/page.tsx`: Avg Duration summary card calls `.filter()` twice on same array — LOW
**File:** `src/app/(dashboard)/field-monitoring/page.tsx`  
**Problem:** The average duration calculation filters `sessionsData.data` for sessions that have a duration twice — once for `.reduce()` and once for `.length`. This is redundant and hard to read.  
**Fix:** Extract the filtered array to a local variable and reuse it for both the sum and the count.  
**Status:** RESOLVED

---

### FIELD-07 — `mapRef` typed as `any` in both map components — LOW
**Files:** `src/components/field/route-map.tsx`, `src/components/field/coverage-map.tsx`  
**Problem:** `useRef<any>(null)` loses all type information for the Leaflet `Map` instance.  
**Fix:** Use `useRef<import("leaflet").Map | null>(null)` (or inline `L.Map | null` once `L` is in scope) for both refs.  
**Status:** RESOLVED
