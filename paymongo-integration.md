# PayMongo Integration Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Environment Variables](#environment-variables)
4. [Subscription Plans](#subscription-plans)
5. [Payment Flow](#payment-flow)
6. [API Endpoints](#api-endpoints)
7. [Webhook Handler](#webhook-handler)
8. [Billing Cycle Reset](#billing-cycle-reset)
9. [Frontend Integration](#frontend-integration)
10. [Data Model](#data-model)
11. [Error Handling](#error-handling)
12. [PayMongo Dashboard Setup](#paymongo-dashboard-setup)

---

## Overview

DocScan AI uses [PayMongo](https://paymongo.com) as its payment gateway to gate document scanning behind paid subscription plans. The integration uses PayMongo's **hosted checkout sessions** — users are redirected to a PayMongo-hosted payment page and redirected back upon completion.

Payment events (successful payments) are delivered asynchronously via **webhooks**, which trigger plan upgrades in the database.

**Supported payment methods:** GCash, Maya, Grab Pay, Credit/Debit Card

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
│                                                             │
│  Main.tsx ──── POST /api/subscription/checkout ──────────► │
│                          │                                  │
│              ◄── { url } │                                  │
│                          │                                  │
│  window.location.href = url  (redirect to PayMongo)         │
└──────────────────────────┼──────────────────────────────────┘
                           │
                 ┌─────────▼──────────┐
                 │   PayMongo Hosted  │
                 │   Checkout Page    │
                 │  (card/gcash/etc.) │
                 └─────────┬──────────┘
                           │ user pays
               ┌───────────┴────────────┐
               │                        │
               ▼                        ▼
  Redirect to /payment/success    Webhook POST /api/webhooks/paymongo
               │                        │
               │              Verify HMAC signature
               │              Parse checkout_session.payment.paid
               │              Upsert User in MongoDB:
               │                - plan, scansLimit, scansUsed, billingCycleStart
               ▼
         User sees success page
         (plan updates async via webhook)
```

---

## Environment Variables

Add these to your `.env.local` file:

```env
# PayMongo secret key (from PayMongo Dashboard → API Keys)
# Use sk_test_... for development, sk_live_... for production
PAYMONGO_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx

# PayMongo webhook secret (from PayMongo Dashboard → Webhooks)
PAYMONGO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx

# Your deployed application URL (used for redirect URLs)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

> **Important:** Never expose `PAYMONGO_SECRET_KEY` or `PAYMONGO_WEBHOOK_SECRET` on the client side. Both are server-only variables (no `NEXT_PUBLIC_` prefix).

---

## Subscription Plans

| Plan    | Price (PHP) | Scans/Month | Notes               |
|---------|-------------|-------------|---------------------|
| Trial   | Free        | 3 lifetime  | Default for new users |
| Starter | ₱499/month  | 30          | Monthly billing     |
| Pro     | ₱1,499/month| Unlimited   | Monthly billing     |

### Plan limits in the database

```
trial:   scansLimit = 3,   billingCycleStart = null
starter: scansLimit = 30,  billingCycleStart = <date of payment>
pro:     scansLimit = -1,  billingCycleStart = <date of payment>
```

> A `scansLimit` of `-1` means unlimited scans.

---

## Payment Flow

### Step-by-step

```
1. User clicks "Upgrade" in the UI
        ↓
2. Frontend: POST /api/subscription/checkout { plan: "starter" | "pro" }
        ↓
3. Backend authenticates the user via NextAuth session
        ↓
4. Backend calls PayMongo API:
   POST https://api.paymongo.com/v1/checkout_sessions
   - line_items:           product name, amount, quantity
   - payment_method_types: [card, gcash, paymaya, grab_pay]
   - metadata:             { user_email, plan }
   - success_url:          /payment/success?plan=<plan>
   - cancel_url:           /payment/cancel
        ↓
5. Backend returns { url: "<paymongo_checkout_url>" }
        ↓
6. Frontend redirects: window.location.href = url
        ↓
7. User completes payment on PayMongo's hosted page
        ↓
8. PayMongo redirects user to /payment/success?plan=<plan>
        ↓
   PayMongo also fires webhook POST /api/webhooks/paymongo
        ↓
9. Webhook handler:
   a. Verifies HMAC-SHA256 signature
   b. Checks replay protection (rejects events > 5 minutes old)
   c. Extracts user_email and plan from session metadata
   d. Upserts User in MongoDB with new plan, scansLimit, resets scansUsed
```

---

## API Endpoints

### `POST /api/subscription/checkout`

Creates a PayMongo checkout session and returns a redirect URL.

**Authentication:** Required (NextAuth session)

**Request body:**
```json
{
  "plan": "starter" | "pro"
}
```

**Response (200):**
```json
{
  "url": "https://checkout.paymongo.com/cs_xxxx"
}
```

**Error responses:**

| Status | Description |
|--------|-------------|
| 401    | User not authenticated |
| 400    | Invalid plan specified |
| 500    | `PAYMONGO_SECRET_KEY` not configured |
| 502    | PayMongo API call failed or returned no URL |

**Pricing (in centavos):**
```
starter: 49900  (₱499.00)
pro:     149900 (₱1,499.00)
```

---

### `GET /api/subscription`

Returns the current authenticated user's subscription status.

**Authentication:** Required (NextAuth session)

**Response (200):**
```json
{
  "plan": "trial" | "starter" | "pro",
  "planName": "Free Trial" | "Starter" | "Pro",
  "scansUsed": 2,
  "scansLimit": 3,
  "isUnlimited": false,
  "pricePhp": 0
}
```

> New users not yet in the database default to the `trial` plan.

---

### `POST /api/webhooks/paymongo`

Receives webhook events from PayMongo. **This endpoint must be publicly accessible.**

**Authentication:** HMAC-SHA256 signature verification (not session-based)

**Handled event:** `checkout_session.payment.paid`

**Signature header format:**
```
Paymongo-Signature: t=<unix_timestamp>,te=<test_hmac>,li=<live_hmac>
```

The handler uses:
- `te` field for test mode keys (`sk_test_...`)
- `li` field for live mode keys (`sk_live_...`)

---

## Webhook Handler

### Signature Verification

The webhook validates every incoming request using HMAC-SHA256:

```
HMAC = SHA256(timestamp + "." + raw_body, PAYMONGO_WEBHOOK_SECRET)
```

Requests are rejected if:
- The computed HMAC does not match the signature header
- The event timestamp is more than **5 minutes** old (replay protection)

### Database Update on Payment

When `checkout_session.payment.paid` is received:

```typescript
await User.findOneAndUpdate(
  { email: userEmail },
  {
    $set: {
      plan: plan,                          // "starter" or "pro"
      scansLimit: plan === "pro" ? -1 : 30,
      scansUsed: 0,                        // reset on each payment
      billingCycleStart: new Date(),
    }
  },
  { upsert: true }
);
```

> The webhook always returns HTTP `200 { received: true }` to PayMongo — even on database errors — to prevent PayMongo from retrying indefinitely.

---

## Billing Cycle Reset

The billing cycle is **not** managed by PayMongo's recurring billing. Instead, it is enforced in `POST /api/analyze-document`:

```
On each scan request:
  1. Fetch user from DB
  2. If plan is "starter" or "pro" AND billingCycleStart is set:
       Check if 30 days have elapsed since billingCycleStart
       If yes → reset scansUsed = 0, billingCycleStart = now()
  3. If scansUsed >= scansLimit (and scansLimit != -1):
       Return 403 { error: "scan_limit_reached", plan, scansUsed, scansLimit }
  4. Otherwise → proceed with scan, then increment scansUsed by 1
```

> This means users are expected to manually renew (pay again) each month. There is no automatic recurring charge.

---

## Frontend Integration

### Triggering Checkout

In [src/components/Main.tsx](../src/components/Main.tsx):

```typescript
const handleUpgrade = async (plan: "starter" | "pro") => {
  setUpgrading(plan);
  const resp = await fetch("/api/subscription/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const { url } = await resp.json();
  window.location.href = url; // Redirect to PayMongo hosted checkout
};
```

### Handling Scan Limit (403)

When a user hits their scan limit, `POST /api/analyze-document` returns HTTP 403. The frontend intercepts this and opens the upgrade modal:

```typescript
if (resp.status === 403) {
  setShowUpgrade(true);
  return;
}
```

### Subscription State

The subscription info is fetched from `GET /api/subscription` after authentication:

```typescript
interface SubscriptionInfo {
  plan: "trial" | "starter" | "pro";
  planName: string;
  scansUsed: number;
  scansLimit: number;
  isUnlimited: boolean;
  pricePhp: number;
}
```

### Post-Payment Pages

| Route | File | Purpose |
|-------|------|---------|
| `/payment/success?plan=<plan>` | [src/app/payment/success/page.tsx](../src/app/payment/success/page.tsx) | Shown after successful payment |
| `/payment/cancel` | [src/app/payment/cancel/page.tsx](../src/app/payment/cancel/page.tsx) | Shown when user cancels checkout |

> The success page informs the user that plan activation may take a few seconds since it is handled asynchronously by the webhook.

---

## Data Model

The `User` document in MongoDB ([src/models/User.ts](../src/models/User.ts)) stores all subscription-related fields:

```typescript
const UserSchema = new Schema({
  email:             { type: String, required: true, unique: true },
  password:          { type: String },           // null for OAuth users
  name:              { type: String },
  createdAt:         { type: Date, default: Date.now },

  // Subscription fields
  plan:              { type: String, enum: ["trial", "starter", "pro"], default: "trial" },
  scansUsed:         { type: Number, default: 0 },
  scansLimit:        { type: Number, default: 3 },  // -1 = unlimited
  billingCycleStart: { type: Date,   default: null },
});
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `PAYMONGO_SECRET_KEY` not set | `500` — "Payment gateway not configured" |
| `PAYMONGO_WEBHOOK_SECRET` not set | `500` — "PAYMONGO_WEBHOOK_SECRET is not set" |
| PayMongo API call fails | `502` — "Failed to create checkout session" |
| No checkout URL in PayMongo response | `502` — "PayMongo returned no checkout URL" |
| Invalid webhook signature | `401` — "Invalid signature" |
| Webhook event older than 5 minutes | `401` — rejected (replay protection) |
| Missing metadata in webhook payload | `200` — logs error, avoids PayMongo retry |
| DB update fails in webhook | `200` — logs error, avoids PayMongo retry |
| Scan limit reached | `403` — frontend shows upgrade modal |
| User not authenticated | `401` on all protected routes |

---

## PayMongo Dashboard Setup

### 1. Get your API keys

1. Log in to the [PayMongo Dashboard](https://dashboard.paymongo.com)
2. Navigate to **Developers → API Keys**
3. Copy your **Secret Key** (`sk_live_...` for production, `sk_test_...` for testing)
4. Set it as `PAYMONGO_SECRET_KEY` in `.env.local`

### 2. Register the webhook

1. Navigate to **Developers → Webhooks**
2. Click **Add Endpoint**
3. Set the URL to: `https://your-app.vercel.app/api/webhooks/paymongo`
4. Subscribe to the event: `checkout_session.payment.paid`
5. Copy the **Webhook Secret** and set it as `PAYMONGO_WEBHOOK_SECRET` in `.env.local`

> For local development, use a tunneling tool like [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose your local server and register a temporary webhook URL.

### 3. Test the integration

Use PayMongo's test cards/credentials to simulate payments without real money:

| Payment Method | Test Credentials |
|----------------|-----------------|
| Card (success) | `4343434343434345` |
| Card (fail)    | `4571736000000075` |
| GCash          | Use PayMongo's test GCash flow |

Switch between test and live mode using `sk_test_...` vs `sk_live_...` keys.

---

## Source File Reference

| File | Role |
|------|------|
| [src/app/api/subscription/checkout/route.ts](../src/app/api/subscription/checkout/route.ts) | Creates PayMongo checkout session |
| [src/app/api/webhooks/paymongo/route.ts](../src/app/api/webhooks/paymongo/route.ts) | Receives and processes payment webhooks |
| [src/app/api/subscription/route.ts](../src/app/api/subscription/route.ts) | Returns current user plan from DB |
| [src/app/api/analyze-document/route.ts](../src/app/api/analyze-document/route.ts) | Enforces scan limits; resets billing cycle |
| [src/models/User.ts](../src/models/User.ts) | MongoDB schema with subscription fields |
| [src/components/Main.tsx](../src/components/Main.tsx) | Upgrade modal, plan badge, checkout trigger |
| [src/app/payment/success/page.tsx](../src/app/payment/success/page.tsx) | Post-payment success landing page |
| [src/app/payment/cancel/page.tsx](../src/app/payment/cancel/page.tsx) | Post-payment cancel landing page |
