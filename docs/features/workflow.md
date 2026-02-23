# Workflow Feature — Full Documentation & Audit

> **Module:** `workflow`  
> **Last audited:** 2026-02-23  
> **Stack:** Next.js 15 App Router · MongoDB/Mongoose · Zod validation · SWR

---

## 1. Overview

The Workflow module is the **configuration layer** for task status management. It defines:

- **Statuses** — the named states a task can be in (e.g. "To Do", "In Progress", "Completed"). Each status has a colour, display order, a `isDefault` flag (applied to new tasks) and an `isFinal` flag (triggers `completedAt` on the task when entered).
- **Transitions** — the directed edges between statuses. Unless a transition from status A to status B exists and is active, moving a task to that state is blocked at the API level. Transitions can further restrict which roles may perform them and whether remarks are required or approval is needed.

**Design decisions:**
- Deleting a status or transition performs a **soft-delete** (`isActive: false`) rather than a hard delete, to avoid breaking task history.
- `slug` on `WorkflowStatus` is used as a stable identifier across seeding, automation, and reporting.
- The `isFinal` flag (not a separate "closed" concept) is the canonical signal that a task is complete. Setting `isFinal: true` on a status causes the task status route to stamp `completedAt`.
- `isDefault: true` means the status is auto-assigned to new tasks. Only one status should have this flag; the API enforces mutual exclusivity on creation and update.
- The `/workflow` page is only visible to users with `workflow:configure`.
- The transition check at task status-change time is entirely server-side — the client does not need to pre-fetch transitions.

---

## 2. Data Models

### `WorkflowStatus`
**File:** `src/models/WorkflowStatus.ts`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `name` | `string` | required | Display name (e.g. "In Progress") |
| `slug` | `string` | required, unique (index), lowercase | Stable identifier (e.g. `"in-progress"`) |
| `color` | `string` | default `"#6b7280"` | Hex colour for UI badges |
| `order` | `number` | required | Sort order in lists and the workflow page |
| `isDefault` | `boolean` | default `false` | Auto-assigned to new tasks; only one at a time |
| `isFinal` | `boolean` | default `false` | Stamps `task.completedAt` when entered |
| `isActive` | `boolean` | default `true` | Soft-delete flag |
| `createdAt` / `updatedAt` | `Date` | timestamps | Mongoose timestamps |

**Indexes:**
- `{ slug: 1 }` unique
- `{ order: 1 }`

### `WorkflowTransition`
**File:** `src/models/WorkflowTransition.ts`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `name` | `string` | optional | Human label (e.g. "Start Progress", "Approve") |
| `fromStatus` | `ObjectId → WorkflowStatus` | required | Source status |
| `toStatus` | `ObjectId → WorkflowStatus` | required | Target status |
| `allowedRoles` | `ObjectId[] → Role[]` | optional | If non-empty, only these roles may perform the transition |
| `requiresRemarks` | `boolean` | default `false` | PATCH `/tasks/:id/status` rejects the move without `remarks` |
| `requiresApproval` | `boolean` | default `false` | Flag for future approval workflow integration |
| `approverRoles` | `ObjectId[] → Role[]` | optional | Roles that can approve when `requiresApproval` is true |
| `isActive` | `boolean` | default `true` | Soft-delete flag |
| `createdAt` / `updatedAt` | `Date` | timestamps | Mongoose timestamps |

**Index:** `{ fromStatus: 1, toStatus: 1 }` unique — prevents duplicate transitions between the same pair.

---

## 3. API Reference

| Method | Route | Permission | Description |
|---|---|---|---|
| `GET` | `/api/workflow/statuses` | `withAuth` | List all active statuses sorted by `order` |
| `POST` | `/api/workflow/statuses` | `workflow:configure` | Create a new status (Zod-validated) |
| `PUT` | `/api/workflow/statuses` | `workflow:configure` | Update a status (`id` in request body) |
| `DELETE` | `/api/workflow/statuses?id=` | `workflow:configure` | Soft-delete a status |
| `GET` | `/api/workflow/transitions` | `withAuth` | List all active transitions (populated) |
| `POST` | `/api/workflow/transitions` | `workflow:configure` | Create a transition (Zod-validated, dedup check) |
| `PUT` | `/api/workflow/transitions` | `workflow:configure` | Update a transition (`id` in request body) |
| `DELETE` | `/api/workflow/transitions?id=` | `workflow:configure` | Soft-delete a transition |

---

## 4. Validation Schemas
**File:** `src/features/auth/validators.ts`

