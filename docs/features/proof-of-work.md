# Proof-of-Work Feature — Full Documentation & Audit

> **Module:** `proof-of-work`
> **Last audited:** 2026-02-23
> **Stack:** Next.js 15 App Router · MongoDB/Mongoose · Zod validation · SWR · Canvas API · QR Code

---

## 1. Overview

The Proof-of-Work (PoW) module enables **field service workers to document and verify their task completion** with tamper-evident evidence: photos, a hand-drawn signature, GPS coordinates, and an optional QR check-in at a registered partner location.

**Core flows:**

1. **Submit flow** — Worker opens the 3-step modal (Photos → Signature → Review), optionally scans a partner QR code for presence verification, then POSTs to the submission API.
2. **QR scan flow** — Worker navigates to `/proof-of-work/scan`, points their camera at the location QR, geolocation is compared against the registered radius, result is stored in `sessionStorage` for pickup by the submit modal.
3. **Review flow** — Managers verify or reject pending submissions. Rejected submissions require a written reason.
4. **Location management** — Administrators create and manage `PartnerLocation` records, each with coordinates and a radius threshold. Each location generates a printable QR code embedding `{ locationId, name, lat, lng, radius }`.

**Design decisions:**
- QR payload embeds all geometry fields so the scan page works fully offline after decoding (no extra API call needed).
- Server re-validates GPS distance server-side on submission using the Haversine formula regardless of what the client sends.
- Verification (approve / reject) is an idempotent PUT that stamps `verifiedBy` + `verifiedAt` on the record.
- `signatureUrl` is intended to be a CDN/upload URL — stored as a string in MongoDB.

---

## 2. Data Models

### `PartnerLocation`
**File:** `src/models/PartnerLocation.ts`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `name` | `string` | required, trimmed | Display name (e.g. "Head Office") |
| `address` | `string` | optional | Human-readable address |
| `lat` | `number` | required | Latitude (WGS-84) |
| `lng` | `number` | required | Longitude (WGS-84) |
| `radius` | `number` | default `100`, min `10` | Check-in acceptance radius in metres |
| `isActive` | `boolean` | default `true` | Soft-delete flag |
| `createdBy` | `ObjectId → User` | required | Creator reference |
| `createdAt` / `updatedAt` | `Date` | timestamps | Mongoose timestamps |

**Indexes:** `{ isActive: 1 }`, `{ lat: 1, lng: 1 }`

---

### `ProofOfWork`
**File:** `src/models/ProofOfWork.ts`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `task` | `ObjectId → Task` | required | The task this submission is for |
| `submittedBy` | `ObjectId → User` | required | Submitting user |
| `photos` | `string[]` | default `[]` | Array of uploaded photo URLs |
| `signatureUrl` | `string` | optional | URL of signature image |
| `capturedAt` | `Date` | required | Timestamp when evidence was captured |
| `capturedLocation` | `{ lat, lng }` | optional | GPS coordinates of device |
| `qrCheckIn` | sub-document | optional | See below |
| `qrCheckIn.partnerLocation` | `ObjectId → PartnerLocation` | | Location reference |
| `qrCheckIn.scannedAt` | `Date` | | When QR was scanned |
| `qrCheckIn.isWithinRadius` | `boolean` | | Server-computed from Haversine |
| `qrCheckIn.distanceMetres` | `number` | | Server-computed distance |
| `verificationStatus` | `"pending" \| "verified" \| "rejected"` | default `"pending"` | Review outcome |
| `verifiedBy` | `ObjectId → User` | optional | Manager who reviewed |
| `verifiedAt` | `Date` | optional | When review occurred |
| `rejectionReason` | `string` | optional | Required when `verificationStatus = "rejected"` |
| `notes` | `string` | optional | Submitter notes |
| `createdAt` / `updatedAt` | `Date` | timestamps | Mongoose timestamps |

**Indexes:** `{ task: 1 }`, `{ submittedBy: 1 }`, `{ verificationStatus: 1 }`

---

## 3. API Reference

| Method | Route | Permission | Description |
|---|---|---|---|
| `GET` | `/api/proof-of-work/submissions` | `proof_of_work:view` | List submissions (scoped to self for non-managers) |
| `POST` | `/api/proof-of-work/submissions` | `proof_of_work:submit` | Create a new submission |
| `GET` | `/api/proof-of-work/submissions/[id]` | `proof_of_work:view` | Get single submission (populated) |
| `PUT` | `/api/proof-of-work/submissions/[id]` | `proof_of_work:manage` | Verify or reject submission |
| `DELETE` | `/api/proof-of-work/submissions/[id]` | `proof_of_work:manage` | Hard-delete a submission |
| `GET` | `/api/proof-of-work/locations` | `proof_of_work:view` | List active partner locations |
| `POST` | `/api/proof-of-work/locations` | `proof_of_work:manage` | Create a partner location |
| `PUT` | `/api/proof-of-work/locations/[id]` | `proof_of_work:manage` | Update a partner location |
| `DELETE` | `/api/proof-of-work/locations/[id]` | `proof_of_work:manage` | Soft-delete (set `isActive: false`) |

