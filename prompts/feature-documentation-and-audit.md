# Prompt: Feature Documentation & Audit

> **Purpose:** Reusable prompt template for fully documenting, auditing, and remediating any feature module in this codebase.  
> **Stack context:** Next.js 15 App Router · MongoDB/Mongoose · Zod · SWR · RBAC via `withPermission`

---

## Step 1 — Generate Full Feature Documentation

```
Explore the codebase and create a full documentation file at docs/features/{feature}.md
for the "{feature}" module.

Cover every section below — do not skip any:

1. Overview
   - Purpose and design decisions (soft-delete strategy, visibility scoping, etc.)

2. Data Models
   - All Mongoose models involved: every field, its type, constraints, and index

3. CRUD Operations
   - For each operation: required permission, route, validation rules, side effects
     (notifications, activity logs, auto-created records)

4. API Reference
   - Table: Method | Route | Permission | Description
   - Include ALL endpoints — list, create, read, update, delete, and sub-resource routes

5. Filters & Query Parameters
   - Every supported query param for list endpoints with type and description
   - Note which params exist in the API but are not yet surfaced in the UI

6. Roles & Permissions
   - Permission definitions table
   - Role → Permission matrix (all roles, all permissions, ✅/❌)
   - Special authorization rules (role-gating on transitions, visibility scoping, etc.)

7. Feature-specific types / enums
   - E.g. task types, status slugs, attachment types — with labels and any constraints

8. Workflow & State Transitions (if applicable)
   - Transition validation chain step by step
   - Side effects on each successful transition

9–N. Sub-features
   - Dedicated section for each sub-resource (subtasks, dependencies, time logs,
     attachments, comments, CRM links, recurring config, etc.)
   - Per sub-feature: schema, operations table, constraints, known limitations

N+1. Notifications & Activity Logging
   - Table of every action key logged and every notification event triggered

N+2. Automation
   - Any cron jobs, background services, or auto-created records

N+3. UI Pages & Components
   - Pages table: Route | File | Description
   - Components table: Component | File | Description
   - Detail page feature list

N+4. Validation Schemas
   - Table of every Zod schema and which API route(s) consume it

N+5. Audit Findings
   - Format defined in Step 2 below
```

---

## Step 2 — Audit the Feature

```
Audit the "{feature}" feature end-to-end. Read every source file — not just the
primary route. Check all callers, UI pages, components, types, and cron routes.

For each finding produce an entry with:

  #### AUDIT-{N} — {short title}
  **File:** path(s)
  **Issue:** precise description of the problem and why it matters
  **Recommendation:** concrete fix

Group findings by severity:
  🔴 Critical   — broken functionality, data integrity, race conditions,
                  security holes, serverless incompatibilities
  🟡 Medium     — missing permissions, missing endpoints, logic gaps,
                  unused/dead model fields, performance risks
  🟢 Low        — UI gaps, misleading errors, minor inconsistencies,
                  fragile dedup or parsing patterns

End with a summary table: Severity | Count | Issues

─── CLIENT ↔ SERVER CONTRACT (always check) ─────────────────────────────────
These are the most common source of silent broken features:

• HTTP method match — does the client fetch() method (GET/POST/PUT/PATCH/DELETE)
  match the exported handler name in the API route?
• Body field names — do the JSON keys sent by the client match what the API
  reads from req.json()? (e.g. client sends { notificationIds } but API reads ids)
• Query param names — do params appended by the client (params.set("read", v))
  match what the API reads (url.searchParams.get("isRead"))? A mismatch means
  the filter/sort simply never applies.
• Populated fields — does the UI render a field that is only available after
  .populate() in the API? Verify it is actually included in the projection.
• Response shape — does the UI read data.data, data.items, or data directly?
  Check the actual apiSuccess() payload shape vs what the UI destructures.

─── DATA MODEL INTEGRITY (always check) ─────────────────────────────────────
• Dead enum values — are there type/status values in the Mongoose enum and
  TypeScript type that no code path ever creates? Remove them.
• Schema vs type sync — does every field in the Mongoose schema have a matching
  field in the TypeScript interface (IModel), and vice versa?
• Missing schema fields — are fields rendered in the UI or passed to utility
  functions (e.g. link, relatedResource) absent from the schema and type?
• Unused model fields — fields stored in the DB that nothing reads or writes.
• Missing indexes — high-frequency query patterns (recipient + isRead,
  type + createdAt) that lack a compound index.

─── API COMPLETENESS (always check) ─────────────────────────────────────────
• Is there a DELETE endpoint for any collection users interact with?
  Without it, stale records accumulate indefinitely.
• Are all filter/sort params the UI supports also accepted by the API?
  Client-only filtering fetches all data and wastes bandwidth.
• Are there endpoints that require a permission the settings/admin UI surfaces,
  but the permission is never actually checked?

─── PERMISSIONS & RBAC (always check) ───────────────────────────────────────
• Is every destructive/mutating client-side action (drag, bulk operation,
  inline toggle) guarded by a client-side can("feature:action") check?
  Silent 403s from the server after an optimistic update are confusing.
• Are optimistic updates reverted on API error? Is there a toast/alert?
• Do all bulk operations show a confirmation dialog before firing?

─── CRON & BACKGROUND JOBS (always check) ───────────────────────────────────
• Does any cron handler iterate tenants/records sequentially with await inside
  a for-loop? This risks Vercel's 60 s timeout with many tenants. Use
  Promise.allSettled(items.map(...)) for parallel execution.
• Does dedup logic parse IDs or structured data from unstructured message
  strings (regex on message text)? If so, use a dedicated schema field instead.
• Is the cron endpoint listed in vercel.json?

─── UI CORRECTNESS (always check) ───────────────────────────────────────────
• Do counts shown in the UI (unread count, page header totals) come from the
  real server total, or from the current page slice (≤ limit items)?
• Are links rendered in the UI (e.g. "View details") based on fields that
  actually exist in the schema and are populated in the API response?
• Do pagination controls read from data.totalPages (server) or derive it
  client-side from a partial dataset?
• Is any UI filter/sort state wired to the SWR key so that changing it
  re-fetches from the server rather than filtering a stale client array?
```

