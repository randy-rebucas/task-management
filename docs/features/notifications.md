# Notifications Feature Documentation

## 1. Overview

The Notifications feature provides real-time and scheduled alerting for important system events. It operates across two dimensions:

- **In-app notifications** — shown in the notification bell in the topbar and on the `/notifications` page.
- **Email notifications** — delivered via SMTP when a matching `NotificationRule` includes the `email` channel.

Notifications are always scoped to the recipient — each user sees only their own notifications. There is no admin read-all-users view.

**Delivery entry points:**
- **Event-driven** — `triggerNotification()` called from task and CRM API routes on user actions.
- **Scheduled (cron)** — `GET /api/cron/notify` runs hourly via Vercel Cron, driving 5 automated jobs.

---

## 2. Data Models

### `Notification`
**File:** `src/models/Notification.ts`

| Field | Type | Description |
|---|---|---|
| `recipient` | `ObjectId → User` | The notified user |
| `type` | `string (enum)` | One of 14 notification type values (see below) |
| `title` | `string` | Short heading displayed in the bell and list |
| `message` | `string` | Full body text |
| `relatedTask` | `ObjectId → Task` (optional) | Used to link task-related notifications |
| `relatedUser` | `ObjectId → User` (optional) | Actor reference (populated but unused in UI) |
| `isRead` | `boolean` | Defaults to `false` |
| `readAt` | `Date` (optional) | Set when `isRead` is toggled to `true` |
| `emailSent` | `boolean` | Whether the email channel was successfully delivered |
| `emailSentAt` | `Date` (optional) | Timestamp of email delivery |
| `createdAt` / `updatedAt` | `Date` | Mongoose timestamps |

**Indexes:**
- `{ recipient, isRead, createdAt: -1 }` — used by the inbox fetch and unread count queries
- `{ recipient, type }` — used by cron dedup queries

**Notification types:**

| Type | Triggered by |
|---|---|
| `task_assigned` | `triggerNotification("task_assigned")` from tasks POST/PUT |
| `task_updated` | `triggerNotification("task_updated")` |
| `status_changed` | `triggerNotification("status_changed")` from task status route |
| `comment_added` | `triggerNotification("comment_added")` from comments route |
| `deadline_approaching` | Cron Job 1 |
| `task_overdue` | Cron Job 2 |
| `lead_stagnation` | Cron Job 3 |
| `field_inactive` | Cron Job 4 |
| `system` | `triggerNotification("follow_up_reminder")` from CRM routes |
| `approval_needed` | Defined — never triggered |
| `approval_resolved` | Defined — never triggered |
| `mention` | Defined — never triggered |

### `NotificationRule`
**File:** `src/models/NotificationRule.ts`

| Field | Type | Description |
|---|---|---|
| `event` | `string` | Slug matching the event name (e.g. `"task-assigned"`, `"task-due-soon"`) |
| `channels` | `["in_app" \| "email"]` | Delivery channels; defaults to `["in_app"]` when empty |
| `recipientStrategy` | `enum` | One of `assignees`, `creator`, `department_head`, `specific_roles` |
| `recipientRoles` | `ObjectId[] → Role[]` (optional) | Used when `recipientStrategy = "specific_roles"` |
| `deadlineThresholdHours` | `number` (optional) | Hours before deadline (for future threshold-based rules) |
| `isActive` | `boolean` | Whether the rule is applied on lookup |

---

## 3. Delivery Layer

### `deliverNotification()`
**File:** `src/features/notifications/deliver.ts`

The single shared function for all notification writes.

```ts
await deliverNotification({
  recipient: userId,
  recipientEmail: user.email,
  type: "task_assigned",
  title: "Task assigned: Fix login bug",
  message: "Jane assigned you to \"Fix login bug\".",
  relatedTask: taskId,       // optional
  channels: ["in_app", "email"],
});
```

**Flow:**
1. If `"in_app"` in channels → create `Notification` document.  
2. If `"email"` in channels → call `sendEmail()`; if an in-app doc was also created, update it with `emailSent: true` and `emailSentAt`.
3. Each channel is wrapped in its own `try/catch` — an email failure does not prevent in-app creation and vice versa.

---

## 4. Event-Driven Notifications (`triggerNotification`)

**File:** `src/features/users/notification-service.ts`

Called from API routes directly after a user action. The function:

