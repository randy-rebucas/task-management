# Performance & Incentives Feature

## Overview

The Performance & Incentives module tracks per-staff KPI scores, deal commissions, lead bonuses, and monthly targets. Managers can configure commission rules and set monthly targets per user.

**Route:** `/performance`  
**Permission (view):** `performance:view`  
**Permission (manage):** `performance:manage`  
**Nav group:** Analytics

---

## Data Models

### CommissionRule (`src/models/CommissionRule.ts`)

| Field | Type | Description |
|---|---|---|
| `department` | ObjectId → Department | Optional department match |
| `jobTitle` | String | Optional job title match |
| `dealCommissionRate` | Number (0–100) | % of deal value paid as commission |
| `leadConversionBonus` | Number | Flat bonus (₱) per new lead |
| `bonusThresholds` | `[{ minScore, bonusAmount }]` | KPI-score-based bonuses |
| `isActive` | Boolean | Whether rule is active |
| `createdBy` | ObjectId → User | |

Indexes: `department`, `jobTitle`

### PerformanceTarget (`src/models/PerformanceTarget.ts`)

| Field | Type | Description |
|---|---|---|
| `user` | ObjectId → User | Target subject |
| `month` | Number (1–12) | Period month |
| `year` | Number | Period year |
| `targetRevenue` | Number | Revenue target (₱) |
| `targetDeals` | Number | Deals closed target |
| `targetTasks` | Number | Tasks completed target |
| `targetLeads` | Number | New leads target |
| `createdBy` | ObjectId → User | |

Unique index: `{ user, month, year }`

---

## KPI Score Formula

```
completionScore = min(tasksCompleted / tasksAssigned, 1) × 40   // 40 pts
visitScore      = min(visitCount / 20, 1) × 30                  // 30 pts
leadScore       = min(newLeads / 10, 1) × 20                    // 20 pts
baseScore       = 10                                             // 10 pts
overdueDeduct   = min(tasksOverdue × 5, 30)                     // up to -30

performanceScore = max(0, completionScore + visitScore + leadScore + baseScore - overdueDeduct)
```

All inputs are period-scoped (within the selected `month`/`year`).

---

## API Routes

### `GET /api/performance/summary`

Permission: `performance:view`

**Query params:**

| Param | Type | Default |
|---|---|---|
| `month` | number (1–12) | current month |
| `year` | number | current year |
| `userId` | string (ObjectId) | session user id |

**Response shape:**

```json
{
  "period": { "month": 2, "year": 2026 },
  "user": { "firstName": "Jane", "lastName": "Doe", "email": "...", "avatar": "...", "department": "...", "jobTitle": "..." },
  "tasksCompleted": 12,
  "tasksAssigned": 15,
  "tasksOverdue": 2,
  "completionRate": 80,
  "dealsClosed": 3,
  "dealRevenue": 150000,
  "newLeads": 5,
  "performanceScore": 74,
  "commissionRate": 5,
  "commissionEarned": 7500,
  "leadBonus": 500,
  "scoreBonus": 1000,
  "totalIncentive": 9000,
  "rule": {
    "dealCommissionRate": 5,
    "leadConversionBonus": 100,
    "bonusThresholds": [{ "minScore": 80, "bonusAmount": 1000 }]
  },
  "target": {
    "targetRevenue": 200000,
    "targetDeals": 5,
    "targetTasks": 20,
    "targetLeads": 10
  },
  "achievementRate": { "revenue": 75, "deals": 60, "tasks": 60, "leads": 50 },
  "monthlyTrend": [
    {
      "month": 9, "year": 2025,
      "tasksCompleted": 10, "dealsClosed": 2, "dealRevenue": 80000,
      "commissionEarned": 4000, "scoreBonus": 0, "leadBonus": 200,
      "totalIncentive": 4200, "performanceScore": 68
    }
  ]
}
```

---

### `GET /api/performance/targets`

Permission: `performance:view`

**Query params:** `month`, `year`, `userId`  
**Response:** Array of `PerformanceTarget` documents (user populated: `firstName`, `lastName`, `email`, `avatar`)

---

### `POST /api/performance/targets`

Permission: `performance:manage`

**Body (validated by `createPerformanceTargetSchema`):**