---

## Step 3 — Fix All Audit Findings

```
Fix every audit finding identified in docs/features/{feature}.md.

For each finding, implement the actual code change — do not just describe it.
Follow existing patterns in the codebase:
  - API routes: withAuth / withPermission, Zod safeParse, logActivity,
    triggerNotification
  - New utility files: src/lib/{name}.ts, named exports
  - New shared types: src/types/{feature}.ts
  - New components: src/components/{feature}/, self-contained state
  - New cron routes: src/app/api/cron/{name}/route.ts + entry in vercel.json
  - Schema/type additions: update BOTH the Mongoose schema AND the
    TypeScript interface in src/types/index.ts

Checklist before marking a finding resolved:
  □ The root cause (not just a symptom) is addressed in source code.
  □ All callers of the changed function/schema are updated to match.
  □ No new TypeScript errors introduced — run get_errors on every touched file.
  □ No dead code left behind (old field names, duplicate declarations, etc.).

After all fixes:
  - Update the audit section in docs/features/{feature}.md:
    • Mark each finding ✅ RESOLVED (or ✅ NOT AN ISSUE for false positives).
    • Replace "Recommendation" with a "Fix:" paragraph describing what was done.
    • Update the summary table status column.
  - Update every other section whose prose described the old/broken state:
    • API reference table (methods, new endpoints)
    • Filter/query param section (server-side vs client-side note)
    • Notifications section (new fields, changed messages)
    • UI pages section (new behaviour, new SWR hooks)
    • Overview design decisions (if a pattern changed)
```

---

## Full One-Shot Prompt (all steps combined — copy and paste this)

