# Settings Feature — Full Documentation & Audit

> **Module:** `settings`
> **Last audited:** 2026-02-23
> **Stack:** Next.js 15 App Router · MongoDB/Mongoose · Zod validation · SWR

---

## 1. Overview

The Settings module is split into several sub-sections, each accessible from the sidebar under **Settings**:

| Sub-section | Route | Who can access |
|---|---|---|
| General | `/settings` | Users with `settings:manage` |
| Profile | `/settings/profile` | All authenticated users |
| Notification Rules | `/settings/notification-rules` | Users with `notifications:manage_rules` |
| Subscription | `/settings/subscription` | Users with `subscriptions:manage` |
| Billing | `/settings/billing` | Users with `settings:manage` |
| Subscribe (plans) | `/settings/subscribe` | All authenticated users |
| Subscribe checkout | `/settings/subscribe/[plan]` | All authenticated users |

Settings are stored in two separate databases:
- **Tenant settings:** `AppSetting` collection — key/value store per tenant workspace (general config, automation flags).
- **Platform settings:** `PlatformSetting` collection (platform DB) — subscription plan pricing, feature flags. Managed via admin panel.

---

## 2. Data Models

### `AppSetting` — `src/models/AppSetting.ts`

Key/value store scoped to each tenant's database.

| Field | Type | Constraints |
|---|---|---|
| `key` | String | required, unique |
| `value` | Mixed | required |

**Known keys used by the app:**

| Key | Type | Default | Description |
|---|---|---|---|
| `theme` | `"light" \| "dark" \| "system"` | `"light"` | UI theme preference |
| `paginationLimit` | number | `20` | Default page size |
| `fileUploadMaxSize` | number | `10485760` | Max upload size in bytes (10 MB) |
| `automation.followUpTask` | boolean | `true` | Auto-create follow-up task after meeting |
| `automation.escalation` | boolean | `true` | Auto-escalate overdue tasks |
| `automation.escalationDays` | number | `3` | Days overdue before escalation |
| `automation.performanceReport` | boolean | `true` | Weekly performance email to admins |
| `automation.fieldSummary` | boolean | `true` | Daily AI field summary generation |

### `NotificationRule` — `src/models/NotificationRule.ts`

Configures automated notification delivery.

| Field | Type | Constraints |
|---|---|---|
| `event` | String | required — event key (e.g. `task.assigned`) |
| `channels` | `["in_app" \| "email"]` | enum array |
| `recipientStrategy` | String | required; enum: `assignees`, `creator`, `department_head`, `specific_roles` |
| `recipientRoles[]` | ObjectId → Role | optional — used when `recipientStrategy = specific_roles` |
| `deadlineThresholdHours` | Number | optional — used for deadline-approaching events |
| `isActive` | Boolean | default `true` |
| `createdAt` / `updatedAt` | Date | auto |

### `Subscription` — `src/models/Subscription.ts`

Tracks PayPal subscription records per tenant.

| Field | Type | Constraints |
|---|---|---|
| `user?` | ObjectId → User | index; optional (linked after login on redirect) |
| `email` | String | required, lowercase, index |
| `paypalSubscriptionId` | String | required, unique |
| `paypalPlanId` | String | required |
| `plan` | SubscriptionPlan | enum: `starter`, `growth`, `business`, `enterprise` |
| `status` | SubscriptionStatus | enum below, default `APPROVAL_PENDING` |
| `startTime?` | Date | |
| `nextBillingTime?` | Date | |
| `trialEndTime?` | Date | |
| `amount` | Number | required |
| `currency` | String | default `"USD"` |
| `cancelledAt?` | Date | |
| `createdAt` / `updatedAt` | Date | auto |

**SubscriptionStatus enum:** `APPROVAL_PENDING`, `APPROVED`, `ACTIVE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`

**SubscriptionPlan enum:** `starter`, `growth`, `business`, `enterprise`

---