| Schema | Used by | Fields |
|---|---|---|
| `createWorkflowStatusSchema` | `POST /api/workflow/statuses` | `name` (min 1), `slug` (min 1), `color` (min 1), `order` (min 0), `isDefault` (bool), `isFinal` (bool) |
| `createTransitionSchema` | `POST /api/workflow/transitions` | `fromStatus`, `toStatus` (required strings), `name` (optional), `allowedRoles[]`, `requiresRemarks`, `requiresApproval`, `approverRoles[]` (all optional) |

---

## 5. Status Transition Flow (used by Tasks)

When a user changes a task's status via `PATCH /api/tasks/:taskId/status`:

1. Zod-validates `{ toStatusId, remarks? }`.
2. Looks up the target `WorkflowStatus`.
3. Queries `WorkflowTransition` for an active transition from the task's current status to `toStatusId`.
4. If no transition exists → `403 "Transition not allowed"`.
5. If transition has `allowedRoles` → confirms user's roles include at least one.
6. If transition `requiresRemarks` → rejects without `remarks`.
7. If target status `isFinal` → requires user to be an assignee OR have `tasks:approve`.
8. Updates `task.status`, sets `task.completedAt` if `isFinal`.
9. If `isFinal` and `taskType === "client_meeting"` and automation enabled → auto-creates a follow-up lead_follow_up task.
10. Logs activity, triggers `status_changed` notification.

---

## 6. Roles & Permissions

| Permission | Description | Default roles |
|---|---|---|
| `workflow:configure` | Create, edit, delete statuses and transitions | Admin |

All other authenticated users can read statuses (`GET /api/workflow/statuses`) and transitions (`GET /api/workflow/transitions`) — used during task creation and status change UIs.

The `/workflow` nav item is shown only to users with `workflow:configure` (guarded in `src/config/nav.ts`).

---

## 7. Default Statuses (Seed)
**File:** `src/config/permissions.ts` → `DEFAULT_WORKFLOW_STATUSES`

| Name | Slug | Color | Order | isDefault | isFinal |
|---|---|---|---|---|---|
| To Do | `to-do` | `#6b7280` | 1 | ✅ | ❌ |
| In Progress | `in-progress` | `#3b82f6` | 2 | ❌ | ❌ |
| On Hold | `on-hold` | `#f59e0b` | 3 | ❌ | ❌ |
| For Review | `for-review` | `#8b5cf6` | 4 | ❌ | ❌ |
| Completed | `completed` | `#10b981` | 5 | ❌ | ✅ |
| Cancelled | `cancelled` | `#ef4444` | 6 | ❌ | ✅ |

---

## 8. UI Pages & Components

| Type | Path | Description |
|---|---|---|
| Page | `src/app/(dashboard)/workflow/page.tsx` | Tabbed view: Statuses + Transitions CRUD |

**Page features:**
- Statuses tab: table with order, name (+ default badge), colour swatch, type (Final/Active), edit/delete buttons
- Transitions tab: table with name, from-status badge → to-status badge, settings badges, edit/delete buttons
- Both tabs have inline Create/Edit `Dialog` and `ConfirmDialog` for deletion
- Permission-gated: create/edit/delete actions only shown for `workflow:configure`

---

## 9. Audit Findings

### 🔴 Critical Issues

#### AUDIT-01 — Edit and delete HTTP calls hit non-existent dynamic routes ✅ RESOLVED
**Files:** `src/app/(dashboard)/workflow/page.tsx`  
**Issue:** `handleStatusSubmit` sends `PUT /api/workflow/statuses/${editingStatus}` and `handleDeleteStatus` sends `DELETE /api/workflow/statuses/${deleteStatusTarget._id}`. No `[statusId]/route.ts` file exists — both requests return 404. The same applies to transitions. **Every edit and delete silently fails.**  
**Fix:** PUT now sends `{ id, ...data }` to the base route. DELETE now uses `?id=` query param.

---

#### AUDIT-02 — Status creation always fails Zod validation ✅ RESOLVED
**Files:** `src/app/(dashboard)/workflow/page.tsx`, `src/features/auth/validators.ts`  
**Issue:** `createWorkflowStatusSchema` requires `slug`, `isDefault`, and `isFinal`. The UI form state was `{ name, color, order, isClosed }`. Zod rejected every create request — **no new status could ever be saved.**  
**Fix:** `slug` is now auto-derived from `name` on POST. `isDefault` and `isFinal` added to form state. Validator `order` changed to `z.number().min(0)`.