```
For the "{feature}" module in this Next.js / MongoDB / Zod codebase:

1. Explore all relevant source files: Mongoose models, TypeScript types in
   src/types/index.ts, API routes, UI pages, components, Zod validators,
   cron routes, and any service/utility files.

2. Create docs/features/{feature}.md with complete documentation covering:
   data models (every field, type, index), all CRUD operations (permission,
   route, validation, side effects), full API reference table, every
   filter/query param (note which are client-only vs server-side), role-
   permission matrix, sub-features, notifications, automation/cron jobs,
   UI pages & components, and Zod validation schemas.

3. Audit the feature. Add an "Audit Findings" section grouped by severity
   (🔴 Critical / 🟡 Medium / 🟢 Low). Each finding must state the file,
   the exact issue, and a concrete recommendation.

   Mandatory audit checklist — verify all of these:
   CLIENT ↔ SERVER CONTRACT
   □ HTTP method in client fetch() matches exported handler (GET/POST/PATCH/DELETE)
   □ JSON body field names sent by client match what the API reads from req.json()
   □ Query param names set by the client match what the API reads with searchParams.get()
   □ Populated fields actually included in the API .populate() projection
   □ UI reads the correct response shape from apiSuccess() payload

   DATA MODEL INTEGRITY
   □ No dead enum values (defined in schema/type but never created by any code path)
   □ Every schema field present in the TypeScript interface, and vice versa
   □ No fields rendered in the UI or passed to utilities that are absent from the schema
   □ No high-frequency query patterns missing a compound index

   API COMPLETENESS
   □ DELETE endpoint exists for any user-facing collection (or TTL index in place)
   □ All filters the UI supports are also passed as API query params (not client-only)
   □ All permissioned operations actually call withPermission (no unguarded routes)

   PERMISSIONS & RBAC
   □ Destructive client-side actions (drag, bulk ops, inline toggle) gated by can()
   □ Optimistic updates reverted on API error with toast feedback
   □ Bulk/destructive operations have confirmation dialogs

   CRON & BACKGROUND JOBS
   □ No sequential await inside a for-of tenant/record loop (use Promise.allSettled)
   □ No dedup logic that parses IDs from message strings (use a schema field instead)
   □ All cron endpoints registered in vercel.json

   UI CORRECTNESS
   □ Counts/totals derived from the real server total, not the current page slice
   □ "View details" / navigation links backed by fields that exist in the schema
   □ Filter/sort state changes trigger a server re-fetch (different SWR key)

4. Fix every finding in the actual source files — do not just describe the fix.
   Update BOTH the Mongoose schema AND the TypeScript type for any schema change.
   Run get_errors on every touched file; all must return zero errors.

5. Update docs/features/{feature}.md so it accurately reflects the fixed state:
   - Mark each finding ✅ RESOLVED with a "Fix:" description.
   - Correct all prose, table entries, and bullet points that described old behaviour.
   - Update the summary table.
```

---

## Conventions to Follow in This Codebase

| Concern | Pattern |
|---|---|
| API auth | `withAuth(handler)` or `withPermission("feature:action", handler)` |
| Validation | Zod schema in `src/features/auth/validators.ts`, `.safeParse()` at route entry |
| Error response | `apiError("message", statusCode)` |
| Success response | `apiSuccess(data, statusCode?)` |
| Activity log | `logActivity({ actor, action, resource, resourceId, details, req })` |
| Notification | `triggerNotification("event_key", { ...payload }, models)` |
| Tenant models | `getTenantModels(conn)` → `TenantModels` |
| Tenant permissions | `getTenantPermissions(session.user.roles, models)` + `checkPermission(perms, "x:y")` |
| Atomic counter | `getNextTaskNumber(models)` from `src/lib/task-counter.ts` |
| File storage | `uploadFile(scope, fileName, buffer)` / `deleteFile(fileUrl)` from `src/lib/storage.ts` |
| Cron auth | `Authorization: Bearer {CRON_SECRET}` header check |
| Client data fetch | `useSWR(url, fetcher)` — `fetcher = (url) => fetch(url).then(r => r.json())` |
| Debounced input | `useDebounce(value, 300)` from `@/features/auth/use-debounce` |
| Permission check (client) | `const { can } = usePermissions(); if (can("feature:action")) { ... }` |
| New utility | `src/lib/{name}.ts` |
| New feature component | `src/components/{feature}/{component-name}.tsx` |
| New cron route | `src/app/api/cron/{name}/route.ts` + entry in `vercel.json` |

---

## Document Template Header

```markdown
# {Feature Name} Feature — Full Documentation & Audit

> **Module:** `{feature}`  
> **Last audited:** {YYYY-MM-DD}  
> **Stack:** Next.js 15 App Router · MongoDB/Mongoose · Zod validation · SWR  
```

---

## Example Outputs

