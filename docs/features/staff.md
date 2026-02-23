# Staff & Roles

## Overview
The Staff module covers user management (CRUD, bulk CSV import, soft-delete/deactivate), role management (create/edit/delete/clone), permission management (grouped permission list), department management, and the authenticated user's own profile/password settings.

---

## File Inventory

| Path | Purpose |
|------|---------|
| `src/models/User.ts` | User schema + bcrypt hook + `comparePassword` method |
| `src/models/Role.ts` | Role schema |
| `src/models/Permission.ts` | Permission schema |
| `src/models/Department.ts` | Department schema |
| `src/types/index.ts` (L47–105) | `IPermission`, `IRole`, `IUser`, `IDepartment` |
| `src/features/auth/validators.ts` (L22–100) | `createRoleSchema`, `updateRoleSchema`, `createDepartmentSchema`, `updateDepartmentSchema`, `createUserSchema`, `updateUserSchema` |
| `src/app/api/users/route.ts` | `GET` list + `POST` create user |
| `src/app/api/users/[userId]/route.ts` | `GET` / `PUT` / `DELETE` a user |
| `src/app/api/users/me/route.ts` | `GET` own profile + permissions · `PATCH` update profile · `PUT` change password |
| `src/app/api/users/import/route.ts` | `POST` bulk CSV import |
| `src/app/api/roles/route.ts` | `GET` list + `POST` create role |
| `src/app/api/roles/[roleId]/route.ts` | `GET` / `PUT` / `DELETE` a role |
| `src/app/api/roles/[roleId]/clone/route.ts` | `POST` clone a role |
| `src/app/api/permissions/route.ts` | `GET` all permissions grouped |
| `src/app/api/departments/route.ts` | `GET` list + `POST` create department |
| `src/app/api/departments/[deptId]/route.ts` | `GET` / `PUT` / `DELETE` a department |
| `src/app/(dashboard)/staff/page.tsx` | Staff list with search/role/dept/status filters |
| `src/app/(dashboard)/staff/new/page.tsx` | Create staff form |
| `src/app/(dashboard)/staff/import/page.tsx` | CSV import with preview + result table |
| `src/app/(dashboard)/staff/[userId]/page.tsx` | Staff detail (profile, performance snapshot) |
| `src/app/(dashboard)/staff/[userId]/edit/page.tsx` | Edit staff form |
| `src/app/(dashboard)/roles/page.tsx` | Roles list |
| `src/app/(dashboard)/roles/new/page.tsx` | Create role form with grouped permission checkboxes |
| `src/app/(dashboard)/roles/[roleId]/edit/page.tsx` | Edit role form |

---

## Data Models

### User
```ts
{
  email:                 string   // required, unique, lowercase
  password:              string   // required, select:false; bcrypt pre-save
  firstName:             string   // required
  lastName:              string   // required
  avatar?:               string
  phone?:                string
  roles:                 ObjectId[] → Role  // required (min 1 enforced in validator)
  department?:           ObjectId → Department
  team?:                 string
  jobTitle?:             string
  isActive:              boolean  // default true
  owner?:                ObjectId → User   // tenant-scoping: creator's owner or self
  lastLoginAt?:          Date
  passwordResetToken?:   string
  passwordResetExpires?: Date
}
```
**Indexes:** `{ department }`, `{ roles }`, `{ isActive }`, text on `firstName,lastName,email`  
**Methods:** `comparePassword(candidate): Promise<boolean>`  
**Pre-save hook:** bcrypt hash on password change

### Role
```ts
{
  name:        string   // required, unique
  slug:        string   // required, unique, lowercase; auto-derived from name
  description: string   // default ""
  permissions: ObjectId[] → Permission
  isSystem:    boolean  // default false; system roles cannot be deleted
  isActive:    boolean  // default true
  createdBy?:  ObjectId → User
}
```
**Indexes:** `{ slug }`, `{ isActive }`

### Permission
```ts
{
  resource:    string  // required
  action:      string  // required
  description: string  // required
  group:       string  // required
}
```
**Indexes:** `{ resource, action }` unique

### Department
```ts
{
  name:               string   // required, max 100
  code:               string   // required, max 20, uppercase; unique
  description?:       string
  head?:              ObjectId → User
  parentDepartment?:  ObjectId → Department
  isActive:           boolean  // default true
}
```

---

## Validators

| Schema | Fields |
|--------|--------|
| `createRoleSchema` | `name`(1-50), `description`?(max 200), `permissions`(array, min 1) |
| `updateRoleSchema` | all optional; `isActive` boolean |
| `createUserSchema` | `email`, `password`(min 8), `firstName`(1-50), `lastName`(1-50), `roles`(min 1), `department`?, `team`?, `jobTitle`?, `phone`? |
| `updateUserSchema` | all optional + `isActive` boolean |
| `createDepartmentSchema` | `name`(1-100), `code`(1-20 uppercase), `description`?, `head`?, `parentDepartment`?, `isActive`? |
| `updateDepartmentSchema` | all optional |