### Server-side scoping logic (`GET /submissions`)
```
if (userId param provided && user has proof_of_work:manage) → filter by userId
else if user does NOT have proof_of_work:manage         → filter by session.user.id (always own)
else (manager, no userId param)                         → return all
```

---

## 4. Validation Schemas

**File:** `src/features/auth/validators.ts`

```ts
createPartnerLocationSchema = {
  name: z.string().min(1),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  radius: z.number().min(10).default(100),
  isActive: z.boolean().optional(),
}
updatePartnerLocationSchema = createPartnerLocationSchema.partial()

submitProofSchema = {
  task: z.string().min(1, "Task is required"),
  photos: z.array(z.string()).min(1, "At least one photo is required"),
  signatureUrl: z.string().optional(),
  capturedAt: z.string().datetime(),
  capturedLocation: { lat: z.number(), lng: z.number() }.optional(),
  qrCheckIn: { partnerLocation: z.string(), scannedAt: z.string().datetime() }.optional(),
  notes: z.string().optional(),
}

verifyProofSchema = {
  verificationStatus: z.enum(["verified", "rejected"]),
  rejectionReason: z.string().optional(),
}
```

---

## 5. QR Check-in Flow

1. Field worker navigates to `/proof-of-work/scan` (linked from main page header button).
2. Browser camera opens via `@/components/proof/qr-scanner` (dynamic import, no SSR).
3. On decode, the QR JSON (`{ locationId, name, lat, lng, radius }`) is parsed.
4. `navigator.geolocation.getCurrentPosition` runs; Haversine distance is computed client-side.
5. Result object is saved to `sessionStorage` as `pow_qr_checkin`.
6. Worker is redirected to `/proof-of-work`.
7. `SubmitProofModal` reads `sessionStorage["pow_qr_checkin"]` on mount and displays a check-in banner.
8. On submit, `qrCheckIn.partnerLocation` + `qrCheckIn.scannedAt` are sent to the POST API.
9. The server re-computes distance using the DB's `PartnerLocation.lat/lng/radius` and stores `isWithinRadius` + `distanceMetres` — the client values are **not trusted**.

---

## 6. Photo Upload Flow

Photos are uploaded one at a time via `POST /api/field/photos` (multipart FormData). The endpoint:
- Validates MIME type and size (10 MB max)
- Saves to `public/uploads/field/`
- Returns `{ data: { url: "/uploads/field/<uuid>.<ext>" } }`

Submitted photo URLs are stored as an `string[]` array on the `ProofOfWork` document.

---

## 7. Permissions

| Permission | Roles | Description |
|---|---|---|
| `proof_of_work:view` | Admin, Manager, Supervisor, Viewer | Read all submissions and locations |
| `proof_of_work:submit` | Admin, Supervisor, Field Service, Tech Support | POST new submissions |
| `proof_of_work:manage` | Admin, Supervisor | Verify/reject/delete submissions; manage locations |

**Nav visibility:** Page shown to users with `proof_of_work:view` OR `proof_of_work:submit` (`src/config/nav.ts`).

---

## 8. UI Pages & Components

### `/proof-of-work` (main page)
**File:** `src/app/(dashboard)/proof-of-work/page.tsx`

3-tab layout (custom tab buttons, not shadcn Tabs):
- **Tab 0 — My Submissions**: `SubmissionRow` list for current user's submissions
- **Tab 1 — All Submissions**: Manager view with status-filter select and Verify/Reject inline actions
- **Tab 2 — Partner Locations**: CRUD for locations + QR code modal + print

### `/proof-of-work/scan`
**File:** `src/app/(dashboard)/proof-of-work/scan/page.tsx`

Full-screen dark UI for QR scanning via device camera. Dynamic import of `qr-scanner` component prevents SSR issues. Computes distance client-side; stores result in `sessionStorage`.

### `SubmitProofModal`
**File:** `src/components/proof/submit-proof-modal.tsx`

3-step modal:
- **Step 0 — Photos**: file upload (multiple, with camera capture), QR check-in banner if present
- **Step 1 — Signature**: canvas-based signature pad with save/skip
- **Step 2 — Review & Submit**: final summary + notes + submit

### `SignaturePad`
**File:** `src/components/proof/signature-pad.tsx`

Canvas component with mouse+touch support. `forwardRef` with imperative handle: `clear()`, `getDataUrl()`, `isEmpty()`.

### `QrScanner`
**File:** `src/components/proof/qr-scanner.tsx`

Thin wrapper around `@zxing/browser`. No SSR (dynamic import).

---

## 9. Audit Findings

### 🔴 Critical Issues

