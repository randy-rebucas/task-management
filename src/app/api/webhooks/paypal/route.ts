import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paypal";
import { Subscription, SubscriptionStatus } from "@/models/Subscription";

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  "BILLING.SUBSCRIPTION.ACTIVATED": "ACTIVE",
  "BILLING.SUBSCRIPTION.CANCELLED": "CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED": "EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED": "SUSPENDED",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED": "ACTIVE",
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify PayPal signature
  const headers: Record<string, string> = {};
  req.headers.forEach((val, key) => { headers[key] = val; });

  const isValid = await verifyWebhookSignature(headers, rawBody);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.event_type;
  const resource = event.resource;
  // Handle subscription status changes
  if (STATUS_MAP[eventType]) {
    const subscriptionId: string =
      resource.id ?? resource.subscription_id;

    if (subscriptionId) {
      const update: Record<string, unknown> = {
        status: STATUS_MAP[eventType],
      };

      if (resource.billing_info?.next_billing_time) {
        update.nextBillingTime = new Date(resource.billing_info.next_billing_time);
      }
      if (resource.start_time) {
        update.startTime = new Date(resource.start_time);
      }
      if (STATUS_MAP[eventType] === "CANCELLED") {
        update.cancelledAt = new Date();
      }

      await Subscription.findOneAndUpdate(
        { paypalSubscriptionId: subscriptionId },
        update
      );
    }
  }

  // Handle successful payment — update billing date
  if (eventType === "PAYMENT.SALE.COMPLETED") {
    const subscriptionId: string = resource.billing_agreement_id;
    if (subscriptionId) {
      await Subscription.findOneAndUpdate(
        { paypalSubscriptionId: subscriptionId },
        { status: "ACTIVE" }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