1. Resolves the matching `NotificationRule` by event slug (falls back to `["in_app"]` if no rule exists or rule is inactive).
2. Determines recipients based on the event type (hardcoded logic, not `recipientStrategy`).
3. Calls `deliverNotification()` for each unique recipient (excl. the actor themselves).

**Event → Rule slug mapping:**

| Event key | Rule event slug |
|---|---|
| `task_assigned` | `task-assigned` |
| `task_updated` | `task-updated` |
| `status_changed` | `task-status-changed` |
| `comment_added` | `task-commented` |
| `follow_up_reminder` | `follow-up-reminder` |

**Recipient resolution logic (hardcoded):**

| Event | Recipients |
|---|---|
| `task_assigned` | recipients from `payload.additionalRecipients` |
| `status_changed` | assignees + creator |
| `comment_added` | assignees + creator |
| `task_updated` | assignees only |
| `follow_up_reminder` | `lead.assignedTo` or `client.assignedTo` |

**Callers:**

| File | Events triggered |
|---|---|
| `src/app/api/tasks/route.ts` | `task_assigned` |
| `src/app/api/tasks/[taskId]/route.ts` | `task_updated` |
| `src/app/api/tasks/[taskId]/status/route.ts` | `status_changed` |
| `src/app/api/tasks/[taskId]/assign/route.ts` | `task_assigned` |
| `src/app/api/tasks/[taskId]/comments/route.ts` | `comment_added` |
| `src/app/api/crm/leads/[leadId]/route.ts` | `follow_up_reminder` |

---

## 5. Scheduled Notifications (Cron)

**File:** `src/app/api/cron/notify/route.ts`  
**Schedule:** Hourly — `0 * * * *` (via `vercel.json`)  
**Auth:** `Authorization: Bearer <CRON_SECRET>` header required

The cron handler iterates all active tenants sequentially, then runs 5 jobs per tenant using `Promise.allSettled`.

### Job 1 — Deadline Reminders
- Finds tasks due within the next 25 hours that are not completed and have assignees.
- Dedup check: skips if a `deadline_approaching` notification for this (recipient, task) pair was already sent within 20 hours.
- Type: `deadline_approaching` | Rule event: `task-due-soon`

### Job 2 — Overdue Alerts
- Finds all incomplete tasks past their `dueDate` with assignees.
- Dedup check: skips if a `task_overdue` notification for this (recipient, task) pair was already sent today.
- Type: `task_overdue` | Rule event: `task-overdue`

### Job 3 — Lead Stagnation
- Finds active leads (not converted/unqualified) where `followUpDate` is past due OR `updatedAt` is older than 7 days.
- Dedup check: scans recent `lead_stagnation` notification messages for the lead ID (fragile string-based parse).
- Type: `lead_stagnation` | Rule event: `lead-stagnation`

### Job 4 — Field Coordinator Inactive
- Finds all users with a "field" role slug who have no `FieldSession` check-in today, or whose last check-in is older than `FIELD_INACTIVE_HOURS` (env var, default 8).
- Uses aggregation to get the latest session per field user in one query (no N+1).
- Sends a reminder to the field user and an alert to every admin/manager user.
- Dedup check: separate sets for coordinator and admin notifications.
- Type: `field_inactive` | Rule event: `field-inactive`

### Job 5 — Weekly Summary
- Guarded by `AppSetting.weekly_summary_last_sent` — skips if last sent within 6 days.
- Sends a personalised email to every active user with their own stats (completed tasks, overdue, leads assigned).
- Sends a second email to admin/manager users with team-wide stats.
- Does **not** create in-app `Notification` documents — email only.
- Uses aggregation (3 `$group` pipelines) to compute per-user stats efficiently.

---

## 6. Notification Rules Management

Rules are managed in the Settings page (`/settings`) under the "Notification Rules" section.

**API:** `src/app/api/notifications/rules/route.ts`  
**Permission required:** `notifications:manage_rules` (all CRUD operations)

| Method | Action |
|---|---|
| `GET` | List all rules (populated with role names) |
| `POST` | Create new rule (validated via `createNotificationRuleSchema`) |
| `PUT` | Update rule by `id` (body field) |
| `DELETE` | Delete rule by `id` (query param) |

The Settings UI (`src/app/(dashboard)/settings/page.tsx`) allows toggling `isActive` directly via a `PUT` call inline on each rule row, without opening the edit dialog.