## 3. API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/settings/general` | `withAuth` | Fetch general settings (`theme`, `paginationLimit`, `fileUploadMaxSize`) |
| PUT | `/api/settings/general` | `withPermission("settings:manage")` | Update any of the three general settings keys |
| GET | `/api/settings/automation` | `withPermission("settings:manage")` | Fetch all 5 automation flags |
| PUT | `/api/settings/automation` | `withPermission("settings:manage")` | Update any/all automation flags |
| GET | `/api/notifications/rules` | `withPermission("notifications:manage_rules")` | List all notification rules (populated `recipientRoles`) |
| POST | `/api/notifications/rules` | `withPermission("notifications:manage_rules")` | Create notification rule |
| PUT | `/api/notifications/rules` | `withPermission("notifications:manage_rules")` | Update rule — id in request body |
| DELETE | `/api/notifications/rules?id=` | `withPermission("notifications:manage_rules")` | Delete rule by query param |
| GET | `/api/subscriptions/status` | `withAuth` | Current subscription status for tenant; `{ subscription, isOwner }` |
| POST | `/api/subscriptions/activate` | public (session optional) | Activate/upsert subscription after PayPal redirect |
| POST | `/api/subscriptions/cancel` | `withPermission("subscriptions:manage")` | Cancel active subscription via PayPal API |
| GET | `/api/platform/settings` | `x-super-admin-secret` header | List all platform settings; seeds defaults if missing |
| PATCH | `/api/platform/settings` | `x-super-admin-secret` header | Update one `{ key, value }` platform setting |

### `/api/settings/general` notes
- GET returns raw object: `{ theme, paginationLimit, fileUploadMaxSize }` with defaults injected if keys are missing in DB.
- PUT uses `findOneAndUpdate` with `upsert: true` for each key present in the body.
- Returns raw `NextResponse.json(settings)` (not wrapped in `apiSuccess`).

### `/api/settings/automation` notes
- GET returns raw `NextResponse.json(result)` with defaults merged in.
- PUT returns `apiSuccess(result)` — wrapped in `{ data: ... }`. Page does not read the body on PUT so this inconsistency has no runtime effect.

### `/api/notifications/rules` notes
- PUT uses inline `{ id, ...data }` in the body — **not** a dynamic `[ruleId]` route.
- DELETE uses `?id=` query param — **not** a body or URL segment.

### `/api/subscriptions/activate` notes
- Upserts in tenant DB and writes a platform-level `SubscriptionIndex` for webhook routing.
- Session is optional — handles both logged-in users and anonymous PayPal redirect returns.
- Non-fatal if platform index write fails (logs error, does not 500).

---

## 4. Roles & Permissions

| Permission | Who needs it |
|---|---|
| `settings:manage` | Access General settings, Billing, Automation settings |
| `notifications:manage_rules` | Create/edit/delete notification rules |
| `subscriptions:manage` | Cancel subscription |

---

## 5. Automation Keys

| Key | Controls |
|---|---|
| `automation.followUpTask` | Creates `lead_follow_up` task 3 days after a `client_meeting` task is completed |
| `automation.escalation` | Triggers escalation notification when tasks are overdue beyond threshold |
| `automation.escalationDays` | Number of days overdue before escalation fires |
| `automation.performanceReport` | Weekly performance summary email sent every Saturday |
| `automation.fieldSummary` | Daily AI narrative of visit logs and field sessions sent to management |

---

## 6. UI Pages & Components

### Pages

| Route | File | Description |
|---|---|---|
| `/settings` | `(dashboard)/settings/page.tsx` | General settings (theme, pagination, file size), Automation toggles, System Maintenance (sync permissions), Notification Rules link card |
| `/settings/profile` | `(dashboard)/settings/profile/page.tsx` | Personal info (firstName, lastName, phone, jobTitle, team), account info (roles, dept, timestamps), change password |
| `/settings/notification-rules` | `(dashboard)/settings/notification-rules/page.tsx` | Full CRUD for notification rules with correct model fields, channels checkboxes, recipientStrategy, roles picker |
| `/settings/subscription` | `(dashboard)/settings/subscription/page.tsx` | Current plan details, plan switcher (owner only), cancel subscription with ConfirmDialog |
| `/settings/billing` | `(dashboard)/settings/billing/page.tsx` | Compact billing overview, cancel subscription (owner only) |
| `/settings/subscribe` | `(dashboard)/settings/subscribe/page.tsx` | Plan comparison page (server component; reads platform DB) |
| `/settings/subscribe/[plan]` | `(dashboard)/settings/subscribe/[plan]/page.tsx` | PayPal checkout page for selected plan (server component) |
| `/admin/admin/settings` | `(admin)/admin/settings/page.tsx` | Platform-level settings editor (super-admin only; theme, feature flags, plan limits) |

### Key Component Patterns

- **Profile page** uses `PATCH /api/users/me` for profile updates and `PUT /api/users/me` for password change.
- **Subscription page** uses `ConfirmDialog` for cancel confirmation — clean, no `window.confirm()`.
- **Notification rules page** uses `ConfirmDialog` for delete, correct `channels[]` + `recipientStrategy` fields, DELETE via `?id=` query param.
- **Subscribe pages** are Next.js Server Components that read platform DB at request time for live pricing.