---

#### AUDIT-03 — `isClosed` used in UI everywhere; model fields `isDefault` and `isFinal` are never set ✅ RESOLVED
**Files:** `src/app/(dashboard)/workflow/page.tsx`, `src/models/WorkflowStatus.ts`, `src/types/index.ts`  
**Issue:** `isClosed` does not exist in the model (Zod strips it). `isFinal` was always `false` — tasks could never be stamped `completedAt`. `isDefault` was always `false` — the default status could not be set via the UI.  
**Fix:** Removed `isClosed` from all form state, handlers, and table row types. Replaced with `isDefault` and `isFinal` throughout `page.tsx`.

---

#### AUDIT-04 — `WorkflowTransition` has no `name` field; UI renders `t.name` as always `undefined` ✅ RESOLVED
**Files:** `src/models/WorkflowTransition.ts`, `src/types/index.ts`, `src/features/auth/validators.ts`, `src/app/(dashboard)/workflow/page.tsx`  
**Issue:** The transitions table renders a "Name" column but the Mongoose schema, TypeScript type, and Zod validator had no `name` field — every row was blank and the value was stripped by Zod on save.  
**Fix:** Added `name: { type: String }` to `WorkflowTransitionSchema`, `name?: string` to `IWorkflowTransition`, `name: z.string().optional()` to `createTransitionSchema`. Table renders `t.name || "—"`.

---

### 🟡 Medium Issues

#### AUDIT-05 — `GET /api/workflow/transitions` requires `workflow:configure` ✅ RESOLVED
**File:** `src/app/api/workflow/transitions/route.ts`  
**Issue:** GET transitions was wrapped with `withPermission("workflow:configure")` while GET statuses was open to `withAuth` — inconsistent and over-restrictive for any future non-admin reads.  
**Fix:** Changed GET handler from `withPermission("workflow:configure")` to `withAuth`.

---

#### AUDIT-06 — Transition form has no UI for `requiresRemarks`, `requiresApproval`, or `allowedRoles` ✅ RESOLVED
**File:** `src/app/(dashboard)/workflow/page.tsx`  
**Issue:** The `WorkflowTransition` model supports `requiresRemarks`, `requiresApproval`, and `allowedRoles` — all enforced by the task status-change route. The dialog only exposed `name`, `fromStatus`, and `toStatus`, making enforcement features inaccessible to admins.  
**Fix:** Added `requiresRemarks` and `requiresApproval` checkboxes to the transition dialog. Both included in `transForm` state and submitted to the API.

---

#### AUDIT-07 — Status form has no `isDefault` toggle ✅ RESOLVED
**File:** `src/app/(dashboard)/workflow/page.tsx`  
**Issue:** No UI element for `isDefault` — admins could not designate a default status, relying entirely on the seed. Re-seeded environments would produce tasks with `status: null`.  
**Fix:** Added `isDefault` checkbox to the status create/edit form. A "Default" badge is also shown next to the name in the table when `isDefault` is true.

---

### 🟢 Low / Informational

#### AUDIT-08 — Status table column label "Closed/Open" is semantically incorrect ✅ RESOLVED
**File:** `src/app/(dashboard)/workflow/page.tsx`  
**Issue:** Badge showed "Closed" / "Open" based on `isClosed` (non-existent field). After AUDIT-03 fix the labels needed to match the actual model semantics.  
**Fix:** Badge labels updated to "Final" / "Active" reflecting the `isFinal` field.

---

#### AUDIT-09 — No reorder UI for status `order` field
**File:** `src/app/(dashboard)/workflow/page.tsx`  
**Issue:** `WorkflowStatus.order` controls the display sort across the application (task status selectors, kanban, etc.). The only way to change the order is via the edit dialog with a raw number input. There is no drag-to-reorder or up/down control.  
**Recommendation:** Add up/down arrow buttons to the status table that decrement/increment `order` and call `PUT /api/workflow/statuses` with the updated value. (Full drag-to-reorder is out of scope here.)

---

### Summary

| Severity | Count | Status |
|---|:---:|---|
| 🔴 Critical | 4 | ✅ AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04 all resolved |
| 🟡 Medium | 3 | ✅ AUDIT-05, AUDIT-06, AUDIT-07 all resolved |
| 🟢 Low / Informational | 2 | ✅ AUDIT-08 resolved · AUDIT-09 pending (low priority) |
| **Total** | **9** | **8 resolved, 1 pending** |
