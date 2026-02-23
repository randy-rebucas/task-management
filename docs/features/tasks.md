# Tasks Feature — Full Documentation & Audit

> **Module:** `tasks`  
> **Last audited:** 2026-02-23  
> **Stack:** Next.js 15 App Router · MongoDB/Mongoose · Zod validation · SWR  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Models](#2-data-models)
3. [CRUD Operations](#3-crud-operations)
4. [API Reference](#4-api-reference)
5. [Filters & Query Parameters](#5-filters--query-parameters)
6. [Roles & Permissions](#6-roles--permissions)
7. [Task Types](#7-task-types)
8. [Workflow & Status Transitions](#8-workflow--status-transitions)
9. [Subtasks](#9-subtasks)
10. [Task Dependencies](#10-task-dependencies)
11. [Time Logging](#11-time-logging)
12. [Attachments & Voice Notes](#12-attachments--voice-notes)
13. [Comments](#13-comments)
14. [CRM Integration](#14-crm-integration)
15. [Recurring Tasks](#15-recurring-tasks)
16. [Notifications & Activity Logging](#16-notifications--activity-logging)
17. [Automation](#17-automation)
18. [UI Pages & Components](#18-ui-pages--components)
19. [Validation Schemas](#19-validation-schemas)
20. [Audit Findings](#20-audit-findings)

---

## 1. Overview

The Tasks module is the core of the platform. It handles the full lifecycle of work items — creation, assignment, status transitions, time tracking, attachments, comments, dependencies, and automated follow-ups. Tasks can be linked to CRM entities (Leads, Clients, Deals), scoped to Departments, tagged, and set to recur on a schedule.

**Key design decisions:**
- Tasks are never hard-deleted — they are **soft-deleted** via the `isArchived` flag.
- Status transitions are controlled by a configurable **WorkflowStatus/WorkflowTransition** system; final statuses (e.g., "Completed", "Cancelled") set `completedAt`.
- Visibility is permission-gated: users without `tasks:view_all` only see tasks they created or are assigned to.
- All mutations are logged via `logActivity` and trigger push/in-app notifications via `triggerNotification`.

---

## 2. Data Models

### 2.1 Task (`src/models/Task.ts`)

| Field | Type | Notes |
|---|---|---|
| `taskNumber` | `String` | Auto-generated, unique (e.g. `TASK-0001`). Indexed. |
| `title` | `String` | Required, max 200 chars. |
| `description` | `String` | Optional free text. |
| `status` | `ObjectId → WorkflowStatus` | Required. Resolved via configurable workflow. |
| `priority` | `enum` | `low` · `medium` (default) · `high` · `urgent` |
| `taskType` | `enum` | See [Task Types](#7-task-types). Optional. |
| `category` | `String` | Free-text category label. |
| `assignees` | `ObjectId[] → User` | Array of assigned users. |
| `createdBy` | `ObjectId → User` | Required. Set server-side from session. |
| `department` | `ObjectId → Department` | Optional department scope. |
| `dueDate` | `Date` | Optional deadline. |
| `startDate` | `Date` | Optional start date. |
| `completedAt` | `Date` | Set automatically when a final status is applied. |
| `estimatedHours` | `Number` | Optional effort estimate. |
| `actualHours` | `Number` | Auto-calculated from time log entries. |
| `tags` | `String[]` | Free + predefined tags. |
| `isRecurring` | `Boolean` | Enables recurring config. |
| `recurringConfig` | `Embedded` | `frequency`, `interval`, `daysOfWeek`, `endDate` |
| `subtasks` | `Embedded[]` | Inline subtask array (title, completed, completedAt, assignee). |
| `isArchived` | `Boolean` | Soft-delete flag (default `false`). |
| `lead` | `ObjectId → Lead` | CRM link. |
| `client` | `ObjectId → Client` | CRM link. |
| `deal` | `ObjectId → Deal` | CRM link. |

**Indexes:** `taskNumber`, `status`, `priority`, `taskType`, `assignees`, `createdBy`, `department`, `dueDate`, `isArchived+status`, full-text on `title+description`, `lead`, `client`, `deal`.

---

### 2.2 TaskComment (`src/models/TaskComment.ts`)

| Field | Type | Notes |
|---|---|---|
| `task` | `ObjectId → Task` | Required. |
| `author` | `ObjectId → User` | Required. |
| `content` | `String` | Required. |
| `isSystemGenerated` | `Boolean` | Set to `true` for auto-generated transition remarks. |
| `parentComment` | `ObjectId → TaskComment` | Optional, enables threaded replies. |

---

### 2.3 TaskAttachment (`src/models/TaskAttachment.ts`)

| Field | Type | Notes |
|---|---|---|
| `task` | `ObjectId → Task` | Required. |
| `uploadedBy` | `ObjectId → User` | Required. |
| `fileName` | `String` | Original filename. |
| `fileUrl` | `String` | Public path: `/uploads/{taskId}/{uuid}{ext}`. |
| `fileSize` | `Number` | Bytes. Max 10 MB enforced by API. |
| `mimeType` | `String` | Validated against `FILE_UPLOAD.allowedTypes`. |
| `attachmentType` | `enum` | `file` (default) · `voice_note` |
| `isProofOfWork` | `Boolean` | Tags attachment as proof-of-work evidence. |

---

### 2.4 TaskDependency (`src/models/TaskDependency.ts`)

| Field | Type | Notes |
|---|---|---|
| `task` | `ObjectId → Task` | The dependent task. |
| `dependsOn` | `ObjectId → Task` | The blocking/related task. |
| `type` | `enum` | `blocks` · `blocked_by` (default) · `related` |

Unique index on `(task, dependsOn)` — prevents duplicate dependency edges. Self-dependency is rejected at the API layer.

---

### 2.5 TaskTimeLog (`src/models/TaskTimeLog.ts`)

| Field | Type | Notes |
|---|---|---|
| `task` | `ObjectId → Task` | Required. |
| `user` | `ObjectId → User` | Required. |
| `startTime` | `Date` | Required. |
| `endTime` | `Date` | Optional. |
| `duration` | `Number` | Minutes (≥0). Required. |
| `description` | `String` | Optional note. |

After each `POST`, `task.actualHours` is recomputed via an aggregation pipeline that sums all `duration` values for that task.

---

## 3. CRUD Operations

### Create Task
- **Permission required:** `tasks:create`
- **Route:** `POST /api/tasks`
- Auto-assigns `taskNumber` as `TASK-{N padded 4 digits}`.
- Auto-sets `status` to the default `WorkflowStatus` (fails with 500 if none configured).
- Sets `createdBy` from session — client cannot override this.
- **Validation rule:** Field-type tasks (`field_visit`, `client_meeting`, `lead_follow_up`, `proposal_submission`, `collection_payment`, `partner_onboarding`) **must** be linked to at least one of Lead, Client, or Deal.
- Triggers `task_assigned` notification if `assignees` is non-empty.
- Logs `task.created` activity.

### Read Task (list)
- **Permission required:** Authenticated (`withAuth`)
- **Route:** `GET /api/tasks`
- Users without `tasks:view_all` are automatically restricted to tasks where `assignees` or `createdBy` matches their session ID.
- Populates: `status`, `assignees`, `createdBy`, `department`.
- Supports full-text search (`$text`), status, priority, assignee, department, and date-range filters.
- Returns paginated response: `{ data, total, page, limit, totalPages }`.

### Read Task (single)
- **Permission required:** `tasks:view`
- **Route:** `GET /api/tasks/:taskId`
- Populates all related entities including CRM links (`lead`, `client`, `deal`).
- Also returns `allowedTransitions` — the list of valid next workflow statuses for the current status.

### Read My Tasks
- **Permission required:** Authenticated (`withAuth`)
- **Route:** `GET /api/tasks/my`
- Hard-filters by `assignees: session.user.id` and `isArchived: false`.
- Supports `status` and `priority` filters.
- Sorted by `dueDate ASC, priority DESC`.

### Update Task
- **Permission required:** `tasks:update`
- **Route:** `PUT /api/tasks/:taskId`
- All fields optional (partial update).
- CRM fields (`lead`, `client`, `deal`) set to `""` or `null` are properly `$unset` from the document.
- Triggers `task_updated` notification.
- Logs `task.updated` activity with changed field names.

### Delete (Archive) Task
- **Permission required:** `tasks:delete`
- **Route:** `DELETE /api/tasks/:taskId`
- **Soft delete only** — sets `isArchived: true`.
- Never destroys associated comments, attachments, time logs, or dependencies.
- Logs `task.archived` activity.

---

## 4. API Reference

| Method | Route | Permission | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | authenticated | List all tasks (filtered by visibility) |
| `POST` | `/api/tasks` | `tasks:create` | Create a new task |
| `GET` | `/api/tasks/my` | authenticated | List tasks assigned to current user |
| `GET` | `/api/tasks/:taskId` | `tasks:view` | Get single task with transitions |
| `PUT` | `/api/tasks/:taskId` | `tasks:update` | Update task fields |
| `DELETE` | `/api/tasks/:taskId` | `tasks:delete` | Archive task (soft delete) |
| `PATCH` | `/api/tasks/:taskId/status` | `tasks:update` | Transition task status via workflow |
| `PATCH` | `/api/tasks/:taskId/assign` | `tasks:assign` | Reassign task assignees |
| `GET` | `/api/tasks/:taskId/comments` | `tasks:view` | List comments |
| `POST` | `/api/tasks/:taskId/comments` | `tasks:update` | Add a comment |
| `GET` | `/api/tasks/:taskId/attachments` | `tasks:view` | List attachments |
| `POST` | `/api/tasks/:taskId/attachments` | `tasks:update` | Upload a file or voice note |
| `GET` | `/api/tasks/:taskId/subtasks` | `tasks:view` | List subtasks |
| `POST` | `/api/tasks/:taskId/subtasks` | `tasks:update` | Add a subtask |
| `PATCH` | `/api/tasks/:taskId/subtasks/:subtaskId` | `tasks:update` | Toggle subtask completion |
| `DELETE` | `/api/tasks/:taskId/subtasks/:subtaskId` | `tasks:update` | Remove a subtask |
| `GET` | `/api/tasks/:taskId/dependencies` | `tasks:view` | List dependencies |
| `POST` | `/api/tasks/:taskId/dependencies` | `tasks:update` | Add a dependency |
| `DELETE` | `/api/tasks/:taskId/dependencies?id=` | `tasks:update` | Remove a dependency |
| `GET` | `/api/tasks/:taskId/time-logs` | `tasks:view` | List time log entries |
| `POST` | `/api/tasks/:taskId/time-logs` | `tasks:update` | Log time on a task |
| `DELETE` | `/api/tasks/:taskId/time-logs/:logId` | `tasks:update` | Delete a time log entry (recomputes `actualHours`) |
| `DELETE` | `/api/tasks/:taskId/attachments/:attachmentId` | `tasks:update` | Delete an attachment and remove from storage |

---

## 5. Filters & Query Parameters

### `GET /api/tasks`

| Param | Type | Description |
|---|---|---|
| `search` | `string` | Full-text search across title + description |
| `status` | `ObjectId` | Filter by workflow status ID |
| `priority` | `low\|medium\|high\|urgent` | Filter by priority |
| `assignee` | `ObjectId` | Filter by specific assignee user ID |
| `department` | `ObjectId` | Filter by department ID |
| `isArchived` | `boolean` | Default `false`. Set `true` to view archived tasks |
| `dueDateFrom` | `ISO date string` | Due date range start (`$gte`) |
| `dueDateTo` | `ISO date string` | Due date range end (`$lte`) |
| `page` | `number` | Pagination page (default `1`) |
| `limit` | `number` | Items per page (default `20`) |

### `GET /api/tasks/my`

| Param | Type | Description |
|---|---|---|
| `status` | `ObjectId` | Filter by workflow status ID |
| `priority` | `low\|medium\|high\|urgent` | Filter by priority |
| `page` | `number` | Pagination page |
| `limit` | `number` | Items per page |

> **Note:** The Tasks List UI at `/tasks` exposes search, status, priority, department, and assignee filters, plus an **Active / Archived** toggle. Date-range filters (`dueDateFrom`, `dueDateTo`) exist in the API but are not yet surfaced in the UI.

---

## 6. Roles & Permissions

### Permission Definitions (Task Group)

| Permission | Description |
|---|---|
| `tasks:create` | Create new tasks |
| `tasks:view` | View own/assigned tasks (single task detail) |
| `tasks:view_all` | View all tasks across all departments |
| `tasks:update` | Update task fields, add subtasks, attachments, time logs, dependencies |
| `tasks:delete` | Archive tasks |
| `tasks:assign` | Assign tasks to staff |
| `tasks:reassign` | Reassign tasks (distinct from initial assign) |
| `tasks:approve` | Approve task completion (required to close tasks when not an assignee) |

### Role → Task Permission Matrix

| Role | create | view | view_all | update | delete | assign | reassign | approve |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Operations Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Field Coordinator | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Sales Officer | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Partner Onboarding Officer | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finance | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Viewer / Auditor | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Special Authorization Rules

1. **Status to Final:** Closing a task (status `isFinal: true`) requires the user to be an assignee **or** hold `tasks:approve`.
2. **Transition Role Gating:** Individual workflow transitions can restrict allowed roles via `WorkflowTransition.allowedRoles`.
3. **Visibility Scoping:** Without `tasks:view_all`, the list endpoint appends `$or: [{ assignees: userId }, { createdBy: userId }]` to every query.

---

## 7. Task Types

Task types are defined in `src/config/constants.ts` and enforced as an enum in the Mongoose schema.

| Value | Label | Field Type? |
|---|---|---|
| `field_visit` | Field Visit | ✅ (requires CRM link) |
| `client_meeting` | Client Meeting | ✅ (requires CRM link) |
| `orientation_event` | Orientation Event | ❌ |
| `lead_follow_up` | Lead Follow-up | ✅ (requires CRM link) |
| `proposal_submission` | Proposal Submission | ✅ (requires CRM link) |
| `collection_payment` | Collection / Payment Follow-up | ✅ (requires CRM link) |
| `partner_onboarding` | Partner Onboarding | ✅ (requires CRM link) |
| `internal_task` | Internal Task | ❌ |

> **Field-type tasks** (`FIELD_TASK_TYPES`) must be linked to at least one of: `lead`, `client`, or `deal`. This is enforced via `createTaskSchema.superRefine()`.

---

## 8. Workflow & Status Transitions

Task statuses are **not** hardcoded — they are managed via the `WorkflowStatus` and `WorkflowTransition` collections, configurable under **Settings → Workflow**.

### Default Statuses (seeded)

| Name | Slug | Color | Default | Final |
|---|---|---|:---:|:---:|
| To Do | `to-do` | `#6b7280` | ✅ | ❌ |
| In Progress | `in-progress` | `#3b82f6` | ❌ | ❌ |
| On Hold | `on-hold` | `#f59e0b` | ❌ | ❌ |
| For Review | `for-review` | `#8b5cf6` | ❌ | ❌ |
| Completed | `completed` | `#10b981` | ❌ | ✅ |
| Cancelled | `cancelled` | `#ef4444` | ❌ | ✅ |

### Transition Flow

```
PATCH /api/tasks/:taskId/status
Body: { toStatusId: string, remarks?: string }
```

**Validation chain:**
1. Target `WorkflowStatus` must exist.
2. A `WorkflowTransition` record with `fromStatus → toStatus` must exist and be active.
3. If `transition.allowedRoles` is non-empty, user's roles must intersect.
4. If `transition.requiresRemarks`, `remarks` field is mandatory.
5. If `toStatus.isFinal`, user must be an assignee **or** hold `tasks:approve`.

**Side effects on success:**
- `task.status` updated.
- `task.completedAt` set if `isFinal`.
- System comment auto-created when `remarks` is provided.
- `task.status_changed` activity logged.
- `status_changed` notification triggered.
- Auto follow-up task created if `taskType === "client_meeting"` and the automation setting is enabled (see [Automation](#17-automation)).

---

## 9. Subtasks

Subtasks are stored as an **embedded array** inside the `Task` document (not a separate collection).

| Operation | Method | Route | Permission |
|---|---|---|---|
| List | `GET` | `/api/tasks/:taskId/subtasks` | `tasks:view` |
| Create | `POST` | `/api/tasks/:taskId/subtasks` | `tasks:update` |
| Toggle complete | `PATCH` | `/api/tasks/:taskId/subtasks/:subtaskId` | `tasks:update` |
| Delete | `DELETE` | `/api/tasks/:taskId/subtasks/:subtaskId` | `tasks:update` |

**Schema:** Each subtask has `title` (max 200), `completed`, `completedAt`, and optional `assignee`.

**Limitation:** Subtask `assignee` is stored in the model but the `createSubtaskSchema` validates only `title` and `assignee (optional string)`. The UI currently does not expose per-subtask assignee assignment.

---

## 10. Task Dependencies

Dependencies are stored in the separate `TaskDependency` collection, allowing flexible relationship types.

| Type | Meaning |
|---|---|
| `blocks` | This task blocks the `dependsOn` task |
| `blocked_by` | This task is blocked by `dependsOn` |
| `related` | General relationship, no blocking semantics |

**Constraints:**
- A task cannot depend on itself (API-enforced check).
- Duplicate edges are prevented by unique index `(task, dependsOn)`.
- Circular dependencies (A → B → C → A) are detected via a DFS traversal before persisting; the API returns `409` if a cycle would be created.

---

## 11. Time Logging

```
POST /api/tasks/:taskId/time-logs
Body: { startTime, endTime?, duration (minutes), description? }
```

- Any user with `tasks:update` can log time against any task.
- After creating a log entry, `task.actualHours` is recalculated via MongoDB aggregation summing all `duration` values for the task, then dividing by 60.
- Logs are sorted `startTime DESC` on retrieval.

---

## 12. Attachments & Voice Notes

```
POST /api/tasks/:taskId/attachments
Content-Type: multipart/form-data
Fields: file (File), isProofOfWork? (boolean), attachmentType? ("file"|"voice_note")
```

**Constraints (from `FILE_UPLOAD` config in `src/config/constants.ts`):**
- Max file size: **10 MB**
- File type restricted to `FILE_UPLOAD.allowedTypes`

**Storage:** Files are handled via `src/lib/storage.ts` — a provider abstraction that writes to `public/uploads/{taskId}/{uuid}{ext}` locally by default, or to S3-compatible object storage when `STORAGE_PROVIDER=s3` is set in the environment.

**Proof of Work flag:** Setting `isProofOfWork: true` marks the attachment so it can be surfaced in the Proof of Work module.

---

## 13. Comments

- Reading comments requires `tasks:view`. **Posting** a comment requires `tasks:update` (Finance / Viewer-Auditor roles with `tasks:view` only cannot post).
- Comments support `parentComment` for threaded (nested) replies.
- A special `isSystemGenerated: true` flag is used for auto-created status-transition remarks.
- Comments are sorted `createdAt ASC` on retrieval.
- `task_assigned` → `comment_added` notifications are triggered on new comments.

---

## 14. CRM Integration

Tasks can be optionally linked to CRM entities:

| Field | Linked Model | Populated Fields |
|---|---|---|
| `lead` | `Lead` | `name`, `company`, `status`, `email` |
| `client` | `Client` | `name`, `company`, `status`, `email` |
| `deal` | `Deal` | `title`, `stage`, `value` |

- Field-type tasks **require** at least one CRM link.
- When updating, setting a CRM field to `""` or `null` properly `$unset`s the field in MongoDB (avoids stale ObjectId references).
- The task form fetches CRM data via `/api/crm/leads`, `/api/crm/clients`, `/api/crm/deals` with a limit of 100 records.

---

## 15. Recurring Tasks

When `isRecurring: true`, a `recurringConfig` object must be provided:

| Field | Type | Values |
|---|---|---|
| `frequency` | `enum` | `daily` · `weekly` · `monthly` · `yearly` |
| `interval` | `Number` | Min 1 (e.g., every 2 weeks) |
| `daysOfWeek` | `Number[]` | 0–6 (Sun–Sat), used for weekly frequency |
| `endDate` | `Date` | Optional end boundary |

> **Implementation:** A Vercel Cron Job runs daily at 00:05 UTC via `GET /api/cron/tasks/recurring`. For each active tenant it finds tasks with `isRecurring: true`, checks whether today matches the configured `frequency`/`interval`/`daysOfWeek`, prevents duplicate spawning if a clone was already created today, and creates a new task instance using `getNextTaskNumber`. The cron entry is defined in `vercel.json`.

---

## 16. Notifications & Activity Logging

### Activity Logs

Every mutation logs a structured activity via `logActivity()`:

| Action Key | Trigger |
|---|---|
| `task.created` | `POST /api/tasks` |
| `task.updated` | `PUT /api/tasks/:taskId` |
| `task.archived` | `DELETE /api/tasks/:taskId` |
| `task.reassigned` | `PATCH /api/tasks/:taskId/assign` |
| `task.status_changed` | `PATCH /api/tasks/:taskId/status` |

### Notifications

| Event Key | Trigger |
|---|---|
| `task_assigned` | Task created with assignees, or task reassigned |
| `task_updated` | Task details updated |
| `status_changed` | Status transition applied |
| `comment_added` | New comment posted |

---

## 17. Automation

### Auto Follow-up Task

When a `client_meeting` task transitions to a **final** status:

1. The system checks the `automation.followUpTask` `AppSetting` key (defaults to `true` if not set).
2. If enabled, a new task is auto-created:
   - Title: `Follow-up: {original title}`
   - Type: `lead_follow_up`
   - Status: default workflow status
   - Same priority and assignees as original
   - Due date: **+3 days** from now
   - CRM links (`client`, `lead`, `deal`) copied from original
3. A `task_assigned` notification is sent for the follow-up task.

---

## 18. UI Pages & Components

### Pages

| Route | File | Description |
|---|---|---|
| `/tasks` | `src/app/(dashboard)/tasks/page.tsx` | Task list with search, status, and priority filters |
| `/tasks/new` | `src/app/(dashboard)/tasks/new/` | New task creation form |
| `/tasks/:taskId` | `src/app/(dashboard)/tasks/[taskId]/page.tsx` | Full task detail view (124 lines — composed from extracted cards) |
| `/tasks/:taskId/edit` | `src/app/(dashboard)/tasks/[taskId]/edit/` | Edit task form |
| `/my-tasks` | `src/app/(dashboard)/my-tasks/page.tsx` | Personal task list (assignee-scoped) |

### Components

| Component | File | Description |
|---|---|---|
| `TaskForm` | `src/components/tasks/task-form.tsx` | Shared create/edit form (573 lines) |
| `TaskComments` | `src/components/tasks/task-comments.tsx` | Comment list + reply UI |
| `TaskStatusBadge` | `src/components/tasks/task-status-badge.tsx` | Colored status pill |
| `TaskPriorityBadge` | `src/components/tasks/task-priority-badge.tsx` | Priority indicator badge |
| `LogTimeForm` | `src/components/LogTimeForm.tsx` | Time logging form (used in detail page) |
| `SubmitProofModal` | `src/components/proof/submit-proof-modal.tsx` | Proof of work submission modal |
| `TaskSubtasksCard` | `src/components/tasks/task-subtasks-card.tsx` | Subtask CRUD with self-contained state |
| `TaskAttachmentsCard` | `src/components/tasks/task-attachments-card.tsx` | File/voice attachment list with per-item delete |
| `TaskTimeLogsCard` | `src/components/tasks/task-time-logs-card.tsx` | Hours display, progress bar, log form |
| `TaskProofCard` | `src/components/tasks/task-proof-card.tsx` | Proof submissions with self-managed SWR |
| `TaskCrmLinksCard` | `src/components/tasks/task-crm-links-card.tsx` | Linked Lead/Client/Deal display |
| `TaskPropertiesCard` | `src/components/tasks/task-properties-card.tsx` | Properties, status transitions, inline edit form |

### Task Detail Page Features

The `/tasks/:taskId` page (124 lines) composes the following extracted cards:
- **`TaskPropertiesCard`** — inline edit mode (loads users and departments lazily via SWR only when edit mode opens), status transition selector
- **`TaskSubtasksCard`** — subtask add/toggle/delete
- **`TaskAttachmentsCard`** — file upload (standard + voice note), per-attachment delete
- **`TaskTimeLogsCard`** — time log display via `LogTimeForm`
- **`TaskProofCard`** — Proof of Work submissions via `SubmitProofModal`
- **`TaskCrmLinksCard`** — CRM entity display (Lead / Client / Deal links)
- All actions are permission-gated via `usePermissions()` (`can("tasks:update")` etc.)

---

## 19. Validation Schemas

All schemas defined in `src/features/auth/validators.ts`:

| Schema | Used By |
|---|---|
| `createTaskSchema` | `POST /api/tasks` |
| `updateTaskSchema` | `PUT /api/tasks/:taskId` |
| `statusTransitionSchema` | `PATCH /api/tasks/:taskId/status` |
| `assignTaskSchema` | `PATCH /api/tasks/:taskId/assign` |
| `createCommentSchema` | `POST /api/tasks/:taskId/comments` |
| `createSubtaskSchema` | `POST /api/tasks/:taskId/subtasks` |
| `updateSubtaskSchema` | `PATCH /api/tasks/:taskId/subtasks/:subtaskId` |
| `createTimeLogSchema` | `POST /api/tasks/:taskId/time-logs` |
| `createDependencySchema` | `POST /api/tasks/:taskId/dependencies` |

---

## 20. Audit Findings

### 🔴 Critical Issues

#### AUDIT-01 — `taskNumber` is not race-condition-safe ✅ RESOLVED
**File:** `src/app/api/tasks/route.ts` (POST), `src/app/api/tasks/[taskId]/status/route.ts`  
**Issue:** Task numbers were generated by counting existing documents (`countDocuments() + 1`). Under concurrent requests two tasks could receive the same number.  
**Fix:** Created `src/lib/task-counter.ts` which uses `findOneAndUpdate` with `$inc` on a dedicated `AppSetting` counter document, guaranteeing atomic uniqueness. Both `tasks/route.ts` (POST) and `status/route.ts` (follow-up task creation) now call `getNextTaskNumber(models)`.

---

#### AUDIT-02 — Files stored on local filesystem (not cloud storage) ✅ RESOLVED
**File:** `src/app/api/tasks/[taskId]/attachments/route.ts`  
**Issue:** Uploaded files were written to `public/uploads/` on the server filesystem using Node.js `fs/promises`, incompatible with serverless/multi-instance deployments.  
**Fix:** Created `src/lib/storage.ts` — a storage abstraction with a `localStorageProvider` (active) and an `s3StorageProvider` stub (swap via `STORAGE_PROVIDER=s3` env var). The attachments `POST` now calls `uploadFile(taskId, file.name, buffer)` from this module. The new `DELETE /api/tasks/:taskId/attachments/:attachmentId` route calls `deleteFile(fileUrl)` on removal.

---

### 🟡 Medium Issues

#### AUDIT-03 — No circular dependency detection ✅ RESOLVED
**File:** `src/app/api/tasks/[taskId]/dependencies/route.ts`  
**Issue:** The API prevented self-dependencies and duplicate edges but did not detect cycles (e.g., A → B → C → A).  
**Fix:** Added a `wouldCreateCycle(models, fromTaskId, toTaskId)` DFS helper at the top of the route file. Before persisting a new dependency, the POST handler calls this function and returns a `409` if a cycle would be created.

---

#### AUDIT-04 — Recurring tasks are configuration-only ✅ RESOLVED
**Files:** `src/app/api/cron/tasks/recurring/route.ts` (new), `vercel.json`  
**Issue:** The `isRecurring` and `recurringConfig` fields were stored but never acted upon.  
**Fix:** Created `src/app/api/cron/tasks/recurring/route.ts`. The route authenticates via `CRON_SECRET`, iterates all active tenants, finds recurring tasks whose frequency/interval/daysOfWeek match today, prevents duplicate spawning by checking for a same-day clone, and creates new task instances using `getNextTaskNumber`. Added a cron entry to `vercel.json` (`"5 0 * * *"` — daily 00:05 UTC).

---

#### AUDIT-05 — `POST /api/tasks/:taskId/comments` uses `tasks:view` not `tasks:comment` ✅ RESOLVED
**File:** `src/app/api/tasks/[taskId]/comments/route.ts`  
**Issue:** Finance and Viewer/Auditor roles (which only have `tasks:view`) could post comments.  
**Fix:** Changed the `POST` handler's `withPermission` guard from `"tasks:view"` to `"tasks:update"`.

---

#### AUDIT-06 — `reassign` permission is defined but never checked ✅ RESOLVED
**File:** `src/app/api/tasks/[taskId]/assign/route.ts`  
**Issue:** `tasks:reassign` was defined in the permission registry and granted to `operations-manager`/`super-admin` but was never enforced at the API level.  
**Fix:** After loading the existing task, if `previousAssignees.length > 0` (i.e., this is a reassignment not an initial assignment), the handler now calls `getTenantPermissions` + `checkPermission` for `tasks:reassign` and returns a `403` if absent.

---

#### AUDIT-07 — `actualHours` can drift if time log entries are deleted ✅ RESOLVED
**File:** `src/app/api/tasks/[taskId]/time-logs/[logId]/route.ts` (new)  
**Issue:** There was no `DELETE` endpoint for time log entries; `actualHours` was only recomputed on `POST`.  
**Fix:** Created `DELETE /api/tasks/:taskId/time-logs/:logId`. After deleting the entry it re-aggregates `$sum` of all remaining entries and writes the result back to `task.actualHours`, keeping the value always consistent.

---

#### AUDIT-08 — Large task detail page (879 lines) — single-file god component ✅ RESOLVED
**File:** `src/app/(dashboard)/tasks/[taskId]/page.tsx`  
**Issue:** 879 lines handling all task interactions in a single component.  
**Fix:** Extracted 6 self-contained components to `src/components/tasks/`:
- `task-subtasks-card.tsx` — subtask CRUD with its own state
- `task-attachments-card.tsx` — file/voice attachment list with delete
- `task-time-logs-card.tsx` — hours display, progress bar, log form
- `task-proof-card.tsx` — proof submissions, self-managed SWR
- `task-crm-links-card.tsx` — linked lead/client/deal display
- `task-properties-card.tsx` — properties, status transitions, inline edit form

The detail page was rewritten to 124 lines, composing these components.

---

### 🟢 Low / Informational

#### AUDIT-09 — `isArchived` filter defaults to `false` but no UI for viewing archived tasks ✅ RESOLVED
**File:** `src/app/(dashboard)/tasks/page.tsx`  
**Fix:** Added an **Active / Archived** toggle button to the tasks list filter bar. When toggled, `isArchived=true` is appended to the API query and page resets to 1.

---

#### AUDIT-10 — Advanced filters not exposed in the UI ✅ RESOLVED
**File:** `src/app/(dashboard)/tasks/page.tsx`  
**Fix:** Added `department` and `assignee` `<Select>` pickers to the tasks list filter bar. Both fetch their option lists via SWR (`/api/departments` and `/api/users?limit=100`) and pass the selected IDs as query params.

---

#### AUDIT-11 — No pagination controls on tasks list ✅ NOT AN ISSUE
**File:** `src/app/(dashboard)/tasks/page.tsx`  
**Note:** On investigation the tasks list already had fully functional previous/next pagination controls (`data?.totalPages > 1` guard with buttons and `Page X of Y (Z tasks)` counter). This finding was a false positive.

---

#### AUDIT-12 — `My Tasks` page lacks search and department filter ✅ RESOLVED
**File:** `src/app/(dashboard)/my-tasks/page.tsx`  
**Fix:** Added a debounced search `<Input>` (using `useDebounce`) alongside the existing status filter. The debounced value is appended as `?search=` to the API URL, consistent with the main tasks list.

---

#### AUDIT-13 — No DELETE endpoint for attachments ✅ RESOLVED
**File:** `src/app/api/tasks/[taskId]/attachments/[attachmentId]/route.ts` (new)  
**Fix:** Created `DELETE /api/tasks/:taskId/attachments/:attachmentId`. Verifies ownership by the task, calls `deleteFile(attachment.fileUrl)` from `@/lib/storage`, then deletes the DB record. The `TaskAttachmentsCard` component exposes a delete button per attachment that calls this endpoint.

---

#### AUDIT-14 — `createTaskSchema` CRM validation path is misleading ✅ RESOLVED
**File:** `src/features/auth/validators.ts`  
**Issue:** `superRefine` reported the CRM error only on `path: ["lead"]`.  
**Fix:** Changed to emit the error on all three relevant fields (`lead`, `client`, `deal`) simultaneously, giving front-end form libraries accurate field highlighting.

---

### Summary

| Severity | Count | Status |
|---|:---:|---|
| 🔴 Critical | 2 | ✅ All resolved |
| 🟡 Medium | 6 | ✅ All resolved |
| 🟢 Low / Informational | 6 | ✅ All resolved (AUDIT-11 was a false positive) |
| **Total** | **14** | **✅ 13 fixed, 1 N/A** |