---

## API Routes

### Users

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| `GET` | `/api/users` | `users:view` | Filter: `search`($text), `department`, `role`(→roles array), `isActive`(true/false); paginated; `.lean()` |
| `POST` | `/api/users` | `users:create` | `createUserSchema`; propagates `owner` from creator's owner chain |
| `GET` | `/api/users/:userId` | `users:view` | Populates `roles`+`department`; `.lean()` |
| `PUT` | `/api/users/:userId` | `users:update` | `updateUserSchema`; `Object.assign` + `save()` |
| `DELETE` | `/api/users/:userId` | `users:delete` | **Soft delete** — sets `isActive: false`; logs `user.deactivated` |
| `GET` | `/api/users/me` | `withAuth` | Returns user + computed `permissions[]` array |
| `PATCH` | `/api/users/me` | `withAuth` | Profile update: `firstName`, `lastName`, `phone`, `jobTitle`, `team` |
| `PUT` | `/api/users/me` | `withAuth` | Password change: verifies `currentPassword` via bcrypt; re-hashes via pre-save |
| `POST` | `/api/users/import` | `users:import` | PapaParse CSV; row-by-row creation; skips duplicates; returns `{ created, skipped, errors }` |

**CSV import required columns:** `email`, `password`, `firstName`, `lastName`  
**CSV import optional columns:** `phone`, `jobTitle`, `department`, `roles` (semicolon-separated IDs)

### Roles

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| `GET` | `/api/roles` | `roles:view` | Populates `permissions`; sorted `createdAt:-1`; `.lean()` |
| `POST` | `/api/roles` | `roles:create` | `createRoleSchema`; validates permission IDs via `countDocuments`; auto-derives `slug` |
| `GET` | `/api/roles/:roleId` | `roles:view` | Populates `permissions`; `.lean()` |
| `PUT` | `/api/roles/:roleId` | `roles:update` | `updateRoleSchema`; re-derives `slug` if name changes |
| `DELETE` | `/api/roles/:roleId` | `roles:delete` | Blocked on `isSystem: true` roles |
| `POST` | `/api/roles/:roleId/clone` | `roles:clone` | Copies name/description/permissions; new slug from `name + " (Copy)"` |

### Permissions & Departments

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| `GET` | `/api/permissions` | `roles:view` | Returns `{ permissions[], grouped }` — sorted by `group,resource,action` |
| `GET` | `/api/departments` | `departments:view` | Populates `head`+`parentDepartment`; `.lean()` |
| `POST` | `/api/departments` | `departments:create` | `createDepartmentSchema`; name+code uniqueness check |
| `GET/PUT/DELETE` | `/api/departments/:deptId` | `departments:*` | Standard CRUD |

---

## Permissions

| Permission | Granted to |
|-----------|------------|
| `users:view` | Admin, Super Admin, Manager, HR Manager, Supervisor |
| `users:create` | Admin, Super Admin, HR Manager |
| `users:update` | Admin, Super Admin, HR Manager |
| `users:delete` | Admin, Super Admin only |
| `users:import` | Admin, Super Admin, HR Manager |
| `roles:view` | Admin, Super Admin, HR Manager |
| `roles:create` | Admin, Super Admin |
| `roles:update` | Admin, Super Admin |
| `roles:delete` | Admin, Super Admin |
| `roles:clone` | Admin, Super Admin |
| `departments:view` | All roles |
| `departments:create/update/delete` | Admin, Super Admin, HR Manager |

---

## UI Pages

### `/staff` — Staff List
- Search (debounced), role/department/status filters
- Table: avatar, name+job title, email, department, role badges, active status, actions dropdown (edit/delete)
- Delete uses `ConfirmDialog` (already AlertDialog-based via the shared component)
- Pagination

### `/staff/new` — Create Staff
- Fields: email, password, firstName, lastName, phone, jobTitle, department (Select), roles (Checkbox list)
- Fetches `/api/roles` (returns array directly), `/api/departments` (returns array directly)

### `/staff/import` — CSV Import
- File selector with drag-target; CSV preview (first 5 rows)
- Template download (generates `email,password,firstName,lastName,phone,jobTitle,department,roles`)
- Result card with success count + error table

### `/staff/[userId]` — Staff Detail
- Profile card: name, job title, email, phone, department
- Performance snapshot (current month) via `/api/performance/summary`
- Sidebar: status, roles badges, created date, last login

