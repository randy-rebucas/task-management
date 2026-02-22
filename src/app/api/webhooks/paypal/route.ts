import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paypal";
import { getPlatformDb } from "@/lib/platform-db";
import { getSubscriptionIndexModel } from "@/models/platform/SubscriptionIndex";
import { getTenantConnection } from "@/lib/tenant-db";
import { getTenantModels } from "@/lib/tenant-models";
import type { SubscriptionStatus } from "@/models/Subscription";

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  "BILLING.SUBSCRIPTION.ACTIVATED":   "ACTIVE",
  "BILLING.SUBSCRIPTION.CANCELLED":   "CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED":     "EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED":   "SUSPENDED",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED": "ACTIVE",
};

/**
 * Resolve the tenant DB for a given PayPal subscription ID via the
 * platform-level SubscriptionIndex written by /api/subscriptions/activate.
 */
async function getTenantModelsForSubscription(paypalSubscriptionId: string) {
  const pdb = await getPlatformDb();
  const SubIndex = getSubscriptionIndexModel(pdb);
  const entry = await SubIndex.findOne({ paypalSubscriptionId }).lean() as any;
  if (!entry?.tenantDbName) return null;
  const conn = await getTenantConnection(entry.tenantDbName);
  return getTenantModels(conn);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify PayPal webhook signature
  const headers: Record<string, string> = {};
  req.headers.forEach((val, key) => { headers[key] = val; });

  const isValid = await verifyWebhookSignature(headers, rawBody);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.event_type;
  const resource = event.resource;

  // ── Subscription status change events ────────────────────────────────────
  if (STATUS_MAP[eventType]) {
    const subscriptionId: string = resource.id ?? resource.subscription_id;

    if (subscriptionId) {
      const models = await getTenantModelsForSubscription(subscriptionId);
      if (models) {
        const update: Record<string, unknown> = { status: STATUS_MAP[eventType] };
        if (resource.billing_info?.next_billing_time) {
          update.nextBillingTime = new Date(resource.billing_info.next_billing_time);
        }
        if (resource.start_time) {
          update.startTime = new Date(resource.start_time);
        }
        if (STATUS_MAP[eventType] === "CANCELLED") {
          update.cancelledAt = new Date();
        }
        await models.Subscription.findOneAndUpdate(
          { paypalSubscriptionId: subscriptionId },
          update
        );

        // Also update the tenant record plan/status when subscription activates/cancels
        if (STATUS_MAP[eventType] === "ACTIVE" || STATUS_MAP[eventType] === "CANCELLED" || STATUS_MAP[eventType] === "SUSPENDED") {
          await updateTenantStatus(subscriptionId, STATUS_MAP[eventType]);
        }
      } else {
        console.warn(`[webhook/paypal] No tenant index found for subscription ${subscriptionId}`);
      }
    }
  }

  // ── Payment completed — refresh billing date ──────────────────────────────
  if (eventType === "PAYMENT.SALE.COMPLETED") {
    const subscriptionId: string = resource.billing_agreement_id;
    if (subscriptionId) {
      const models = await getTenantModelsForSubscription(subscriptionId);
      if (models) {
        await models.Subscription.findOneAndUpdate(
          { paypalSubscriptionId: subscriptionId },
          { status: "ACTIVE" }
        );
        await updateTenantStatus(subscriptionId, "ACTIVE");
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * When a subscription becomes ACTIVE/CANCELLED/SUSPENDED, update the
 * corresponding tenant record in the platform DB so middleware gates work.
 */
async function updateTenantStatus(paypalSubscriptionId: string, subStatus: SubscriptionStatus) {
  try {
    const pdb = await getPlatformDb();
    const SubIndex = getSubscriptionIndexModel(pdb);
    const entry = await SubIndex.findOne({ paypalSubscriptionId }).lean() as any;
    if (!entry?.tenantSlug) return;

    const getTenantModel = (await import("@/models/platform/Tenant")).default;
    const Tenant = getTenantModel(pdb);

    if (subStatus === "ACTIVE") {
      // Activate tenant with the subscribed plan
      await Tenant.findOneAndUpdate(
        { slug: entry.tenantSlug },
        { status: "active", plan: entry.plan }
      );
    } else if (subStatus === "CANCELLED" || subStatus === "EXPIRED") {
      await Tenant.findOneAndUpdate(
        { slug: entry.tenantSlug },
        { plan: "trial" }
      );
    } else if (subStatus === "SUSPENDED") {
      await Tenant.findOneAndUpdate(
        { slug: entry.tenantSlug },
        { status: "suspended" }
      );
    }
  } catch (err) {
    console.error("[webhook/paypal] updateTenantStatus error:", err);
  }
}
