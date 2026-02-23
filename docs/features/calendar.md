# Calendar Feature — Full Documentation & Audit

> **Module:** `calendar`  
> **Last audited:** 2026-02-23  
> **Stack:** Next.js 15 App Router · MongoDB/Mongoose · Zod validation · SWR · @dnd-kit/core

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Source](#2-data-source)
3. [API Usage](#3-api-usage)
4. [Views](#4-views)
5. [Filters](#5-filters)
6. [Drag-and-Drop Rescheduling](#6-drag-and-drop-rescheduling)
7. [Overdue Task Rescheduling](#7-overdue-task-rescheduling)
8. [Task Visibility Rules](#8-task-visibility-rules)
9. [Event Detail Sheet](#9-event-detail-sheet)
10. [Roles & Permissions](#10-roles--permissions)
11. [UI Pages & Components](#11-ui-pages--components)
12. [Audit Findings](#12-audit-findings)

---

## 1. Overview

The Calendar module is a **read and reschedule** view over the Tasks data. It renders tasks on a calendar grid based on their `dueDate` (and optionally spanning from `startDate` to `dueDate` for multi-day tasks). It does not have its own data model — all data is sourced from the Tasks collection via the existing Tasks API.

**Key design decisions:**
- No dedicated calendar backend — all data comes from `GET /api/tasks` with date-range query params.
- Three views: **Month**, **Week**, **Day** — each implemented as its own component.
- Tasks can be **dragged to a new due date** within any view via `@dnd-kit/core`; this calls `PUT /api/tasks/:taskId` under the hood.
- **Filtering** by priority and task type — values are passed to the API as query params (server-side) and also applied client-side as a fast local pass.
- The Day view link (`/tasks/new?dueDate=`) pre-fills the due date on the new task form.

---

## 2. Data Source

The Calendar has no own Mongoose model. It operates entirely on the `Task` model fields:

| Field | Used for |
|---|---|
| `_id` | Unique key, drag-and-drop ID, navigation links |
| `taskNumber` | Displayed in `EventDetailSheet` header |
| `title` | Event label in all views |
| `priority` | Border colour, Day view grouping, filter |
| `taskType` | Event sub-label, filter |
| `dueDate` | Primary placement on calendar grid |
| `startDate` | Multi-day span start (tasks appear on every day from `startDate` to `dueDate`) |
| `status.name` | Shown in `EventDetailSheet` badge |
| `status.color` | Status dot in event card |
| `status.isFinal` | Controls overdue highlighting — finalised tasks are never marked overdue |
| `assignees` | Shown in `EventDetailSheet` |
| `description` | Shown in `EventDetailSheet` |
| `lead` / `client` / `deal` | CRM links in `EventDetailSheet` |

---

## 3. API Usage

### Data Fetching

```
GET /api/tasks?dueDateFrom={ISO}&dueDateTo={ISO}&limit=500
```

The date range is computed per view:

| View | `dueDateFrom` | `dueDateTo` |
|---|---|---|
| Month | `startOfWeek(startOfMonth(currentDate))` | `endOfWeek(endOfMonth(currentDate))` |
| Week | `startOfWeek(currentDate)` | `endOfWeek(currentDate)` |
| Day | `currentDate` | `currentDate` |

The SWR key changes whenever `currentDate` or `view` changes, triggering a fresh fetch.

**Limit of 500 per request.** When the total number of matching tasks (`data.total`) exceeds the returned count, an orange warning banner is shown asking the user to narrow the date range or apply filters.

### Task Rescheduling (Drag-and-Drop)

```
PUT /api/tasks/:taskId
Body: { dueDate: "YYYY-MM-DD", startDate?: "YYYY-MM-DD" }
```

When a task with a `startDate` is dragged, `startDate` is shifted by the same number of days as `dueDate` to preserve the task's duration.

---

## 4. Views

### Month View (`MonthView`)

- Renders a 7-column grid covering all days from `startOfWeek(startOfMonth)` to `endOfWeek(endOfMonth)` — always a 4–6 week grid.
- Days outside the current month are rendered in a muted background.
- Today's date cell has a blue-tinted background; the day number gets a filled primary circle.
- Each cell shows up to **3 tasks** compact; overflow becomes a "+N more" button that navigates to the Day view for that date.
- Cells are `DroppableDay` drop targets.

### Week View (`WeekView`)

- Renders 7 columns for the current week (Sun–Sat).
- Header row shows abbreviated day name + date number + task count badge per column.
- Each column is a `DroppableDay`, minimum height 400 px.
- Multi-day tasks (where `startDate ≠ dueDate`) get a blue left-border stripe as a visual indicator.
- All tasks for the day are rendered (no overflow cap).

### Day View (`DayView`)

- Single-column layout for the selected date, minimum height 500 px.
- Tasks are **grouped by priority** in order: Urgent → High → Medium → Low.
- Each priority group shows a colour-coded badge + task count.
- Page header shows the full date string and total task count.
- A "+ New Task" button pre-fills `dueDate` in the new task form via query string (`/tasks/new?dueDate={ISO}`).
- The entire column is a `DroppableDay` drop target.

---

## 5. Filters

Filters are applied **client-side** after the API response loads — they do **not** modify the API query.

| Filter | State | Values |
|---|---|---|
| Priority | `filterPriority` | `all` · `urgent` · `high` · `medium` · `low` |
| Task Type | `filterType` | `all` · all 8 `TASK_TYPES` enum values |

Active filter count is shown as a badge. A "Clear filters" button appears when any filter is active.

Active `filterPriority` and `filterType` values are appended to the API request as `priority=` and `taskType=` query params, reducing server load and the volume of returned data. Client-side filtering is retained as a fast local pass while the API revalidates.

---

## 6. Drag-and-Drop Rescheduling

Implemented with `@dnd-kit/core`:

- **Draggable:** Each `CalendarEvent` registers as a draggable item with its `_id`.
- **Droppable:** Each `DroppableDay` registers as a droppable with an ISO date string as its ID.
- **Sensor:** `PointerSensor` with `activationConstraint: { distance: 8 }` — requires an 8 px drag before activating, preventing accidental drags on clicks.

**`handleDragEnd` flow:**

1. If user lacks `tasks:update` permission, return early immediately.
2. If no valid drop target, return early.
3. Look up the dragged task from the current `rawTasks` array.
4. If task has no `dueDate`, abort (tasks without a due date are not draggable).
5. Compute `delta` = day difference between old `dueDate` and new target date.
6. Build `body` with `dueDate: newDateStr`; if `startDate` exists, shift it by `delta`.
7. Apply **optimistic update** to SWR cache (immediate UI update without waiting for the server).
8. Send `PUT /api/tasks/:taskId` with the new dates — wrapped in `try/catch`.
   - On **error**: call `mutate()` to revert the optimistic update and show `toast.error()` with the server message.
9. Call `mutate()` to revalidate from the server on success.

---

## 7. Overdue Task Rescheduling

When any tasks in the current view are overdue (past due date, not today, not in a final status), a red **"Reschedule N overdue"** button appears in the toolbar.

**`handleRescheduleOverdue` flow:**

1. Collect all overdue tasks from `rawTasks`.
2. Fire `PUT /api/tasks/:taskId` with `{ dueDate: today }` for each task simultaneously via `Promise.allSettled`.
3. Call `mutate()` to revalidate.

Clicking the button opens an **`AlertDialog`** confirmation; the user must confirm before any changes are made. After `Promise.allSettled` resolves, a `toast.success` or `toast.warning` is shown summarising how many tasks were rescheduled successfully and how many failed.

---

## 8. Task Visibility Rules

A task appears on the calendar if and only if:

1. Its `dueDate` falls within the fetched date range, **or**
2. Its `startDate` is before the range end and its `dueDate` is after the range start (multi-day span overlaps the visible window).

**Tasks without a `dueDate` are never shown.**

Overdue highlighting:
- Red ring `ring-red-400` if: `isPast(dueDate) && !isToday(dueDate) && !status.isFinal`
- Orange ring `ring-orange-400` if: `isToday(dueDate)`

Priority border colours (left border stripe on each event card):

| Priority | Color |
|---|---|
| `urgent` | `border-l-red-500` |
| `high` | `border-l-orange-400` |
| `medium` | `border-l-blue-400` |
| `low` | `border-l-gray-300` |

---

## 9. Event Detail Sheet

Clicking any calendar event opens a slide-over `Sheet` (`EventDetailSheet`) from the right side:

**Header section:**
- Task number (e.g. `TASK-0042`)
- Task title
- Status badge (uses `status.color` for custom tinted badge)
- Priority badge

**Body sections (each only rendered if data is present):**
- **Schedule:** Start date and/or due date
- **Assignees:** Avatar row with full names
- **Description:** Full text, `whitespace-pre-wrap`
- **CRM Links:** Linked Lead / Client / Deal with navigation links to CRM detail pages

**Footer:**
- "Edit Task" → `/tasks/:taskId/edit`
- "View Full Details" → `/tasks/:taskId`

---

## 10. Roles & Permissions

The Calendar page has no dedicated page-level permission guard — it is accessible to any authenticated user who can reach the dashboard.

The underlying data respects the Tasks API's visibility scoping:
- Users without `tasks:view_all` only see tasks they created or are assigned to (enforced by the Tasks API, not the Calendar UI).
- Drag-and-drop and the "Reschedule overdue" button both require `tasks:update`. The calendar uses `usePermissions()` → `can("tasks:update")` to derive `canUpdate`, which:
  - Disables dragging in `CalendarEvent` (`canDrag={canUpdate}`) — listeners are not attached and the cursor shows `cursor-pointer` instead of `cursor-grab`.
  - Short-circuits `handleDragEnd` immediately if `!canUpdate`.
  - Hides the "Reschedule N overdue" button when `!canUpdate`.

---

## 11. UI Pages & Components

### Pages

| Route | File | Description |
|---|---|---|
| `/calendar` | `src/app/(dashboard)/calendar/page.tsx` | Main calendar page (320 lines) |

### Components

| Component | File | Description |
|---|---|---|
| `MonthView` | `src/components/calendar/month-view.tsx` | Month grid with 3-task overflow cap per cell |
| `WeekView` | `src/components/calendar/week-view.tsx` | 7-column week grid with multi-day stripe |
| `DayView` | `src/components/calendar/day-view.tsx` | Single day, tasks grouped by priority |
| `CalendarEvent` | `src/components/calendar/calendar-event.tsx` | Draggable event card with priority border and overdue ring |
| `DroppableDay` | `src/components/calendar/droppable-day.tsx` | `@dnd-kit` drop zone wrapper for any calendar cell |
| `EventDetailSheet` | `src/components/calendar/event-detail-sheet.tsx` | Slide-over sheet with full task details and CRM links |

### Type: `CalendarTask`

Defined and exported from `calendar-event.tsx`:

```ts
interface CalendarTask {
  _id: string;
  title: string;
  priority: string;
  taskType?: string;
  dueDate?: string;
  status?: { name: string; color: string; isFinal?: boolean };
  assignees?: { _id: string; firstName: string; lastName: string; avatar?: string }[];
}
```

Extended ad-hoc as `ExtendedTask` in `event-detail-sheet.tsx` (adds `startDate`, `description`, `taskNumber`, `lead`, `client`, `deal`). The `startDate` field is also cast inline via `task as { startDate?: string }` in the view components.

---

## 12. Audit Findings

### 🔴 Critical Issues

#### AUDIT-01 — Drag-and-drop has no error handling or failure feedback ✅ RESOLVED
**File:** `src/app/(dashboard)/calendar/page.tsx` — `handleDragEnd`  
**Issue:** The drag-and-drop `PUT` request had no `try/catch`. Failed requests applied the optimistic update permanently with no user feedback.  
**Fix:** Wrapped the fetch in `try/catch`. On error, `mutate()` is called immediately to revert the optimistic update, and `toast.error(...)` shows the server error message to the user.

---

#### AUDIT-02 — Bulk "Reschedule overdue" fires without confirmation and discards failures silently ✅ RESOLVED
**File:** `src/app/(dashboard)/calendar/page.tsx` — `handleRescheduleOverdue`  
**Issue:** Clicking the button immediately bulk-updated all overdue tasks with no confirmation and silent failure handling.  
**Fix:** The "Reschedule N overdue" button now opens an `AlertDialog` confirmation. After `Promise.allSettled` resolves, a `toast.success` or `toast.warning` is shown with the count of successes and failures.

---

### 🟡 Medium Issues

#### AUDIT-03 — No client-side permission check on drag-and-drop ✅ RESOLVED
**File:** `src/app/(dashboard)/calendar/page.tsx`, all view components  
**Issue:** Any authenticated user could drag tasks regardless of `tasks:update` permission, resulting in a silent server 403 that appeared as a successful reschedule until SWR reverted.  
**Fix:** Added `const { can } = usePermissions(); const canUpdate = can("tasks:update")` to the calendar page. `canUpdate` is passed as `canDrag` prop to `MonthView`, `WeekView`, and `DayView`, which thread it to each `CalendarEvent`. In `CalendarEvent`, `listeners` and `attributes` are only spread when `canDrag=true`; the cursor also changes to `cursor-pointer` instead of `cursor-grab`. `handleDragEnd` also short-circuits immediately if `!canUpdate`. The "Reschedule overdue" button is hidden for users without `tasks:update`.

---

#### AUDIT-04 — Hard `limit=200` silently truncates tasks in busy ranges ✅ RESOLVED
**File:** `src/app/(dashboard)/calendar/page.tsx`  
**Issue:** Tasks beyond 200 in the visible range were silently excluded.  
**Fix:** Limit raised to `500`. Added a `totalFetched` counter from `data.total`. When `totalFetched > rawTasks.length`, an orange warning banner is shown: *"Showing N of M tasks in this range. Narrow the date range or apply filters to see all."*

---

#### AUDIT-05 — Client-side filters fetch all data regardless ✅ RESOLVED
**File:** `src/app/(dashboard)/calendar/page.tsx`  
**Issue:** `filterPriority` and `filterType` were pure client-side filters; the API always received an unfiltered request.  
**Fix:** Active filter values are now appended to the API URL as `priority=` and `taskType=` query params (which the Tasks API already supports). Client-side filtering is retained as an instant local pass for fast UI response while the API revalidates.

---

### 🟢 Low / Informational

#### AUDIT-06 — `CalendarTask` type duplicated and `startDate` cast inline across files ✅ RESOLVED
**Files:** All calendar components  
**Issue:** `CalendarTask` was defined in `calendar-event.tsx` without `startDate`; `startDate` was accessed via `(task as { startDate?: string }).startDate` casts in 3 view files.  
**Fix:** Created `src/types/calendar.ts` with a canonical `CalendarTask` interface (now includes `startDate`) and `ExtendedCalendarTask` (adds `taskNumber`, `description`, CRM fields). All calendar components import from `@/types/calendar`; the inline casts are gone.

---

#### AUDIT-07 — Tasks without a `dueDate` are silently invisible ✅ RESOLVED
**File:** `src/app/(dashboard)/calendar/page.tsx`  
**Issue:** Tasks without a `dueDate` were excluded from all views with no indicator.  
**Fix:** Added a `tasksWithoutDueDate` count. When > 0, a small informational note is rendered below the filter bar: *"N task(s) not shown — no due date set."*

---

#### AUDIT-08 — Week view columns have no overflow cap ✅ RESOLVED
**File:** `src/components/calendar/week-view.tsx`  
**Issue:** Week view columns rendered all tasks with no height limit, producing an excessively tall layout on busy days.  
**Fix:** Changed column `DroppableDay` className from `min-h-[400px]` to `min-h-[120px] max-h-[500px] overflow-y-auto`. Columns now scroll within a bounded height instead of expanding infinitely.

---

#### AUDIT-09 — Day view "+ New Task" link pre-fills `dueDate` but form didn't read it ✅ RESOLVED
**File:** `src/app/(dashboard)/tasks/new/page.tsx`  
**Issue:** The Day view links to `/tasks/new?dueDate=...` but the new task page was a simple server component that ignored query params.  
**Fix:** Updated `NewTaskPage` to accept `searchParams` (Next.js App Router server component prop). When `dueDate` or `startDate` query params are present, a matching `initialData` object is passed to `TaskForm`, pre-populating the date fields.

---

### Summary

| Severity | Count | Status |
|---|:---:|---|
| 🔴 Critical | 2 | ✅ All resolved |
| 🟡 Medium | 3 | ✅ All resolved |
| 🟢 Low / Informational | 4 | ✅ All resolved |
| **Total** | **9** | **✅ All 9 fixed** |
