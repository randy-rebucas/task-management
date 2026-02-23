# KPI Dashboard Feature

## Overview

The KPI Dashboard provides per-user, leaderboard, and team-comparison views of task completion, field visit, and lead activity metrics. Stats cover either the current week or current month, with trend comparison against the previous period.

**Route:** `/kpi`  
**Nav group:** Analytics (no permission gate — all authenticated users can access their own data)

---

## KPI Score Formula

Same formula used across all three routes (with period-aware targets):

```
visitTarget = 5  (week) | 20  (month)
leadTarget  = 3  (week) | 10  (month)

completionScore = min(tasksCompleted / tasksAssigned, 1) × 40   // 40 pts
visitScore      = min(visitCount / visitTarget, 1) × 30          // 30 pts
leadScore       = min(newLeads / leadTarget, 1) × 20             // 20 pts
baseScore       = 10                                              // 10 pts
overdueDeduct   = min(tasksOverdue × 5, 30)                      // up to −30

performanceScore = max(0, round(completionScore + visitScore + leadScore + baseScore − overdueDeduct))
```

`tasksAssigned`, `tasksCompleted`, `visitCount`, and `newLeads` are all **period-scoped** (created/updated between period `start` and `end`). `tasksOverdue` is current (dueDate < now AND not in a final status, regardless of period).

---

## Period Ranges

| Period | Start | End |
|---|---|---|
| `week` | Most recent Monday 00:00 | now |
| `month` | 1st of current month 00:00 | now |

Previous period (used for trend in `/my`):

| Period | prevStart | prevEnd |
|---|---|---|
| `week` | Mon of previous week | Sun of previous week 23:59:59 |
| `month` | 1st of previous month | Last day of previous month 23:59:59 |

---

## API Routes

### `GET /api/kpi/my`

Auth: any authenticated user (`withAuth`)  
**Query param:** `period` = `"week"` (default) | `"month"`

Returns KPI data for the **session user only**.

**Response:**

```json
{
  "period": "week",
  "periodLabel": "This Week",
  "tasksAssigned": 8,
  "tasksCompleted": 6,
  "tasksOverdue": 1,
  "visitCount": 4,
  "newLeads": 2,
  "totalLeads": 15,
  "closingRate": 40,
  "performanceScore": 72,
  "trend": {
    "tasksCompleted": 2,
    "visitCount": -1,
    "newLeads": 0,
    "performanceScore": 5
  },
  "dailyActivity": [
    { "day": "Mon", "completed": 2, "visits": 1 },
    { "day": "Tue", "completed": 1, "visits": 0 }
  ]
}
```

- `visitCount` = `FieldSession` count (period-scoped by `date`) + `VisitLog` count (period-scoped by `createdAt`)
- `dailyActivity` only populated for `period=week`; empty array for month
- `trend` = current value − previous period value (positive = improvement)

---

### `GET /api/kpi/leaderboard`

Auth: `withPermission("visit_logs:view_all")`  
**Query param:** `period`

Returns all active users ranked by `performanceScore`.

**Response:**

```json
{
  "period": "week",
  "rankings": [
    {
      "rank": 1,
      "user": { "_id": "...", "firstName": "Ana", "lastName": "Cruz", "email": "..." },
      "tasksAssigned": 10,
      "tasksCompleted": 9,
      "tasksOverdue": 0,
      "visitCount": 5,
      "newLeads": 3,
      "closingRate": 67,
      "performanceScore": 95
    }
  ]
}
```

- Sorted by `performanceScore` descending; `rank` is 1-based index
- All fields computed in batch aggregations — no N+1 queries
- `closingRate` = `round(closedLeads / totalLeads * 100)` (all-time, not period-scoped)

---

### `GET /api/kpi/team`

Auth: `withPermission("visit_logs:view_all")`  
**Query param:** `period`

Returns per-department aggregated KPI stats.

**Response:**

```json
{
  "period": "week",
  "departments": [
    {
      "department": { "_id": "...", "name": "Sales" },
      "memberCount": 5,
      "totalTasksCompleted": 22,
      "totalTasksAssigned": 30,
      "totalOverdue": 3,
      "totalVisits": 18,
      "totalLeads": 10,
      "avgPerformanceScore": 74
    }
  ]
}
```

- Sorted by `avgPerformanceScore` descending
- Users without a department are excluded (`__none__` filtered out)
- `avgPerformanceScore` = mean of individual member scores

---

## UI — `/kpi`

Single page (`src/app/(dashboard)/kpi/page.tsx`) with 3 tabs:

| Tab | Visibility | Component |
|---|---|---|
| My Performance | All authenticated users | `MyPerformanceTab` |
| Leaderboard | `can("visit_logs:view_all")` | `LeaderboardTab` |
| Team Comparison | `can("visit_logs:view_all")` | `TeamTab` |

**SWR keys:**
- `/api/kpi/my?period=<period>` — always fetched
- `/api/kpi/leaderboard?period=<period>` — only when `leaderboard` tab active
- `/api/kpi/team?period=<period>` — only when `team` tab active

**Period switcher:** This Week / This Month buttons in `PageHeader` action slot.

---

## Audit Findings

### KPI-01 — `tasksAssigned` not period-scoped in `kpi/my` — **HIGH** — ✅ RESOLVED

**Problem:** `fetchKPIs` in `kpi/my/route.ts` counted `tasksAssigned` with no date filter:
```ts
models.Task.countDocuments({ assignees: uid, isArchived: false })
```
A user with 150 historical tasks completing 8 this week would score `8/150 × 40 = 2.1` completion points instead of `8/8 × 40 = 40`. The `completionScore` component (40/100 of total) was heavily deflated for all users with any task history.

**Fix:** Added `createdAt: { $gte: start, $lte: end }` to scope the assigned count to the period.

---

### KPI-02 — `totalAssigned` not period-scoped in `kpi/leaderboard` — **MEDIUM** — ✅ RESOLVED

**Problem:** The leaderboard `taskAgg` aggregation used `totalAssigned: { $sum: 1 }` which counted every non-archived task regardless of when it was created. `completedInPeriod` was correctly period-scoped, creating the same score deflation as KPI-01 for all leaderboard entries.

**Fix:** Replaced `{ $sum: 1 }` with a conditional that only counts tasks created in `[start, end]`:
```ts
totalAssigned: {
  $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", start] }, { $lte: ["$createdAt", end] }] }, 1, 0] }
}
```

---

### KPI-03 — `assigned` not period-scoped in `kpi/team` — **MEDIUM** — ✅ RESOLVED

**Problem:** Same as KPI-02 — the `taskAgg` in `kpi/team/route.ts` used `assigned: { $sum: 1 }` (all-time), while `completed` was period-scoped. Individual scores fed into `avgPerformanceScore` were all artificially low for departments with tenured staff.

**Fix:** Applied the same conditional sum as KPI-02 to the `assigned` field in the team taskAgg `$group` stage.
