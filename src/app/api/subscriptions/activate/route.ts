import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubscriptionDetails, PLAN_CONFIG, PlanKey } from "@/lib/paypal";
import { getTenantModelsFromRequest } from "@/features/auth/api-helpers";
import { getPlatformDb } from "@/lib/platform-db";
import { getSubscriptionIndexModel } from "@/models/platform/SubscriptionIndex";

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId, plan, email: bodyEmail } = await req.json();

    if (!subscriptionId || !plan) {
      return NextResponse.json(
        { error: "subscriptionId and plan are required" },
        { status: 400 }
      );
    }

    const planConfig = PLAN_CONFIG[plan as PlanKey];
    if (!planConfig) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Verify with PayPal
    const details = await getSubscriptionDetails(subscriptionId);
    if (!details?.id || details.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Invalid or cancelled PayPal subscription" },
        { status: 400 }
      );
    }

    // Session is optional — user may not be logged in during PayPal return redirect
    const session = await auth();
    const userId = session?.user?.id;
    const email = (userId ? session?.user?.email : bodyEmail) ?? bodyEmail;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Resolve tenant DB: middleware header → ?__tenant param → session JWT
    const tenantResult = await getTenantModelsFromRequest(req, session?.user?.tenantDbName);
    if (!tenantResult) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    // 1. Upsert subscription record in the tenant DB
    const subscription = await tenantResult.models.Subscription.findOneAndUpdate(
      { paypalSubscriptionId: subscriptionId },
      {
        user: userId ?? undefined,
        email: email.toLowerCase(),
        paypalSubscriptionId: subscriptionId,
        paypalPlanId: details.plan_id,
        plan,
        status: details.status ?? "APPROVED",
        startTime: details.start_time ? new Date(details.start_time) : undefined,
        nextBillingTime: details.billing_info?.next_billing_time
          ? new Date(details.billing_info.next_billing_time)
          : undefined,
        amount: planConfig.amount,
        currency: "USD",
      },
      { upsert: true, new: true }
    ) as any;

    // 2. Write platform-level index so the webhook can route to this tenant DB
    try {
      const pdb = await getPlatformDb();
      const SubIndex = getSubscriptionIndexModel(pdb);
      await SubIndex.findOneAndUpdate(
        { paypalSubscriptionId: subscriptionId },
        {
          paypalSubscriptionId: subscriptionId,
          tenantDbName: tenantResult.conn.name,
          tenantSlug: session?.user?.tenantSlug ??
            req.headers.get("x-tenant-slug") ??
            new URL(req.url).searchParams.get("__tenant") ?? "",
          plan,
          email: email.toLowerCase(),
        },
        { upsert: true, new: true }
      );
    } catch (indexErr) {
      // Non-fatal: log but don't fail activation
      console.error("[subscriptions/activate] Failed to write platform index:", indexErr);
    }

    return NextResponse.json({ ok: true, subscription: subscription._id });
  } catch (err) {
    console.error("[subscriptions/activate]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
