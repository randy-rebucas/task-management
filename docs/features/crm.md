# CRM

## Overview
The CRM module manages the full sales lifecycle: prospecting (Leads), closing (Clients), deal tracking (Deals / Pipeline), and per-record interaction logging and document attachment. It provides a Kanban pipeline board, list views with search/filter, and rich detail pages for leads, clients, and deals.

---

## File Inventory

| Path | Purpose |
|------|---------|
| `src/models/Lead.ts` | Lead schema |
| `src/models/Client.ts` | Client schema |
| `src/models/Deal.ts` | Deal schema |
| `src/models/CrmInteraction.ts` | Interaction log schema |
| `src/models/CrmAttachment.ts` | Attachment schema |
| `src/types/index.ts` (L124–226) | `IClient`, `ILead`, `ICrmInteraction`, `ICrmAttachment`, `IDeal` |
| `src/features/auth/validators.ts` (L236–329) | Zod schemas for all CRM entities |
| `src/app/api/crm/leads/route.ts` | `GET` list + `POST` create lead |
| `src/app/api/crm/leads/[leadId]/route.ts` | `GET` / `PUT` / `DELETE` a lead |
| `src/app/api/crm/leads/[leadId]/interactions/route.ts` | `GET` / `POST` lead interactions |
| `src/app/api/crm/leads/[leadId]/attachments/route.ts` | `GET` / `POST` / `DELETE` lead attachments |
| `src/app/api/crm/clients/route.ts` | `GET` list + `POST` create client |
| `src/app/api/crm/clients/[clientId]/route.ts` | `GET` / `PUT` / `DELETE` a client |
| `src/app/api/crm/clients/[clientId]/interactions/route.ts` | `GET` / `POST` client interactions |
| `src/app/api/crm/clients/[clientId]/attachments/route.ts` | `GET` / `POST` / `DELETE` client attachments |
| `src/app/api/crm/deals/route.ts` | `GET` list + `POST` create deal |
| `src/app/api/crm/deals/[dealId]/route.ts` | `GET` / `PUT` / `DELETE` a deal |
| `src/app/api/crm/pipeline/route.ts` | `GET` pipeline grouped by stage |
| `src/app/api/upload/route.ts` | Shared file upload (`withAuth`) |
| `src/app/(dashboard)/crm/page.tsx` | CRM overview dashboard |
| `src/app/(dashboard)/crm/leads/page.tsx` | Leads list |
| `src/app/(dashboard)/crm/leads/new/page.tsx` | New lead form |
| `src/app/(dashboard)/crm/leads/[leadId]/page.tsx` | Lead detail (tabs: overview, interactions, documents) |
| `src/app/(dashboard)/crm/clients/page.tsx` | Clients list |
| `src/app/(dashboard)/crm/clients/new/page.tsx` | New client form |
| `src/app/(dashboard)/crm/clients/[clientId]/page.tsx` | Client detail (tabs: overview, interactions, documents) |
| `src/app/(dashboard)/crm/pipeline/page.tsx` | Kanban pipeline board + deal creation dialog |
| `src/app/(dashboard)/crm/deals/[dealId]/page.tsx` | Deal detail |

---

## Data Models

### Lead
```ts
{
  name:               string     // required
  company?:           string
  industry?:          string
  address?:           string
  website?:           string
  contactPersonTitle?: string
  email?:             string     // lowercase
  phone?:             string
  source:             "referral"|"cold_call"|"social_media"|"website"|"event"|"other"  // required
  status:             "new"|"contacted"|"qualified"|"unqualified"|"converted"  // default "new"
  assignedTo?:        ObjectId → User
  convertedToClient?: ObjectId → Client
  notes?:             string
  followUpDate?:      Date
  createdBy:          ObjectId → User  // required
}
```
**Indexes:** `{ status }`, `{ source }`, `{ assignedTo }`, `{ createdBy }`, text on `name,company,email`

### Client
```ts
{
  name:                string   // required
  company?:            string
  industry?:           string
  email?:              string
  phone?:              string
  address?:            string
  website?:            string
  contactPersonName?:  string
  contactPersonTitle?: string
  contactPersonPhone?: string
  followUpDate?:       Date
  assignedTo?:         ObjectId → User
  department?:         ObjectId → Department
  status:              "active"|"inactive"  // default "active"
  notes?:              string
  createdBy:           ObjectId → User  // required
}
```
**Indexes:** `{ status }`, `{ assignedTo }`, `{ createdBy }`, text on `name,company,email`

