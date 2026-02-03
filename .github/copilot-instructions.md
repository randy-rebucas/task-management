# Copilot Instructions for Task Management Codebase

## Overview
- **Framework:** Next.js (App Router, TypeScript)
- **Database:** MongoDB (via Mongoose)
- **Auth:** next-auth (credentials provider, session-based)
- **RBAC:** Role-based access control, permissions defined in `src/config/permissions.ts`
- **UI:** Modular React components, Tailwind CSS

## Key Architectural Patterns
- **App Structure:**
  - `src/app/` uses Next.js App Router. Route groups: `(auth)`, `(dashboard)`, `api/`.
  - API routes in `src/app/api/` use helper wrappers (`withAuth`, `withPermission`) for authentication/authorization.
  - Layouts: `src/app/layout.tsx` (global), `(dashboard)/layout.tsx` (sidebar/topbar shell).
- **RBAC:**
  - Permissions are checked both server-side (API) and client-side (hooks/components).
  - Use `usePermissions()` hook for client checks; see `src/hooks/use-permissions.ts`.
  - Permissions are strings like `tasks:create`, `users:view`.
- **Data Models:**
  - Mongoose models in `src/models/` (e.g., `Task.ts`, `User.ts`).
  - Types/interfaces in `src/types/`.
- **Validation:**
  - All API input is validated with Zod schemas in `src/lib/validators.ts`.
- **Activity Logging & Notifications:**
  - Actions are logged via `logActivity` (`src/lib/activity-logger.ts`).
  - Notifications use `src/lib/notification-service.ts`.

## Developer Workflows
- **Start Dev Server:** `npm run dev` (default port 3000)
- **Environment:** Set up `.env.local` (see sample for MongoDB, NextAuth, SMTP)
- **Testing:** No formal test suite present; rely on manual/feature testing.
- **Seeding:** Use `scripts/seed.ts` for initial data (run with `ts-node` or `node` after build).

## Project Conventions
- **API Route Guards:** Always wrap handlers with `withAuth` or `withPermission`.
- **Pagination:** Use `getPaginationParams` from `src/lib/api-helpers.ts`.
- **Component Structure:**
  - UI primitives in `src/components/ui/`
  - Feature components in `src/components/[feature]/`
- **Navigation:**
  - Sidebar/nav items in `src/config/nav.ts` (permission-aware)
- **RBAC:**
  - Permissions and roles are extensible via config files, not hardcoded in logic.
- **Client Data Fetching:**
  - Use SWR for client data fetching (`useSWR`).

## Integration Points
- **Email:** SMTP config in `.env.local`, logic in `src/lib/email.ts`.
- **Session:** Provided via `SessionProvider` (`src/providers/session-provider.tsx`).
- **Theme:** Provided via `ThemeProvider` (`src/providers/theme-provider.tsx`).
- **Query:** Provided via `QueryProvider` (`src/providers/query-provider.tsx`).

## Examples
- **Check permission in component:**
  ```tsx
  const { can } = usePermissions();
  if (can('tasks:create')) { /* ... */ }
  ```
- **API route with permission:**
  ```ts
  export const POST = withPermission('tasks:create', async (req, ctx, session) => { /* ... */ });
  ```

## Key Files/Dirs
- `src/app/` — Next.js routes (pages, API)
- `src/components/` — UI and feature components
- `src/models/` — Mongoose models
- `src/config/` — Navigation, permissions, constants
- `src/lib/` — Helpers: auth, RBAC, logging, notifications, validation
- `scripts/seed.ts` — Data seeding

---
For more, see `README.md` and referenced files above. Update this file as patterns evolve.