```json
{
  "user": "<userId>",
  "month": 2,
  "year": 2026,
  "targetRevenue": 200000,
  "targetDeals": 5,
  "targetTasks": 20,
  "targetLeads": 10
}
```

Upserts by `{ user, month, year }`.

---

### `PUT /api/performance/targets/[targetId]`

Permission: `performance:manage`

**Body (validated by `updatePerformanceTargetSchema`):** Partial `{ targetRevenue, targetDeals, targetTasks, targetLeads }`

---

### `DELETE /api/performance/targets/[targetId]`

Permission: `performance:manage`

---

### `GET /api/performance/rules`

Permission: `performance:manage`

**Response:** Array of `CommissionRule` documents (department and createdBy populated)

---

### `POST /api/performance/rules`

Permission: `performance:manage`

**Body (validated by `createCommissionRuleSchema`):**

```json
{
  "department": "<deptId>",
  "jobTitle": "Sales Agent",
  "dealCommissionRate": 8,
  "leadConversionBonus": 150,
  "bonusThresholds": [
    { "minScore": 80, "bonusAmount": 1000 },
    { "minScore": 90, "bonusAmount": 2000 }
  ],
  "isActive": true
}
```

---

### `PUT /api/performance/rules/[ruleId]`

Permission: `performance:manage`  
**Body:** Partial `createCommissionRuleSchema`

---

### `DELETE /api/performance/rules/[ruleId]`

Permission: `performance:manage`

---

## UI — `/performance`

Single page (`src/app/(dashboard)/performance/page.tsx`) with 5 tabs:

| Tab | Description |
|---|---|
| Overview | 4 metric cards (commission, score bonus, total incentive, KPI score) + activity metrics + target-vs-actual bars |
| Commission | Detailed breakdown: deal commission + lead bonus + score bonus + threshold table |
| Targets | Set / edit monthly targets per user per period |
| Monthly Summary | 6-month bar chart (tasks, deals, total incentive) + summary table |
| Commission Rules | List all rules, add new rules (managers only) |

**SWR keys:**
- `/api/users?limit=100&isActive=true` — user selector
- `/api/performance/summary?month=M&year=Y&userId=ID` — main data
- `/api/performance/rules` — rules tab

---

## Validators (`src/features/auth/validators.ts`)

| Schema | Used by |
|---|---|
| `createCommissionRuleSchema` | `POST /api/performance/rules` |
| `updateCommissionRuleSchema` | `PUT /api/performance/rules/[ruleId]` |
| `createPerformanceTargetSchema` | `POST /api/performance/targets` |
| `updatePerformanceTargetSchema` | `PUT /api/performance/targets/[targetId]` |

---

## Audit Findings

### PERF-01 — `visitCount` hardcoded to 0 — **HIGH** — ✅ RESOLVED

**Problem:** `computeForPeriod` and all 6 trend iterations pass `visitCount: 0` to `calcScore`. The formula weights visit score at 30/100, so `performanceScore` can never exceed 70 regardless of field activity.

**Fix:** Added `models.FieldSession.countDocuments({ user: uid, status: "completed", date: { $gte: start, $lte: end } })` to the `Promise.all` inside `computeForPeriod`. Returned `visitCount` from the helper, then passed it to both `calcScore` calls.

---

### PERF-02 — Serial trend loop — **MEDIUM** — ✅ RESOLVED

**Problem:** Monthly trend computation used a `for` loop with 6 sequential `await computeForPeriod` calls, serialising 6 sets of DB queries (~30 queries in sequence).

**Fix:** Built an array of `{ tMonth, tYear }` tuples and ran all 6 calls through `Promise.all(months.map(...))`.

---

### PERF-03 — `tasksAssigned` not period-scoped — **MEDIUM** — ✅ RESOLVED

**Problem:** `tasksAssigned` counted all non-archived assigned tasks (no date filter), while `tasksCompleted` was filtered to the period. A user with 100 historical tasks completing 10 this month earned `completionScore = 10/100 × 40 = 4` instead of the expected `10/10 × 40 = 40`.

**Fix:** Added `createdAt: { $gte: start, $lte: end }` to the `tasksAssigned` `countDocuments` call inside `computeForPeriod`.