### Deal
```ts
{
  title:              string   // required
  lead?:              ObjectId → Lead
  client?:            ObjectId → Client
  stage:              "prospect"|"contacted"|"meeting"|"proposal"|"negotiation"|"closed_won"|"closed_lost"  // default "prospect"
  value:              number   // default 0
  currency:           string   // default "PHP"
  probability:        number   // 0–100, default 0
  expectedCloseDate?: Date
  assignedTo?:        ObjectId → User
  notes?:             string
  createdBy:          ObjectId → User  // required
}
```
**Indexes:** `{ stage }`, `{ assignedTo }`, `{ createdBy }`, `{ lead }`, `{ client }`, text on `title`

### CrmInteraction
```ts
{
  lead?:      ObjectId → Lead
  client?:    ObjectId → Client
  type:       "call"|"email"|"meeting"|"note"|"visit"  // required
  date:       Date    // required
  summary:    string  // required
  outcome?:   string
  nextAction?: string
  loggedBy:   ObjectId → User  // required
}
```
**Indexes:** `{ lead, date: -1 }`, `{ client, date: -1 }`

### CrmAttachment
```ts
{
  lead?:     ObjectId → Lead
  client?:   ObjectId → Client
  deal?:     ObjectId → Deal
  uploadedBy: ObjectId → User  // required
  fileName:   string  // required
  fileUrl:    string  // required
  fileSize?:  number
  mimeType?:  string
  documentType: "proposal"|"contract"|"other"  // default "other"
  notes?:     string
}
```
**Indexes:** `{ lead }`, `{ client }`, `{ deal }`

---

## API Routes

### Leads

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| `GET` | `/api/crm/leads` | `crm:view` | Filter: `search` ($text), `status`, `source`, `assignedTo`; paginated |
| `POST` | `/api/crm/leads` | `crm:create` | Validated by `createLeadSchema`; `createdBy` auto-set |
| `GET` | `/api/crm/leads/:leadId` | `crm:view` | Populates `assignedTo`, `convertedToClient`, `createdBy` |
| `PUT` | `/api/crm/leads/:leadId` | `crm:update` | Validated by `updateLeadSchema`; triggers `follow_up_reminder` notification if `followUpDate` changes |
| `DELETE` | `/api/crm/leads/:leadId` | `crm:delete` | Hard delete |
| `GET` | `/api/crm/leads/:leadId/interactions` | `crm:view` | Sorted by `date: -1` |
| `POST` | `/api/crm/leads/:leadId/interactions` | `crm:update` | Validated by `createInteractionSchema` |
| `GET` | `/api/crm/leads/:leadId/attachments` | `crm:view` | Sorted by `createdAt: -1` |
| `POST` | `/api/crm/leads/:leadId/attachments` | `crm:update` | Validated by `createCrmAttachmentSchema` |
| `DELETE` | `/api/crm/leads/:leadId/attachments?id=` | `crm:update` | Deletes by `_id` + `lead` |

### Clients

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| `GET` | `/api/crm/clients` | `crm:view` | Filter: `search`, `status`, `assignedTo`; paginated |
| `POST` | `/api/crm/clients` | `crm:create` | Validated by `createClientSchema` |
| `GET` | `/api/crm/clients/:clientId` | `crm:view` | Populates `assignedTo`, `department`, `createdBy` |
| `PUT` | `/api/crm/clients/:clientId` | `crm:update` | Triggers `follow_up_reminder` if `followUpDate` changes |
| `DELETE` | `/api/crm/clients/:clientId` | `crm:delete` | Hard delete |
| `GET/POST` | `.../interactions` | `crm:view`/`crm:update` | Same pattern as leads |
| `GET/POST/DELETE` | `.../attachments` | `crm:view`/`crm:update` | Same pattern as leads |

### Deals

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| `GET` | `/api/crm/deals` | `crm:view` | Filter: `search`, `stage`, `assignedTo`; paginated |
| `POST` | `/api/crm/deals` | `crm:create` | Validated by `createDealSchema` |
| `GET` | `/api/crm/deals/:dealId` | `crm:view` | Populates `lead`, `client`, `assignedTo`, `createdBy`; also fetches last 10 tasks linked to deal |
| `PUT` | `/api/crm/deals/:dealId` | `crm:update` | Validated by `updateDealSchema` |
| `DELETE` | `/api/crm/deals/:dealId` | `crm:delete` | Hard delete |

### Pipeline

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| `GET` | `/api/crm/pipeline` | `crm:view` | Returns all deals grouped by stage with `count` + `totalValue`; filtereable by `assignedTo` |

---

## Permissions

| Permission | Granted to |
|-----------|------------|
| `crm:view` | All roles |
| `crm:create` | Admin, Super Admin, Manager, Sales, Field Worker |
| `crm:update` | Admin, Super Admin, Manager, Sales, Field Worker |
| `crm:delete` | Admin, Super Admin, Manager only |

---

## UI Pages

### `/crm` — Overview Dashboard
- Summary cards: Total Leads, Clients, Active Deals, Win Rate
- **Win rate** = `wonDeals / totalDeals` — uses total across all stages (see CRM-06)
- Pipeline snapshot: horizontal scrollable stage cards
- Recent Leads / Recent Clients lists (last 5 each)

