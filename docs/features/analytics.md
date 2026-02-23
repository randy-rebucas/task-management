# Analytics Feature

## Overview

The Analytics module provides business-intelligence dashboards across CRM, field operations, and pipeline data. It has 5 views, each backed by a dedicated API route.

**Route:** `/analytics`  
**Permission:** `reports:view`  
**Nav group:** Analytics

---

## API Routes

All routes: `GET`, permission `reports:view`, no query params, no pagination.

---

### `GET /api/analytics/conversion-by-industry`

Groups leads by `industry`, calculates conversion rate per industry.

**Response:**

```json
{
  "rows": [
    { "industry": "Hospitality", "total": 42, "converted": 18, "rate": 42.9 }
  ],
  "grandTotal": 120,
  "grandConverted": 51,
  "overallRate": 42.5
}
```

- `rate` = `round((converted / total) * 100, 1)`
- `overallRate` = `round((grandConverted / grandTotal) * 100, 1)`
- Leads with no `industry` grouped as `"(unspecified)"`

---

### `GET /api/analytics/revenue-by-territory`

Aggregates `closed_won` deals, grouping by the department of the deal's `assignedTo` user.

**Response:**

```json
{
  "rows": [
    { "territory": "Sales", "revenue": 450000, "deals": 9, "avgDeal": 50000 }
  ],
  "totalRevenue": 850000,
  "topTerritory": "Sales",
  "totalDeals": 17,
  "overallAvgDeal": 50000
}
```

- `territory` = department name of deal owner; `"(no department)"` if unset
- Sorted by `revenue` descending

---

### `GET /api/analytics/visit-to-close`

Calculates how many CRM interactions of `type: "visit"` occurred before a lead was converted.

**Response:**

```json
{
  "avgVisitsToClose": 3.2,
  "totalConverted": 51,
  "bySource": [
    { "source": "referral", "avg": 2.1, "count": 15 }
  ],
  "distribution": [
    { "visits": "0", "count": 4 },
    { "visits": "1", "count": 8 },
    { "visits": "5+", "count": 3 }
  ]
}
```

- Only `status: "converted"` leads are included
- Visits from `CrmInteraction` where `type: "visit"` and `lead` matches
- Distribution buckets: 0–4 exact, then `"5+"` for ≥5

---

### `GET /api/analytics/coordinator-efficiency`

Returns a ranked list of field coordinators with sessions, hours, tasks, and an efficiency score over the last 30 days.

**Coordinator identification:** `isActive` users whose roles have a slug containing `"field"`.

**Efficiency score formula (relative to team):**

```
score = (sessions / maxSessions) * 40
      + (tasksCompleted / maxTasks) * 40
      + (avgSessionHours / maxAvgHours) * 20
```

**Response:** Plain array (not wrapped in object):

```json
[
  {
    "userId": "...",
    "user": { "_id": "...", "firstName": "Ana", "lastName": "Cruz", "email": "...", "avatar": null },
    "sessions": 18,
    "totalHours": 54.5,
    "avgSessionHours": 3.0,
    "tasksCompleted": 12,
    "efficiencyScore": 87
  }
]
```

- Sorted by `efficiencyScore` descending
- `duration` stored in minutes; route divides by 60 for hours

---

### `GET /api/analytics/pipeline-aging`

Shows open deals (not closed_won / closed_lost) grouped by stage, measuring days since last update.

**Response:**

```json
{
  "rows": [
    { "stage": "proposal", "count": 4, "totalValue": 200000, "avgAgeDays": 18.5, "maxAgeDays": 42.0 }
  ],
  "hasStaleStage": true,
  "totalPipelineValue": 650000,
  "totalOpenDeals": 11
}
```

- `ageDays` = `(now - updatedAt) / 86400000` (days since last modified)
- `hasStaleStage` = true when any stage has `avgAgeDays > 30`
- Rows sorted by canonical stage order: prospect → contacted → meeting → proposal → negotiation
- Stages with `avgAgeDays > 30` render red in the UI bar chart

---

## UI — `/analytics`

Single page (`src/app/(dashboard)/analytics/page.tsx`) with 5 custom tab components:

| Tab | Component | API |
|---|---|---|
| Conversion by Industry | `ConversionTab` | `/api/analytics/conversion-by-industry` |
| Revenue by Territory | `RevenueTab` | `/api/analytics/revenue-by-territory` |
| Visit-to-Close | `VisitToCloseTab` | `/api/analytics/visit-to-close` |
| Coordinator Efficiency | `EfficiencyTab` | `/api/analytics/coordinator-efficiency` |
| Pipeline Aging | `PipelineTab` | `/api/analytics/pipeline-aging` |

Each tab is only fetched when selected (SWR keys are static, so first render triggers the fetch but data is cached).

Tabs use a custom button tab bar (not shadcn `Tabs`). Active tab stored in `useState<Tab>`.

---

## Audit Findings

### ANALYTICS-01 — FieldSession aggregate uses unindexed field — **MEDIUM** — ✅ RESOLVED

**Problem:** `coordinator-efficiency/route.ts` filtered `FieldSession` documents with:
```ts
{ "checkIn.time": { $gte: thirtyDaysAgo } }
```
The only index on `FieldSession` is `date` (the session date field, set on check-in). Using `checkIn.time` forces a full collection scan on every request.

**Fix:** Changed the `$match` to use the indexed `date` field:
```ts
{ date: { $gte: thirtyDaysAgo } }
```
Both fields represent when the session started; `date` is indexed and equivalent for the 30-day window filter.

---

### ANALYTICS-02 — Missing compound index on CrmInteraction for visit-to-close — **MEDIUM** — ✅ RESOLVED

**File:** `src/models/CrmInteraction.ts`

**Problem:** `visit-to-close/route.ts` queries:
```ts
{ lead: { $in: convertedLeadIds }, type: "visit" }
```
Only `{ lead: 1, date: -1 }` and `{ client: 1, date: -1 }` indexes exist. MongoDB uses the `lead` index to find matching documents, then performs a full scan of all interactions for each lead to filter by `type`. On large datasets this is O(interactions_per_lead).

**Fix:** Added a compound index to `CrmInteraction`:
```ts
CrmInteractionSchema.index({ lead: 1, type: 1 }); // visit-to-close analytics
```
MongoDB can now satisfy both predicates via a single index seek.

---

### ANALYTICS-03 — Missing compound index on Task for coordinator-efficiency — **MEDIUM** — ✅ RESOLVED

**File:** `src/models/Task.ts`

**Problem:** `coordinator-efficiency/route.ts` queries:
```ts
{ assignees: { $in: userIds }, completedAt: { $gte: thirtyDaysAgo } }
```
Only `{ assignees: 1 }` exists. MongoDB uses `assignees` to find matching tasks, then scans all of them to filter `completedAt`. For teams with high task volume this becomes expensive.

**Fix:** Added a compound index to `Task`:
```ts
TaskSchema.index({ assignees: 1, completedAt: 1 }); // coordinator-efficiency analytics
```