---

## 7. Notification Inbox (User-Facing Page)

**Route:** `/notifications`  
**File:** `src/app/(dashboard)/notifications/page.tsx`

**Features:**
- Lists notifications for the current user, newest first.
- Filter by read/unread via `Select` dropdown.
- Pagination (20 per page).
- Per-notification "mark as read" button (single `Check` icon).
- "Mark All Read" button in page header (only shown when there are unread items in the current page).

**Data fetching:** SWR on `GET /api/notifications?page=N&limit=20[&isRead=true|false]`

---

## 8. Notification Bell

**File:** `src/components/notifications/notification-bell.tsx`  
**Used in:** Dashboard topbar (via `src/components/layout/`)

- Polls `GET /api/notifications?unreadCount=true` every **30 seconds**.
- Shows a red badge with the unread count; displays `"99+"` when count exceeds 99.
- Clicking the bell navigates to `/notifications`.

---

## 9. API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | `withAuth` | List notifications (paginated); or unread count when `?unreadCount=true` |
| `PATCH` | `/api/notifications/mark-read` | `withAuth` | Mark one or more notifications as read by `{ ids }` or `{ all: true }` |
| `DELETE` | `/api/notifications` | `withAuth` | Delete notifications by `{ ids }` or `{ all: true }` |
| `GET` | `/api/notifications/rules` | `notifications:manage_rules` | List all notification rules |
| `POST` | `/api/notifications/rules` | `notifications:manage_rules` | Create rule |
| `PUT` | `/api/notifications/rules` | `notifications:manage_rules` | Update rule |
| `DELETE` | `/api/notifications/rules` | `notifications:manage_rules` | Delete rule |
| `GET` | `/api/cron/notify` | `CRON_SECRET` bearer token | Run all 5 scheduled notification jobs |

---

## 10. Permissions

| Permission | Description | Default roles |
|---|---|---|
| `notifications:manage_rules` | Create, edit, toggle, delete notification rules in Settings | Admin |

All users can view their own notifications and mark them read — no permission is required for these actions beyond being authenticated.

---

## 11. UI Pages & Components

| Type | Path | Description |
|---|---|---|
| Page | `src/app/(dashboard)/notifications/page.tsx` | Notification inbox |
| Component | `src/components/notifications/notification-bell.tsx` | Topbar bell with unread badge |
| Settings section | `src/app/(dashboard)/settings/page.tsx` | Notification Rules CRUD UI |

---

## 12. Audit Findings

### 🔴 Critical Issues

#### AUDIT-01 — `markAsRead` sends wrong HTTP method and wrong field name ✅ RESOLVED
**File:** `src/app/(dashboard)/notifications/page.tsx` — `markAsRead()` and `markAllAsRead()`  
**Issue:** Both functions called `fetch(..., { method: "POST", body: JSON.stringify({ notificationIds: [...] }) })`. The API only exports a `PATCH` handler and expects the field `ids`. Every mark-as-read action received a **405 Method Not Allowed** — notifications could never be marked as read.  
**Fix:** Changed `method: "POST"` → `"PATCH"`; renamed body field `notificationIds` → `ids`. `markAllAsRead` simplified to send `{ all: true }` instead of collecting IDs client-side. Both functions now also call `mutateCount()` to update the bell's unread badge immediately.

---

#### AUDIT-02 — Unread filter param name mismatch ✅ RESOLVED
**File:** `src/app/(dashboard)/notifications/page.tsx`  
**Issue:** Page built the filter as `params.set("read", filter)` but the API reads `url.searchParams.get("isRead")`. The filter never took effect.  
**Fix:** Changed `params.set("read", filter)` → `params.set("isRead", filter)`.

---

### 🟡 Medium Issues

#### AUDIT-03 — Page-level `unreadCount` derived from current page, not total inbox ✅ RESOLVED
**File:** `src/app/(dashboard)/notifications/page.tsx`  
**Issue:** `unreadCount` was computed from `data?.data?.filter(n => !n.isRead).length` — only up to 20 items. The page header and "Mark All Read" button reflected only the current page's slice.  
**Fix:** Added a second SWR hook fetching `GET /api/notifications?unreadCount=true` (same endpoint the bell uses). `unreadCount` is now derived from `countData?.unreadCount`, which counts all unread via `countDocuments`. Both `mutate()` and `mutateCount()` are called after any mark-read action so both the page and bell stay in sync.