### `/crm/leads` — Leads List
- Debounced search, status + source filters
- Table: name, company, source, status, assigned to, created date, delete button
- Row click → detail page; delete uses `confirm()` (see CRM-02)

### `/crm/leads/[leadId]` — Lead Detail
- Tabs: Overview (edit-in-place), Interactions (log history), Documents (upload/list)
- Follow-up date with overdue indicator
- Converted-to-client card when `convertedToClient` is set
- File upload via `/api/upload` → stores URL in `CrmAttachment`

### `/crm/clients/[clientId]` — Client Detail
- Identical structure to lead detail; contact person fields added

### `/crm/pipeline` — Kanban Board
- All stages rendered as columns; deals fetched from `/api/crm/pipeline`
- Quick stage change via inline `<Select>` per card
- "New Deal" dialog: title, stage, value, probability, close date, lead, client, assigned to, notes

### `/crm/deals/[dealId]` — Deal Detail
- Edit-in-place form; linked tasks listed (from Task model via `deal` field)

---

## Audit Findings

### CRM-01 — GET list handlers missing `.lean()` — MEDIUM
**Files:** `src/app/api/crm/leads/route.ts`, `src/app/api/crm/clients/route.ts`, `src/app/api/crm/deals/route.ts`  
**Problem:** All three list `GET` handlers call `.find(...).populate(...).sort(...).skip(...).limit(...)` without `.lean()`, returning full hydrated Mongoose documents instead of plain objects. The pipeline GET correctly uses `.lean()`. This wastes memory and slows JSON serialisation on high-volume queries.  
**Fix:** Add `.lean()` before the closing semicolon of each chained list query.  
**Status:** RESOLVED

---

### CRM-02 — `confirm()` used for destructive delete in leads and clients list pages — MEDIUM
**Files:** `src/app/(dashboard)/crm/leads/page.tsx`, `src/app/(dashboard)/crm/clients/page.tsx`  
**Problem:** Both list pages use `if (!confirm("Delete this lead?"))` / `if (!confirm("Delete this client?"))`. The native browser `confirm()` is blocked in sandboxed iframes, provides no custom styling, and is inconsistent with the `AlertDialog` pattern used everywhere else in the app.  
**Fix:** Replace `confirm()` calls with an `AlertDialog` state pattern (same as other modules).  
**Status:** RESOLVED

---

### CRM-03 — `stageFilter` state declared but never used in PipelinePage — LOW
**File:** `src/app/(dashboard)/crm/pipeline/page.tsx`  
**Problem:** `const [stageFilter, setStageFilter] = useState<string | null>(null)` — `stageFilter` is never read and `setStageFilter` is never called. Dead state pollutes the component and causes linting warnings.  
**Fix:** Remove both the state declaration and any future reference.  
**Status:** RESOLVED

---

### CRM-04 — Interaction POST does not verify parent record exists — MEDIUM
**Files:** `src/app/api/crm/leads/[leadId]/interactions/route.ts`, `src/app/api/crm/clients/[clientId]/interactions/route.ts`  
**Problem:** Both `POST` handlers create a `CrmInteraction` with `lead: leadId` / `client: clientId` without first verifying the parent record exists. Any user with `crm:update` can submit an arbitrary `leadId`/`clientId` UUID and create an orphaned interaction linked to a non-existent record.  
**Fix:** Add `models.Lead.exists({ _id: leadId })` / `models.Client.exists({ _id: clientId })` before the `create` call; return 404 if null.  
**Status:** RESOLVED

---

### CRM-05 — Attachment POST does not verify parent record exists — LOW
**Files:** `src/app/api/crm/leads/[leadId]/attachments/route.ts`, `src/app/api/crm/clients/[clientId]/attachments/route.ts`  
**Problem:** Same issue as CRM-04 — `CrmAttachment` records can be created pointing to non-existent leads/clients.  
**Fix:** Add `exists` guard before `create` in both attachment POST handlers.  
**Status:** RESOLVED

---

### CRM-06 — Win rate uses wrong denominator — MEDIUM
**File:** `src/app/(dashboard)/crm/page.tsx`  
**Problem:** `winRate = (wonDeals / totalDeals) * 100` uses all deals across all stages as the denominator. Deals still in `prospect`/`meeting`/`proposal` stages should not count towards win rate; they haven't been won or lost yet. Standard win rate = `closed_won / (closed_won + closed_lost)`.  
**Fix:** Find `closedLost` stage from the pipeline stages array and compute: `const closedTotal = (wonDeals?.count ?? 0) + (closedLost?.count ?? 0); const winRate = closedTotal > 0 ? Math.round(((wonDeals?.count ?? 0) / closedTotal) * 100) : 0;`  
**Status:** RESOLVED
