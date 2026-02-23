# Reports Feature — Full Documentation & Audit

> **Module:** `reports`
> **Last audited:** 2026-02-23
> **Stack:** Next.js 15 App Router · MongoDB/Mongoose · Zod validation · SWR

---

## 1. Overview

The Reports module provides data-driven views of task management activity across the workspace. It consists of a single main page (`/reports`) with three vertically-tabbed views, plus three dedicated sub-pages for direct linking. All routes require `reports:view` permission.

Exports are handled by a single POST endpoint (`/api/reports/export`) that supports CSV, Excel (ExcelJS) and PDF (pdfmake) formats.

---

## 2. API Reference

| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/reports/task-summary` | `reports:view` | Task counts by status/priority, summary metrics, completion trend |
| GET | `/api/reports/staff-workload` | `reports:view` | Per-staff task distribution, hours, completion rates |
| GET | `/api/reports/overdue` | `reports:view` | Paginated overdue task list with summary aggregates |
| POST | `/api/reports/export` | `reports:export` | Export all tasks as CSV / Excel / PDF |

### `/api/reports/task-summary` — Query Params

| Param | Type | Description |
|---|---|---|
| `days` | number | Time window in days from now (default 30). Generates `from` date. |
| `from` | ISO date string | Explicit start date (overrides `days`) |
| `to` | ISO date string | Explicit end date (default: now) |
| `department` | ObjectId string | Filter by department |

**Response shape:**
```json
{
  "totalTasks": 120,
  "completedTasks": 45,
  "inProgressTasks": 50,
  "overdueTasks": 12,
  "byStatus": [{ "status": "In Review", "color": "#3b82f6", "count": 20 }],
  "byPriority": [{ "priority": "high", "count": 30 }],
  "completionTrend": [{ "_id": { "year": 2026, "month": 2 }, "count": 15 }]
}
```

### `/api/reports/staff-workload` — Query Params

| Param | Type | Description |
|---|---|---|
| `department` | ObjectId string | Filter by department |

**Response shape:**
```json
{
  "staff": [{
    "userId": "...",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "...",
    "totalTasks": 12,
    "inProgress": 4,
    "completed": 6,
    "overdue": 2,
    "hoursLogged": 14.5,
    "completionRate": 50
  }],
  "avgTasks": 8.3,
  "totalHours": 120.0
}
```

### `/api/reports/overdue` — Query Params

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default 1) |
| `limit` | number | Page size (default 20) |
| `department` | ObjectId string | Filter by department |

**Response shape:**
```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "urgentHighCount": 15,
  "avgDaysOverdue": 4.2
}
```

### `/api/reports/export` — Body

```json
{ "format": "csv" | "excel" | "pdf" }
```

Validated by `exportReportSchema`. Returns the file as a binary response with appropriate Content-Type and Content-Disposition headers. Always exports the full unarchived task list (no filtering by type/date/department).

---

## 3. Roles & Permissions

| Permission | Description |
|---|---|
| `reports:view` | Access all three report endpoints and the `/reports` page |
| `reports:export` | POST to `/api/reports/export` |

---

## 4. UI Pages & Components

### Pages

| Route | File | Description |
|---|---|---|
| `/reports` | `(dashboard)/reports/page.tsx` | Main tabbed reports page — Task Summary, Staff Workload, Overdue Tasks in vertical tabs |
| `/reports/tasks` | `(dashboard)/reports/tasks/page.tsx` | Standalone Task Summary report page |
| `/reports/staff` | `(dashboard)/reports/staff/page.tsx` | Standalone Staff Workload report page |
| `/reports/overdue` | `(dashboard)/reports/overdue/page.tsx` | Standalone Overdue Tasks report page |

### Main page (`/reports`) inline components

- **`TaskSummaryContent`** — Period selector (7/30/90/365 days), 4 summary metric cards, Tasks by Status bar chart, Tasks by Priority table, Tasks by Category table. Uses `POST /api/reports/export` for CSV export.
- **`StaffWorkloadContent`** — Department filter, 3 summary cards (total staff, avg tasks/person, total hours), staff table with completionRate Progress bar. Uses `POST /api/reports/export`.
- **`OverdueTasksContent`** — Priority filter, 3 summary cards (total, urgent/high, avg days overdue), paginated task table with links to task detail. Uses `POST /api/reports/export`.

### Export flow (all report tabs)

All export functions in both the main page and sub-pages use:
```ts
const res = await fetch("/api/reports/export", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ format: "csv" }),
});
```

---

## 5. Validation Schemas

| Schema | File | Used by |
|---|---|---|
| `exportReportSchema` | `src/features/auth/validators.ts` | POST `/api/reports/export` |

```ts
z.object({
  format: z.enum(["csv", "excel", "pdf"]),
})
```

---

## 6. Audit Findings

### REPORTS-01 — task-summary API response shape + `days` param not read ✅ RESOLVED

**Files:** `src/app/api/reports/task-summary/route.ts`, `src/app/(dashboard)/reports/page.tsx`, `src/app/(dashboard)/reports/tasks/page.tsx`

**Issue (API → UI contract broken on 3 levels):**
1. API ignored `?days=N` entirely — reads `from`/`to` only. Both UIs use `?days=30`. Date filter never applied; returns all tasks regardless of period.
2. API returned `tasksByStatus` and `tasksByPriority` — both UIs read `byStatus` and `byPriority`. Both always `undefined`.
3. API returned no count summaries — both UIs read `totalTasks`, `completedTasks`, `inProgressTasks`, `overdueTasks`. All four stat cards always showed 0.

**Fix:** Rewrote `task-summary` route to:
- Parse `days` param and derive `fromDate = now - days * 86400s` (overridden by explicit `from`/`to`)
- Add four separate `countDocuments` calls for totals
- Return `{ totalTasks, completedTasks, inProgressTasks, overdueTasks, byStatus, byPriority, completionTrend }` with field names matching the UI

---

### REPORTS-02 — staff-workload API response shape mismatch ✅ RESOLVED

**Files:** `src/app/api/reports/staff-workload/route.ts`, `src/app/(dashboard)/reports/page.tsx`, `src/app/(dashboard)/reports/staff/page.tsx`

**Issue:** API returned a flat array of `{ userId, name, email, totalTasks, completedTasks, overdueTasks, totalHoursLogged, completionRate }`. Both UIs:
- Read `data.staff` (array), `data.avgTasks`, `data.totalHours` — all `undefined` since data is an array.
- Table rows used `member.firstName`, `member.lastName`, `member.inProgress`, `member.completed`, `member.overdue`, `member.hoursLogged` — none exist in the API response (`name` was concatenated, `inProgress` wasn't computed, `isProgress` field was `completedTasks` not `completed`, etc.).

**Fix:** Rewrote `staff-workload` route to:
- Project `firstName` and `lastName` separately from the `$lookup` (instead of concatenating to `name`)
- Add `inProgress` calculation (`completedAt = null AND (dueDate >= now OR dueDate = null)`)
- Rename `completedTasks→completed`, `overdueTasks→overdue`, `totalHoursLogged→hoursLogged`
- Wrap result in `{ staff, avgTasks, totalHours }` envelope

---

### REPORTS-03 — overdue API missing `urgentHighCount` + `avgDaysOverdue` ✅ RESOLVED

**Files:** `src/app/api/reports/overdue/route.ts`

**Issue:** Both the main `OverdueTasksContent` component and the dedicated `/reports/overdue` page show three summary cards: Total Overdue, Urgent/High Count, Avg Days Overdue. The API only returned `{ data, total, page, limit, totalPages }` — no `urgentHighCount` or `avgDaysOverdue`. Both cards always showed 0.

**Fix:** Added two additional `Promise.all` entries to the overdue route:
- `urgentHighCount`: `countDocuments({ ...filter, priority: { $in: ["urgent", "high"] } })`
- `avgDaysOverdue`: aggregate `$avg` of `(now - dueDate) / 86400000` across the filtered tasks

---

### REPORTS-04 — Sub-page exports use GET instead of POST ✅ RESOLVED

**Files:** `src/app/(dashboard)/reports/tasks/page.tsx`, `src/app/(dashboard)/reports/staff/page.tsx`, `src/app/(dashboard)/reports/overdue/page.tsx`

**Issue:** Export buttons on all three standalone sub-pages called `fetch(\`/api/reports/export?type=...\`)` using the default GET method. The export route only exports `POST`. All three export buttons returned 405 Method Not Allowed.

**Fix:** Changed all three `handleExport` functions to use `fetch("/api/reports/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format: "csv" }) })` — matching what the main `reports/page.tsx` already does correctly.

---

### Audit Summary

| Severity | Count | Issues |
|---|---|---|
| 🔴 High | 3 | REPORTS-01, REPORTS-02, REPORTS-04 (all broken) |
| 🟡 Medium | 1 | REPORTS-03 (missing aggregate fields) |
| 🟢 Low | 0 | — |
| **Total** | **4** | **All ✅ resolved** |
