# Departments Feature

## Overview

Departments are organisational units used to group staff, scope KPI/team reports, and filter commission rules. They support hierarchy via `parentDepartment` and an optional `head` user.

**Route:** `/departments`  
**Permissions:** `departments:view`, `departments:create`, `departments:update`, `departments:delete`  
**Nav group:** People & Org

---

## Data Model — `Department` (`src/models/Department.ts`)

| Field | Type | Description |
|---|---|---|
| `name` | String (unique) | Display name |
| `code` | String (unique, uppercase) | Short identifier (max 20 chars) |
| `description` | String | Optional description |
| `head` | ObjectId → User | Optional department head |
| `parentDepartment` | ObjectId → Department | Optional parent (hierarchy) |
| `isActive` | Boolean | Soft-delete flag (default `true`) |

Indexes: `isActive`

---

## Validators (`src/features/auth/validators.ts`)

| Schema | Fields |
|---|---|
| `createDepartmentSchema` | `name` (req), `code` (req, uppercased), `description?`, `head?`, `parentDepartment?`, `isActive?` |
| `updateDepartmentSchema` | All fields optional |

---

## API Routes

### `GET /api/departments`

Permission: `departments:view`

Returns all **active** (`isActive: true`) departments, sorted by name, with `head` and `parentDepartment` populated.

**Response:** Plain array of department documents.

```json
[
  {
    "_id": "...",
    "name": "Sales",
    "code": "SALES",
    "description": "Sales and partnerships team",
    "head": { "firstName": "Ana", "lastName": "Cruz", "email": "..." },
    "parentDepartment": null,
    "isActive": true
  }
]
```

---

### `POST /api/departments`

Permission: `departments:create`

**Body** (validated by `createDepartmentSchema`):

```json
{
  "name": "Sales",
  "code": "SALES",
  "description": "Optional description",
  "head": "<userId>",
  "parentDepartment": "<deptId>"
}
```

- Returns `409` if `name` or `code` already exists (including inactive departments)
- Logs `department.created` activity

---

### `GET /api/departments/[deptId]`

Permission: `departments:view`

Returns single department (active or inactive) with `head` and `parentDepartment` populated.

---

### `PUT /api/departments/[deptId]`

Permission: `departments:update`

**Body** (validated by `updateDepartmentSchema`): Any subset of department fields.  
Logs `department.updated` activity with list of updated field names.

---

### `DELETE /api/departments/[deptId]`

Permission: `departments:delete`

**Soft-delete only** — sets `isActive: false`. Does not modify any User records.  
Logs `department.deactivated` activity.

---

## UI — `/departments`

Single page (`src/app/(dashboard)/departments/page.tsx`).

**SWR key:** `/api/departments`

**Table columns:** Name, Description, Actions (edit/delete — gated by permission)

**Dialog:** Single create/edit dialog (shared) with Name, Code, Description fields. `code` value is `.toUpperCase()`'d in both the UI input handler and the validator.

**Delete:** `ConfirmDialog` — calls `DELETE /api/departments/:id`. After deletion the row disappears (only active departments displayed).

---

## Audit Findings

### DEPT-01 — GET list returned inactive departments — **HIGH** — ✅ RESOLVED

**Problem:** `GET /api/departments` called `models.Department.find()` with no filter. After soft-deleting a department (`isActive: false`), it continued to appear in the departments list page and in every department dropdown throughout the app (commission rules, user forms, staff filters, KPI team view, etc.).

**Fix:** Added `{ isActive: true }` to the `find()` call.

---

### DEPT-02 — Delete confirmation text claimed staff would be unassigned — **LOW** — ✅ RESOLVED

**Problem:** The `ConfirmDialog` description said: *"Staff members in this department will be unassigned."* The DELETE endpoint only sets `isActive: false` — it never touches User records. Users remain assigned to the deactivated department in the database, which is misleading and could cause confusion.

**Fix:** Updated the confirmation text to accurately describe the operation: *"It will be hidden from all lists. Staff members currently assigned to this department will not be unassigned automatically."*