---

## 7. Validation Schemas

| Schema | File | Used by |
|---|---|---|
| `createNotificationRuleSchema` | `src/features/auth/validators.ts` | POST `/api/notifications/rules` |

```ts
z.object({
  event: z.string().min(1),
  channels: z.array(z.enum(["in_app", "email"])).min(1),
  recipientStrategy: z.enum(["assignees", "creator", "department_head", "specific_roles"]),
  recipientRoles: z.array(z.string()).optional(),
  deadlineThresholdHours: z.number().optional(),
  isActive: z.boolean().optional(),
})
```

Note: The PUT handler for notification rules does **not** re-validate with Zod — it passes `{ id, ...data }` directly to `findByIdAndUpdate`. This is intentional (partial update support) but means no per-field validation on edit.

---

## 8. Subscription Flow

```
User clicks "Subscribe" on pricing page
  → /settings/subscribe (plan list, server-rendered with live prices)
    → /settings/subscribe/[plan] (PayPal button, server-rendered)
      → PayPal hosted page
        → POST /api/subscriptions/activate (on return redirect)
          → Upsert tenant Subscription record
          → Upsert platform SubscriptionIndex (for webhook routing)
          → Redirect to /settings/subscription?subscribed=1
```

Cancellation flow:
```
User clicks "Cancel subscription"
  → ConfirmDialog (subscription page) or window.confirm() (billing page — FIXED)
    → POST /api/subscriptions/cancel
      → Verify user is owner (not staff)
      → cancelPayPalSubscription(subscriptionId, reason)
      → subscription.status = "CANCELLED", cancelledAt = now
```

---

## 9. Audit Findings

### SETTINGS-01 — Inline notification rules panel in settings/page.tsx is completely broken ✅ RESOLVED

**File:** `src/app/(dashboard)/settings/page.tsx`

**Issue:** The page defined a local `NotificationRule` interface with wrong fields (`name`, `channel` as singular string, `enabled`, `recipients`). None of these match the real model (`event`, `channels[]`, `recipientStrategy`, `isActive`). All four mutation operations were broken:

- **Create** — POSTed `{ name, event, channel, enabled, recipients }`. Zod schema requires `channels` (array) and `recipientStrategy` → validation always failed with a 422.
- **Edit** — PUT to `/api/notifications/rules/${editingRule}` → 404. No dynamic `[ruleId]` route exists; the API uses a flat PUT at `/api/notifications/rules` with `id` in the request body.
- **Delete** — DELETE to `/api/notifications/rules/${deleteTarget._id}` → 404. API expects `DELETE /api/notifications/rules?id=<id>` (query param).
- **Toggle** — PUT to `/api/notifications/rules/${ruleId}` with `{ enabled }` → 404 + wrong field name (`enabled` vs `isActive`).
- Permission checks used `can("settings:manage")` but the API requires `notifications:manage_rules`.

**Fix:** Removed the broken duplicate inline section (NotificationRule interface, rules SWR hook, all rule state + functions, the Notification Rules Card JSX, the Rule Dialog, and the delete ConfirmDialog). Replaced with a simple Card that links to the dedicated `/settings/notification-rules` page, which already has a correct, full-featured implementation. Also removed the now-unused imports: `Table/TableBody/TableCell/TableHead/TableHeader/TableRow`, `Dialog/DialogContent/DialogHeader/DialogTitle/DialogFooter`, `ConfirmDialog`, `Plus/Pencil/Trash2`. Added `Link` import.

---

### SETTINGS-02 — billing/page.tsx uses `window.confirm()` for subscription cancellation ✅ RESOLVED

**File:** `src/app/(dashboard)/settings/billing/page.tsx`

**Issue:** `handleCancel` started with `if (!confirm("...")) return;`. This uses a blocking browser-native dialog that is inconsistent with the rest of the UI (which uses `ConfirmDialog`) and is suppressed entirely in some browser/iframe contexts.

**Fix:** Added `cancelOpen` state, wired the Cancel button to open a `ConfirmDialog` instead. `handleCancel` now runs only when the user confirms via the dialog. Added `ConfirmDialog` import.

---

### Audit Summary

| Severity | Count | Issues |
|---|---|---|
| 🔴 Critical | 0 | — |
| 🟡 Medium | 1 | SETTINGS-02 (billing window.confirm) |
| 🔴 High | 1 | SETTINGS-01 (inline rules panel — all CRUD broken) |
| 🟢 Low | 0 | — |
| **Total** | **2** | **All ✅ resolved** |
