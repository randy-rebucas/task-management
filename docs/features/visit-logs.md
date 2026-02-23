# Visit Logs

## Overview
The Visit Logs module lets field workers record and submit structured reports of client/site visits — capturing places visited, people met, purpose, outcome, next actions, and optional photographic evidence. Managers and admins can view, search, and delete all entries via a paginated table.

---

## File Inventory

| Path | Purpose |
|------|---------|
| `src/models/VisitLog.ts` | Mongoose schema |
| `src/types/index.ts` (L24) | `IVisitLog` TypeScript interface |
| `src/features/auth/validators.ts` (L4) | `createVisitLogSchema` Zod schema |
| `src/app/api/visit-logs/route.ts` | `GET` list + `POST` create (multipart or JSON) |
| `src/app/api/visit-logs/[visitId]/route.ts` | `GET` single + `DELETE` |
| `src/app/(dashboard)/visit-logs/page.tsx` | List page (server component) |
| `src/app/(dashboard)/visit-logs/new/page.tsx` | New log page |
| `src/app/(dashboard)/visit-logs/[visitId]/page.tsx` | Detail page (client component) |
| `src/components/visit-logs/visit-log-form.tsx` | Submit form (multipart) |
| `src/components/visit-logs/visit-log-table.tsx` | Paginated, searchable table |
| ~~`src/components/visit-logs/visit-log-list.tsx`~~ | ~~Dead code — removed~~ |
| `src/config/nav.ts` (L58) | Nav entry: `visit_logs:view` |
| `src/config/permissions.ts` (L46–49) | `visit_logs:{create,view,view_all,delete}` |

---

## Data Model

```ts
// src/models/VisitLog.ts
{
  user:          ObjectId → User   // required; auto-set from session
  placesVisited: string            // required
  peopleMet:     string            // required
  purpose:       string            // required
  outcome:       string            // required
  nextAction:    string            // required
  photos:        string[]          // array of URL paths; optional
}
// timestamps: createdAt, updatedAt
```

No custom indexes — queries filter on `user` and sort by `createdAt`.

---

## Zod Validation

```ts
// createVisitLogSchema
{
  placesVisited: z.string().min(1)
  peopleMet:     z.string().min(1)
  purpose:       z.string().min(1)
  outcome:       z.string().min(1)
  nextAction:    z.string().min(1)
  photos:        z.array(z.string()).optional()
}
```

---

## API Routes

### `POST /api/visit-logs`
- **Auth:** `withPermission("visit_logs:create")`
- **Content-Type:** `multipart/form-data` (primary) or `application/json` (fallback)
- **Photo upload:** Each file validated against allowlist (`image/jpeg`, `image/png`, `image/gif`, `image/webp`), saved to `public/uploads/visit-logs/<uuid>.<ext>`; saved URLs injected into the Zod parse
- **Response:** Created document (201 implicit via `apiSuccess`)

### `GET /api/visit-logs`
- **Auth:** `withPermission("visit_logs:view")`
- **Scope:** `visit_logs:view_all` → can filter by `userId`; otherwise own only
- **Query:** `search` (regex on `placesVisited`, `peopleMet`, `purpose`), `userId`, pagination
- **Response:** `{ data, total, page, limit, totalPages }` — populates `user.firstName/lastName`

### `GET /api/visit-logs/:visitId`
- **Auth:** `withPermission("visit_logs:view")`
- **Scope:** Non-admins: own logs only (user filter added to query)
- **Response:** `{ data: visitLog }`

### `DELETE /api/visit-logs/:visitId`
- **Auth:** `withPermission("visit_logs:delete")`
- **No ownership filter** — intentional; delete is an admin/manager action

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

### `/visit-logs` — List
- Server component: renders `<VisitLogTable>` + "New Visit Log" link button
- Table: search input, date, places, people, purpose, outcome, next action, photo thumbnails; row click → detail page
- Paginated (20/page); admin staff-filter dropdown (VLOG-05 fix)

### `/visit-logs/new` — Create
- Renders `<VisitLogForm>` in a card
- Form submits as `multipart/form-data`; redirects to list on success

### `/visit-logs/:visitId` — Detail
- Client component; uses SWR to fetch `/api/visit-logs/:visitId`
- Shows all fields + full-size photo grid

---

## Audit Findings

### VLOG-01 — Photo files leaked on validation error — HIGH
**File:** `src/app/api/visit-logs/route.ts`  
**Problem:** Files are written to disk in a loop before validation. If any later file has an invalid MIME type the function returns an error without deleting files saved earlier. Similarly, if Zod validation fails after all files are saved, none of the uploaded files are cleaned up.  
**Fix:** After every early-return error path that follows at least one successful file write, delete all already-saved files using `fs.unlink`. A `cleanup` helper is extracted and called before each error return.  
**Status:** RESOLVED

---

### VLOG-02 — `VisitLogForm` swallows the actual API error — MEDIUM
**File:** `src/components/visit-logs/visit-log-form.tsx`  
**Problem:** `if (!res.ok) throw new Error("Failed to submit visit log")` hard-codes the error message and never reads the response body, so specific errors (e.g. "Invalid file type") are invisible to the user.  
**Fix:** Read `await res.json()` when `!res.ok` and use `data.error` as the thrown message.  
**Status:** RESOLVED

---

### VLOG-03 — Detail page uses synchronous `params` (Next.js 15 async params) — MEDIUM
**File:** `src/app/(dashboard)/visit-logs/[visitId]/page.tsx`  
**Problem:** Next.js 15 passes route params as a `Promise`. The page types `params` as `{ visitId: string }` and reads it synchronously, which generates a deprecation warning and will break in future Next.js releases.  
**Fix:** Type `params` as `Promise<{ visitId: string }>` and unwrap with `React.use(params)`.  
**Status:** RESOLVED

---

### VLOG-04 — GET list does not populate `user`; admins see raw ObjectId for submitter — MEDIUM
**File:** `src/app/api/visit-logs/route.ts`  
**Problem:** `models.VisitLog.find(filter)...lean()` returns the raw `user` ObjectId. Admins with `visit_logs:view_all` who filter or browse all logs have no way to see who submitted each entry.  
**Fix:** Add `.populate("user", "firstName lastName")` to the list query.  
**Status:** RESOLVED

---

### VLOG-05 — `VisitLogTable` has no admin staff filter or "Submitted By" column — MEDIUM
**File:** `src/components/visit-logs/visit-log-table.tsx`  
**Problem:** The API accepts a `userId` query param for `view_all` admins, but the table never sends it and has no "Submitted By" column, making the `view_all` permission functionally incomplete for managers reviewing the team's logs.  
**Fix:** Import `usePermissions` + SWR users list; add staff `<select>` filter and a "Submitted By" column shown only when `can("visit_logs:view_all")` is true.  
**Status:** RESOLVED

---

### VLOG-06 — `VisitLogList` component is dead code — LOW
**File:** `src/components/visit-logs/visit-log-list.tsx`  
**Problem:** The component is exported but never imported or rendered anywhere — the list page uses `VisitLogTable` instead.  
**Fix:** Delete the file.  
**Status:** RESOLVED
