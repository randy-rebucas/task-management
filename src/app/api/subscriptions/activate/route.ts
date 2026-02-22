import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubscriptionDetails, PLAN_CONFIG, PlanKey } from "@/lib/paypal";
import { Subscription } from "@/models/Subscription";

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
    // Get user session if logged in
    const session = await auth();
    const userId = session?.user?.id;
    const email = (userId ? session?.user?.email : bodyEmail) ?? bodyEmail;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Upsert subscription record
    const subscription = await models.Subscription.findOneAndUpdate(
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
    );

    return NextResponse.json({ ok: true, subscription: subscription._id });
  } catch (err) {
    console.error("[subscriptions/activate]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