### `/staff/[userId]/edit` — Edit Staff
- Same structure as new page; populated from SWR; includes `isActive` toggle (Switch)
- Uses `useRef` + `useEffect` with `initialized` guard to prevent re-population

### `/roles` — Roles List
- Table: name, description, permission count, system/custom badge
- Actions: edit (row link), delete (via `ConfirmDialog`)
- System roles are excluded from the delete dropdown

### `/roles/new` — Create Role
- Name/description fields; permission checkboxes grouped by `group`
- Group-level select-all with indeterminate state via `ref`

### `/roles/[roleId]/edit` — Edit Role
- Pre-populated from `/api/roles/:roleId`; system roles have disabled name input

---

## Audit Findings

### STAFF-01 — Role filter dropdown never populates in staff list — MEDIUM
**File:** `src/app/(dashboard)/staff/page.tsx`  
**Problem:** `roles?.data?.map(...)` — the `/api/roles` endpoint returns the array directly (not wrapped in `{ data: [] }`), so `roles?.data` is always `undefined`. The role filter Select has no `SelectItem` children and cannot be used to filter by role.  
**Fix:** Change `roles?.data?.map(...)` to `roles?.map(...)`.  
**Status:** RESOLVED

---

### STAFF-02 — Import result field names mismatch between API and UI — MEDIUM
**File:** `src/app/(dashboard)/staff/import/page.tsx`  
**Problem:** API returns `{ created, skipped, errors: string[] }` but the page declares `interface ImportResult { success, failed, errors: { row, email, error }[] }`. The success/fail toasts reference `data.success`/`data.failed` (always `undefined`), so they never fire. The error table tries to render `err.row`/`err.email`/`err.error` from plain strings.  
**Fix:** Align `ImportResult` to `{ created, skipped, errors: string[] }` and update toast + error table accordingly.  
**Status:** RESOLVED

---

### STAFF-03 — `PUT /api/roles/:roleId` does not validate permission IDs — LOW
**File:** `src/app/api/roles/[roleId]/route.ts`  
**Problem:** The `POST` handler validates permission IDs via `Permission.countDocuments` before creating a role, but the `PUT` handler assigns `parsed.data.permissions` directly without any existence check. Invalid/non-existent ObjectIds silently create dangling permission references.  
**Fix:** Add the same `countDocuments` guard used in the `POST` handler before saving.  
**Status:** RESOLVED

---

### STAFF-04 — Status filter parameter name/value mismatch — MEDIUM
**File:** `src/app/(dashboard)/staff/page.tsx`  
**Problem:** The page appends `?status=active` or `?status=inactive` but the API reads `url.searchParams.get("isActive")` and compares it to `"true"`/`"false"`. The parameter name differs (`status` vs `isActive`) and the values differ (`active` vs `true`). The filter never has any effect.  
**Fix:** Change the param to `isActive` and map values: `active → "true"`, `inactive → "false"`.  
**Status:** RESOLVED

---

### STAFF-05 — Staff detail page reads `user.lastLogin` but field is `lastLoginAt` — LOW
**File:** `src/app/(dashboard)/staff/[userId]/page.tsx`  
**Problem:** The User model and `IUser` type define `lastLoginAt`; the detail page accesses `user.lastLogin`. The "Last Login" sidebar item never renders.  
**Fix:** Change `user.lastLogin` to `user.lastLoginAt`.  
**Status:** RESOLVED

---

### STAFF-06 — New role page maps permissions using non-existent `key`/`label` fields — HIGH
**File:** `src/app/(dashboard)/roles/new/page.tsx`  
**Problem:** The permission grouping code types each permission as `{ key, label, group, description }` and uses `p.key`/`p.label`. The actual API returns `IPermission` objects with `_id`, `resource`, `action`, `group`, `description` — no `key` or `label` fields. As a result, all permission checkboxes have `undefined` IDs, are never checked, and the submitted `permissions` array is useless. New role creation with any permissions is effectively broken.  
**Fix:** Align the new role page to use the same mapping as the edit page: `key: String(p._id)`, `label: \`${p.resource}:${p.action}\``.  
**Status:** RESOLVED

---

### STAFF-07 — CSV import does not propagate `owner` to created users — MEDIUM
**File:** `src/app/api/users/import/route.ts`  
**Problem:** The regular `POST /api/users` route resolves the creator's `owner` and assigns it to every new user for tenant scoping. The bulk import route creates users without setting `owner`, so bulk-imported users are not associated with the tenant. In a multi-tenant deployment this means they are invisible to tenant queries that filter by `owner`.  
**Fix:** Resolve `ownerId` from `session.user.id` (same logic as the regular create route) and include `owner: ownerId` in each `User.create` call.  
**Status:** RESOLVED