#### AUDIT-01 — Submitters cannot view their own submissions ✅ RESOLVED
**Files:** `src/app/api/proof-of-work/submissions/route.ts`
**Issue:** `GET /api/proof-of-work/submissions` was wrapped with `withPermission("proof_of_work:view")`. Field workers (Field Service, Tech Support) only have `proof_of_work:submit` — the permission gate blocked all GET requests, returning 403. The "My Submissions" tab always showed empty even after successful POSTs.
**Fix:** Changed GET handler from `withPermission("proof_of_work:view")` to `withAuth`. The existing scoping logic (non-managers always see only their own records) remains intact and is sufficient for access control.

---

#### AUDIT-02 — Every proof submission from the main page fails Zod validation ✅ RESOLVED
**Files:** `src/app/(dashboard)/proof-of-work/page.tsx`, `src/components/proof/submit-proof-modal.tsx`
**Issue:** The "Submit Proof" header button opened the modal with `taskId: ""`. The POST body contained `task: ""` which failed `z.string().min(1, "Task is required")`. There was no task selector in the modal UI.
**Fix:** Added a task selector dropdown (SWR-fed from `/api/tasks`) to Step 0 of `SubmitProofModal`. The selector is shown only when `taskId` prop is empty. Added `selectedTaskId` state that resets on open/close. Both the "Next" button and `handleSubmit` validate the task selection client-side before proceeding.

---

### 🟡 Medium Issues

#### AUDIT-03 — `handleVerify` swallows errors silently ✅ RESOLVED
**File:** `src/app/(dashboard)/proof-of-work/page.tsx`
**Issue:** No `res.ok` check after PUT — errors silently swallowed, no user feedback.
**Fix:** Added `res.ok` check with `throw new Error(err.error)`, added `toast.success` on verify/reject, `toast.error` on failure.

---

#### AUDIT-04 — `handleSaveLocation` swallows errors silently ✅ RESOLVED
**File:** `src/app/(dashboard)/proof-of-work/page.tsx`
**Issue:** No `res.ok` check after POST/PUT for location save — save errors invisible, form closed optimistically.
**Fix:** Added `res.ok` check, error message from server response, `toast.success` / `toast.error` feedback. Moved close/reset inside the `try` block so they only run on success.

---

#### AUDIT-05 — Location deletion has no confirmation dialog ✅ RESOLVED
**File:** `src/app/(dashboard)/proof-of-work/page.tsx`
**Issue:** Clicking "Remove" immediately called `handleDeleteLocation` with no warning. No success/failure feedback.
**Fix:** Added `deleteLocationTarget` state. "Remove" button sets the target instead of calling delete directly. An inline confirmation modal is shown when `deleteLocationTarget` is set. `handleDeleteLocation` now includes `toast.success` / `toast.error`.

---

#### AUDIT-06 — Signature stored as base64 data URL in MongoDB ✅ RESOLVED
**Files:** `src/components/proof/submit-proof-modal.tsx`, `src/models/ProofOfWork.ts`
**Issue:** Canvas signature was stored as a raw base64 data URL (~20–80 KB) directly in the MongoDB document. Photos are correctly uploaded to `/api/field/photos` — signatures should follow the same pattern.
**Fix:** `saveSignature` is now async. After capturing the canvas data URL it converts it to a PNG `Blob`, POSTs it to `/api/field/photos` as FormData (same as photos), and stores only the returned URL in `signatureUrl` state. The uploading spinner is reused.

---

### 🟢 Low / Informational

#### AUDIT-07 — Tabs not permission-gated in the UI ✅ RESOLVED
**File:** `src/app/(dashboard)/proof-of-work/page.tsx`
**Issue:** All 3 tabs always visible regardless of permissions. "All Submissions" and "Partner Locations" produced silent empty states for users without the required permissions.
**Fix:** Imported `usePermissions()`. "All Submissions" tab now only renders for `can("proof_of_work:view")`. "Partner Locations" tab only renders for `can("proof_of_work:manage")`.

---

#### AUDIT-08 — `haversineMetres` duplicated in server and client ✅ RESOLVED
**Files:** `src/app/api/proof-of-work/submissions/route.ts`, `src/app/(dashboard)/proof-of-work/scan/page.tsx`
**Issue:** Identical Haversine implementation copy-pasted in both files.
**Fix:** Extracted to `src/lib/geo.ts` and imported in both files. Local function definitions removed.

---

### Summary

| Severity | Count | Status |
|---|:---:|---|
| 🔴 Critical | 2 | ✅ AUDIT-01, AUDIT-02 resolved |
| 🟡 Medium | 4 | ✅ AUDIT-03, AUDIT-04, AUDIT-05, AUDIT-06 resolved |
| 🟢 Low / Informational | 2 | ✅ AUDIT-07, AUDIT-08 resolved |
| **Total** | **8** | **All 8 resolved** |
