# Enhancement Recommendations

> Generated: February 23, 2026  
> Based on codebase audit of 326 source files across the task-management platform.

---

## Table of Contents

1. [Code Quality & Architecture](#1-code-quality--architecture)
2. [Testing](#2-testing)
3. [Security & Auth](#3-security--auth)
4. [Features](#4-features)
5. [Performance](#5-performance)
6. [Developer Experience](#6-developer-experience)
7. [Priority Matrix](#7-priority-matrix)

---

## 1. Code Quality & Architecture

### 1.1 Consolidate Data-Fetching Libraries
- **Issue:** Both `swr` and `@tanstack/react-query` are installed and in use simultaneously.
- **Action:** Standardize on `@tanstack/react-query` (more capable for this app's scale — mutations, background sync, devtools) and remove `swr`.
- **Impact:** Reduced bundle size, single mental model for all data fetching.
- **Files affected:** Any component using `useSWR` in `src/components/` and `src/app/(dashboard)/`

### 1.2 API Versioning
- **Issue:** All routes sit directly under `/api/` with no versioning prefix.
- **Action:** Introduce `/api/v1/` namespace before external integrations grow to avoid future breaking changes.
- **Impact:** Enables non-breaking API evolution and third-party integration stability.

### 1.3 Zod Environment Validation at Boot
- **Issue:** No startup validation for `.env.local` variables. Missing secrets fail silently at runtime.
- **Action:** Create `src/lib/env.ts` using Zod `z.object()` to parse and validate all required environment variables on server startup.
- **Example:**
  ```ts
  // src/lib/env.ts
  import { z } from "zod";

  const envSchema = z.object({
    MONGODB_URI: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url(),
    SMTP_HOST: z.string(),
    SMTP_PORT: z.coerce.number(),
  });

  export const env = envSchema.parse(process.env);
  ```
- **Impact:** Eliminates cryptic runtime errors from missing config.

### 1.4 React Error Boundaries
- **Issue:** No global error boundary in `src/app/layout.tsx` or `src/app/(dashboard)/layout.tsx`.
- **Action:** Add React error boundary wrappers at both layout levels to prevent full-page crashes from isolated failures.
- **Impact:** Improved resilience and user experience during partial failures.

### 1.5 Structured Logging
- **Issue:** Utility modules (`src/lib/ai.ts`, `src/lib/email.ts`, etc.) likely rely on `console.log`.
- **Action:** Replace with a structured logger such as `pino` so logs are machine-readable and queryable in production (Vercel, Datadog, etc.).
- **Impact:** Better observability and faster incident diagnosis in production.

---

## 2. Testing

### 2.1 Unit Tests with Vitest
- **Issue:** No formal test suite exists.
- **Action:** Add [Vitest](https://vitest.dev/) for unit testing. Prioritize:
  - `src/config/permissions.ts` — RBAC logic
  - `src/lib/auth.ts` — authentication helpers
  - `src/lib/validators.ts` (or equivalent Zod schemas)
  - Utility functions in `src/lib/utils.ts`
- **Setup:**
  ```bash
  pnpm add -D vitest @vitejs/plugin-react
  ```

### 2.2 E2E Tests with Playwright
- **Issue:** Critical user flows (login, task CRUD, subscription) have no automated coverage.
- **Action:** Add [Playwright](https://playwright.dev/) for end-to-end tests covering:
  - Login / logout
  - Task create → assign → complete flow
  - Role permission enforcement
  - Subscription upgrade
- **Setup:**
  ```bash
  pnpm add -D @playwright/test
  ```

---

## 3. Security & Auth

### 3.1 Two-Factor Authentication (2FA)
- **Issue:** No MFA option for tenant users.
- **Action:** Implement TOTP-based 2FA using `otpauth` library. The `qrcode.react` package is already installed — use it to render the QR code during enrollment.
- **Flow:** Setup → QR scan → verify code → store encrypted secret → enforce on login.
- **Impact:** Critical security upgrade for a multi-tenant SaaS platform.

### 3.2 API Rate Limiting
- **Issue:** No rate limiting on auth or data mutation endpoints.
- **Action:** Add middleware-level rate limiting using `@upstash/ratelimit` on the Vercel Edge Runtime. Target routes:
  - `/api/auth/*` — prevent brute force
  - `/api/tasks` POST/PATCH
  - `/api/users` POST
- **Files affected:** `middleware.ts`
- **Impact:** Protects against brute force and abuse without infrastructure changes.

### 3.3 Tenant API Keys
- **Issue:** The webhooks endpoint exists but there is no API key issuance system for tenants.
- **Action:** Add API key management:
  - Model: `ApiKey` (hashed key, label, permissions scopes, last used)
  - Routes: `GET/POST/DELETE /api/settings/api-keys`
  - UI: Settings → API Keys page
- **Impact:** Enables safe external integrations without exposing user credentials.

---

## 4. Features

### 4.1 Recurring Tasks
- **Issue:** `src/features/tasks/Task.ts` has no recurrence support.
- **Action:** Add a `recurrence` field to the Task model:
  ```ts
  recurrence: {
    enabled: Boolean,
    frequency: "daily" | "weekly" | "monthly" | "custom",
    cronExpression: String,
    nextRunAt: Date,
    endsAt: Date,
  }
  ```
  Add a cron handler at `src/app/api/cron/recurring-tasks/route.ts` (the `/api/cron/` directory already exists).
- **Impact:** Eliminates manual re-creation of repetitive operational tasks.

### 4.2 @Mentions in Task Comments
- **Issue:** `src/features/tasks/TaskComment.ts` exists but has no mention support.
- **Action:** Parse `@username` tokens on comment save, look up matched users, and dispatch notifications through the existing notification service.
- **Impact:** Closes a key collaboration gap with minimal backend work.

### 4.3 Real-Time Updates via Server-Sent Events (SSE)
- **Issue:** All data fetches are pull-based (polling or manual refresh).
- **Action:** Add SSE endpoints for:
  - Task status changes: `GET /api/tasks/stream`
  - New notifications: `GET /api/notifications/stream`
- **Impact:** Real-time UX without requiring WebSocket infrastructure.

### 4.4 Task Templates
- **Issue:** No way to create tasks from predefined structures.
- **Action:**
  - Add `TaskTemplate` model mirroring `Task.ts` (no assignees or dates).
  - Add `POST /api/tasks/from-template/:id` route.
  - Add Templates section to the Tasks UI.
- **Impact:** Speeds up task creation for recurring work types (e.g., onboarding, audits).

### 4.5 Bulk Task Operations
- **Issue:** No bulk-select UI for tasks.
- **Action:** Add multi-row selection to the tasks table with bulk actions:
  - Bulk assign
  - Bulk status change
  - Bulk delete (guard with `tasks:delete` permission)
- **Impact:** Major time saver for managers handling large task volumes.

### 4.6 Calendar Sync (Google / Outlook)
- **Issue:** The calendar page is internal-only.
- **Action:**
  - Export tasks/events as `.ics` file download.
  - Optionally, add OAuth-based Google Calendar two-way sync.
- **Impact:** Bridges the internal calendar with tools staff already use daily.

### 4.7 Timesheet Reports
- **Issue:** `TaskTimeLog.ts` exists but there is no per-employee timesheet report.
- **Action:** Add a `Timesheet` report page at `src/app/(dashboard)/reports/timesheet/page.tsx` that aggregates `TaskTimeLog` entries by staff member and date range, with export to Excel/PDF (libraries already installed).
- **Impact:** Surfaces existing time-tracking data in an actionable management view.

### 4.8 Advanced Global Search
- **Issue:** No cross-entity search across tasks, clients, staff, and visit logs.
- **Action:**
  - Add `GET /api/search?q=` route performing parallel MongoDB text index queries.
  - Wire results into the `cmdk` command palette (the package is already installed).
- **Impact:** Dramatically improves navigation speed in large datasets.

---

## 5. Performance

### 5.1 MongoDB Index Review
- **Issue:** As collections scale, unindexed queries on common fields will degrade.
- **Action:** Add compound indexes on high-query fields across models:
  | Model | Fields to Index |
  |---|---|
  | Task | `(tenantId, status, dueDate)`, `(tenantId, assignedTo)` |
  | VisitLog | `(tenantId, createdAt)` |
  | Notification | `(tenantId, userId, read)` |
  | CRM Leads/Clients | `(tenantId, status)` |
- **Implementation:** Add index definitions to each Mongoose schema or create a migration script.

### 5.2 Move Uploads to Object Storage
- **Issue:** Proof-of-work photo uploads are stored in `public/uploads/` on the server filesystem.
- **Action:** Route all uploads through `src/lib/storage.ts` to S3-compatible storage (AWS S3, Cloudflare R2). Add server-side image resizing on upload to cap file sizes.
- **Impact:** Prevents disk exhaustion, enables CDN delivery, and works correctly on stateless deployments (Vercel).

### 5.3 Analytics Response Caching
- **Issue:** Analytics routes (`/api/analytics/*`) run heavy aggregation queries on every request.
- **Action:** Add short-lived caching to these endpoints:
  - Option A: HTTP `Cache-Control` headers with Vercel Edge caching.
  - Option B: Redis (Upstash) with a 5-minute TTL per tenant+query combination.
- **Impact:** Reduces MongoDB aggregation load significantly during peak usage.

---

## 6. Developer Experience

### 6.1 OpenAPI / Swagger Documentation
- **Issue:** 30+ API route files with no machine-readable API contract.
- **Action:** Use `next-swagger-doc` or `zod-to-openapi` to auto-generate an OpenAPI spec from existing Zod validators. Expose it at `/api/docs`.
- **Impact:** Accelerates onboarding of new developers and enables external integrations.

### 6.2 Webhook Delivery Logs
- **Issue:** `src/app/api/webhooks/` exists but there is no delivery visibility for tenants.
- **Action:**
  - Add `WebhookDelivery` model: `{ webhookId, event, payload, status, responseCode, retryCount, deliveredAt }`.
  - Add delivery log UI in Settings → Webhooks.
- **Impact:** Gives tenant admins confidence in integration reliability.

### 6.3 Expanded Seed Script
- **Issue:** `scripts/seed.ts` likely contains minimal data.
- **Action:** Expand with realistic demo data:
  - Tasks across multiple departments in various statuses
  - CRM pipeline with leads, clients, and deals
  - Visit logs with GPS coordinates
  - Staff across multiple roles
  - Performance targets and KPIs
- **Impact:** Enables faster demo setup and QA testing of edge cases.

---

## 7. Priority Matrix

| # | Enhancement | Impact | Effort | Priority |
|---|---|---|---|---|
| 1.3 | Zod env validation | High | Low | ⭐ Do first |
| 4.8 | Global search (cmdk) | High | Low | ⭐ Do first |
| 5.2 | Move uploads to object storage | High | Low | ⭐ Do first |
| 3.2 | API rate limiting | High | Low | ⭐ Do first |
| 1.1 | Consolidate SWR → TanStack Query | Medium | Medium | Do next |
| 4.1 | Recurring tasks | High | Medium | Do next |
| 4.2 | @Mentions in comments | Medium | Low | Do next |
| 5.1 | MongoDB index review | High | Medium | Do next |
| 5.3 | Analytics caching | Medium | Low | Do next |
| 3.1 | Two-factor authentication | High | High | Plan |
| 4.4 | Task templates | Medium | Medium | Plan |
| 4.5 | Bulk task operations | Medium | Medium | Plan |
| 4.6 | Calendar sync | Medium | High | Plan |
| 4.7 | Timesheet reports | Medium | Low | Plan |
| 4.3 | SSE real-time updates | Medium | High | Plan |
| 2.1 | Unit tests (Vitest) | High | Medium | Plan |
| 2.2 | E2E tests (Playwright) | High | High | Plan |
| 1.2 | API versioning | Low | Medium | Backlog |
| 1.4 | React error boundaries | Medium | Low | Backlog |
| 1.5 | Structured logging | Medium | Low | Backlog |
| 3.3 | Tenant API keys | Medium | High | Backlog |
| 6.1 | OpenAPI docs | Low | Medium | Backlog |
| 6.2 | Webhook delivery logs | Low | Medium | Backlog |
| 6.3 | Expanded seed script | Low | Low | Backlog |

---

*This document should be reviewed and updated as features are implemented. Mark items complete with a ✅ and link to the implementing PR.*