---

#### AUDIT-04 — `recipientStrategy` field is stored but never used ✅ RESOLVED
**File:** `src/features/users/notification-service.ts`  
**Issue:** `recipientStrategy` was ignored — hardcoded event-based logic always applied.  
**Fix:** `triggerNotification()` now reads `rule?.recipientStrategy` and branches accordingly:
- `"creator"` → notify task creator only
- `"department_head"` → populate `task.department`, then look up `department.head` user
- `"specific_roles"` → query all active users with any of `rule.recipientRoles`
- `"assignees"` / fallback → original per-event hardcoded logic (assignees, assignees+creator, etc.)

---

#### AUDIT-05 — Three notification types defined but never triggered ✅ RESOLVED
**Files:** `src/models/Notification.ts`, `src/types/index.ts`  
**Issue:** `approval_needed`, `approval_resolved`, and `mention` were in the enum but no code creates them.  
**Fix:** Removed all three types from `NOTIFICATION_TYPES` in the Mongoose schema and from the `INotification` type union. The schema enum now contains only the 9 types that are actively used.

---

#### AUDIT-06 — `link` field rendered in UI but missing from schema and type ✅ RESOLVED
**Files:** `src/models/Notification.ts`, `src/types/index.ts`, `src/features/notifications/deliver.ts`, `src/features/users/notification-service.ts`  
**Issue:** The notifications page rendered `notification.link && <Link>` but `link` was undefined because it was absent from the schema, type, and creation logic.  
**Fix:**
- Added `link: { type: String }` to `NotificationSchema`.
- Added `link?: string` to `INotification`.
- Added optional `link` param to `deliverNotification()`.
- `triggerNotification()` now passes `link: \`/tasks/${taskId}\`` for all task-based events, so "View details" renders and navigates correctly.

---

### 🟢 Low / Informational

#### AUDIT-07 — Cron iterates tenants sequentially, risking timeout ✅ RESOLVED
**File:** `src/app/api/cron/notify/route.ts`  
**Issue:** Sequential `for (const tenant of tenants)` with `await` could time out on Vercel (60s limit) with many tenants.  
**Fix:** Replaced the loop with `await Promise.allSettled(tenants.map(async (tenant) => { ... }))`. All tenants are now processed in parallel. Errors for any individual tenant are caught and recorded per-tenant without affecting others.

---

#### AUDIT-08 — Lead stagnation dedup relies on fragile message parsing ✅ RESOLVED
**Files:** `src/app/api/cron/notify/route.ts`, `src/models/Notification.ts`, `src/types/index.ts`, `src/features/notifications/deliver.ts`  
**Issue:** Dedup used a regex `n.message?.match(/ID: ([a-f0-9]{24})/)` to extract the lead/coordinator ID from notification messages. If the message template changed, all dedup silently broke.  
**Fix:**
- Added `relatedResource: { type: Schema.Types.ObjectId }` to `NotificationSchema` and `relatedResource?: Types.ObjectId` to `INotification`.
- `deliverNotification()` now accepts and persists an optional `relatedResource` string.
- Lead stagnation job passes `relatedResource: lead._id.toString()` and deduplicates with `{ relatedResource: { $in: leadIds } }`.
- Field inactive job passes `relatedResource: coordinator._id.toString()` for admin notifications and deduplicates with `{ relatedResource: { $in: fieldUserIds } }`.
- Removed the ID-embedded message text (`(ID: ...)`) from both job messages.

---

#### AUDIT-09 — No notification deletion endpoint ✅ RESOLVED
**File:** `src/app/api/notifications/route.ts`  
**Issue:** No way to delete notifications; they accumulate indefinitely.  
**Fix:** Added `export const DELETE = withAuth(...)` to the notifications route. Accepts `{ ids }` to delete specific notifications or `{ all: true }` to clear the entire inbox for the current user. All deletes are scoped to `{ recipient: session.user.id }` to prevent cross-user deletion.

---

### Summary

| Severity | Count | Status |
|---|:---:|---|
| 🔴 Critical | 2 | ✅ All resolved |
| 🟡 Medium | 4 | ✅ All resolved |
| 🟢 Low / Informational | 3 | ✅ All resolved |
| **Total** | **9** | **✅ All 9 fixed** |
