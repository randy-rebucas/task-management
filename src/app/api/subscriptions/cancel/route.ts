import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cancelPayPalSubscription } from "@/lib/paypal";
import { Subscription } from "@/models/Subscription";
import User from "@/models/User";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Only the account owner can cancel the subscription
    const currentUser = await User.findById(session.user.id).select("owner").lean() as any;
    if (currentUser?.owner) {
      return NextResponse.json(
        { error: "Only the account owner can cancel the subscription" },
        { status: 403 }
      );
    }

    const subscription = await Subscription.findOne({
      user: session.user.id,
      status: { $in: ["ACTIVE", "APPROVED", "APPROVAL_PENDING"] },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const cancelled = await cancelPayPalSubscription(
      subscription.paypalSubscriptionId,
      "Cancelled by user"
    );

    if (!cancelled) {
      return NextResponse.json(
        { error: "Failed to cancel subscription with PayPal" },
        { status: 502 }
      );
    }

    subscription.status = "CANCELLED";
    subscription.cancelledAt = new Date();
    await subscription.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscriptions/cancel]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