| Feature | Doc | Findings |
|---|---|---|
| Tasks | [`docs/features/tasks.md`](../features/tasks.md) | 14 findings — 13 fixed, 1 N/A. Race conditions, missing permissions, circular dependency detection, recurring task automation, god-component refactor, missing UI filters. |
| Calendar | [`docs/features/calendar.md`](../features/calendar.md) | 9 findings — all ✅ resolved. Error handling on drag-and-drop, AlertDialog for bulk reschedule, permission gate on drag/overdue, limit 500 + overflow banner, server-side filtering, shared types in `src/types/calendar.ts`, overflow cap on week view, tasks-without-duedate note, new task page reads searchParams. |
| Notifications | [`docs/features/notifications.md`](../features/notifications.md) | 9 findings — all ✅ resolved. Wrong HTTP method/field on mark-read, filter param mismatch, real unread count from API, recipientStrategy now implemented (creator/dept_head/specific_roles), removed 3 dead types, `link`+`relatedResource` fields added to schema, parallel cron tenant processing, relatedResource-based dedup, DELETE endpoint added. |
| Workflow | [`docs/features/workflow.md`](../features/workflow.md) | 9 findings — 8 ✅ resolved, 1 low priority pending. All edit/delete ops were 404 (wrong URLs fixed), status POST always failed Zod (slug auto-derived, isClosed→isFinal+isDefault), `name` field added to WorkflowTransition model/type/validator, GET transitions opened to `withAuth`, requiresRemarks+requiresApproval added to transition dialog, isDefault toggle added to status form, badge labels corrected to Final/Active. |
| Proof of Work | [`docs/features/proof-of-work.md`](../features/proof-of-work.md) | 8 findings — all ✅ resolved. Submitters couldn't see own submissions (GET required wrong permission), every main-page submission failed Zod (empty taskId — task selector added to modal), handleVerify+handleSaveLocation silently swallowed errors (res.ok checks + toasts added), location delete had no confirmation (inline confirm dialog added), signature stored as base64 in MongoDB (now uploaded to /api/field/photos), tabs not permission-gated (usePermissions added), haversineMetres deduplicated to src/lib/geo.ts. |
| Field Monitoring | [`docs/features/field-monitoring.md`](../features/field-monitoring.md) | 7 findings — all ✅ resolved. Leaflet CSS loaded from CDN (replaced with npm import), RouteMap useEffect had empty deps array (map never re-drew on prop change), PATCH cast doc as any (typed HydratedDocument<IFieldSession>), coverage days param unguarded for NaN, CheckInPanel elapsed time stale (live setInterval clock added), avg-duration card double-filtered same array, mapRef typed any in both map components. |
| Visit Logs | [`docs/features/visit-logs.md`](../features/visit-logs.md) | 6 findings — all ✅ resolved. Photo files leaked on validation failure (cleanupFiles helper added), VisitLogForm swallowed API error body (reads res.json() now), detail page used sync params (React.use() for Next.js 15), GET list missing user populate for view_all admins, VisitLogTable had no staff filter or Submitted By column, VisitLogList was dead code (deleted). |
| CRM | [`docs/features/crm.md`](../features/crm.md) | 6 findings — all ✅ resolved. GET list handlers missing .lean() (leads/clients/deals), confirm() used for all destructive deletes across 5 pages (replaced with AlertDialog), stageFilter dead state in PipelinePage (removed), interaction POST had no parent existence check (Lead.exists/Client.exists guards added), attachment POST same issue (fixed), win rate denominator used all deals instead of closed_won+closed_lost (formula corrected). |
| Staff & Roles | [`docs/features/staff.md`](../features/staff.md) | 7 findings — all ✅ resolved. Role filter dropdown never showed options (roles?.data?.map → roles?.map), import result fields mismatched API (success/failed vs created/skipped, errors as strings not objects), PUT roles didn't validate permission IDs (Permission.countDocuments guard added), status filter param mismatch (status=active vs isActive=true), lastLogin vs lastLoginAt in detail page, new role page used non-existent permission fields (p.key/p.label → p._id/resource:action), import didn't propagate owner field. |
| Settings | [`docs/features/settings.md`](../features/settings.md) | 2 findings — all ✅ resolved. Inline notification rules panel in settings/page was completely broken (wrong interface name/channel/enabled/recipients vs model's channels[]/recipientStrategy/isActive; create→Zod fail, edit/delete/toggle→404; wrong permission check) — removed duplicate and replaced with link card to dedicated /settings/notification-rules page. billing/page used window.confirm() for cancel — replaced with ConfirmDialog. |
| Reports | [`docs/features/reports.md`](../features/reports.md) | 4 findings — all ✅ resolved. task-summary API ignored ?days param and returned tasksByStatus/tasksByPriority with no count summaries — rewrote to parse days, return byStatus/byPriority/totalTasks/completedTasks/inProgressTasks/overdueTasks. staff-workload API returned flat array with concatenated name/completedTasks/overdueTasks/totalHoursLogged — rewrote to return {staff,avgTasks,totalHours} envelope with firstName/lastName/completed/overdue/inProgress/hoursLogged. overdue API missing urgentHighCount+avgDaysOverdue — added both via countDocuments+aggregate. All 3 sub-page export buttons used GET /api/reports/export?type=... but route only has POST — fixed to use POST with {format:"csv"} body. |
| Performance | [`docs/features/performance.md`](../features/performance.md) | 3 findings — all ✅ resolved. visitCount hardcoded to 0 in computeForPeriod and all 6 trend iterations — visitScore always 0, max score capped at 70 — added FieldSession.countDocuments to Promise.all and threaded visitCount through calcScore. tasksAssigned had no date filter (all-time) while tasksCompleted was period-scoped — completion rate/score always deflated — added createdAt start..end filter. Monthly trend used serial for loop with 6 sequential awaits — converted to Promise.all(months.map(...)) for parallel execution. |
| Analytics | [`docs/features/analytics.md`](../features/analytics.md) | 3 findings — all ✅ resolved. coordinator-efficiency FieldSession aggregate filtered on "checkIn.time" (unindexed) instead of the indexed "date" field — caused full collection scan on every call — changed $match to use date field. Missing compound index on CrmInteraction for visit-to-close query ({ lead: $in, type: visit } — added { lead: 1, type: 1 }). Missing compound index on Task for coordinator-efficiency ({ assignees: $in, completedAt: $gte } — added { assignees: 1, completedAt: 1 }). |
| KPI Dashboard | [`docs/features/kpi.md`](../features/kpi.md) | 3 findings — all ✅ resolved. All three KPI routes (my, leaderboard, team) used an all-time tasksAssigned count with no period date filter while tasksCompleted was period-scoped — completionScore (40/100 weight) was always deflated by historical tasks. Fixed: kpi/my countDocuments added createdAt start..end filter; leaderboard and team aggregation $group replaced totalAssigned/$sum:1 with a $cond sum gated on createdAt within period. |
| Field Hub | [`docs/features/field-hub.md`](../features/field-hub.md) | 1 finding — all ✅ resolved. Field Hub page fetched /api/tasks/my?limit=5 and computed "Due today" and "Overdue" stat card counts from that same 5-task slice — users with >5 overdue/due-today tasks saw wrong counts. Fixed: changed fetch to limit=100, renamed to allTasks, sliced .slice(0,5) for list display, updated both filter predicates to use allTasks. |
| Departments | [`docs/features/departments.md`](../features/departments.md) | 2 findings — all ✅ resolved. GET /api/departments had no isActive filter — soft-deleted departments kept appearing in list + every department dropdown across the app — added { isActive: true } to find(). Delete confirmation text claimed staff would be unassigned but DELETE only sets isActive:false and never touches User records — corrected confirmation text. |
| Activity Log | [`docs/features/activity-log.md`](../features/activity-log.md) | 3 findings — all ✅ resolved. Entity dropdown sent ?entity= but API only read ?resource= — entity filter silently ignored (added entity as alias in API). All log row display fields blank — page rendered log.user/log.entity/log.description but API returns log.actor/log.resource/log.details (fixed field references + inline TS type). Search input had no effect — API had no search handler (added $or regex on action+resource). |
| Dashboard | — | 4 findings — all ✅ resolved. My Tasks page sent ?search= but /api/tasks/my had no search handler — search input completely non-functional (added $or regex on title/taskNumber/description). All three dashboard routes (admin/manager/staff) counted overdue tasks with dueDate<now but no completedAt filter — completed tasks kept inflating the overdue stat card (added completedAt:null to all three countDocuments queries). Staff dashboard tasksByStatus aggregate used session.user.id (string) in $match $in — Mongoose does not auto-cast in aggregation pipelines so taskStatusBreakdown was always [] (added mongoose ObjectId conversion via new mongoose.Types.ObjectId). Manager route fetched User.findById sequentially before Promise.all (extra round-trip) — moved into first parallel block alongside WorkflowStatus.find. |
