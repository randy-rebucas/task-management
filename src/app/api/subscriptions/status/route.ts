import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Subscription } from "@/models/Subscription";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Look up the current user to check if they're staff (have an owner)
    const currentUser = await models.User.findById(session.user.id).select("owner").lean();
    const ownerId = currentUser?.owner ?? session.user.id;
    const isOwner = !currentUser?.owner;

    const subscription = await models.Subscription.findOne({
      user: ownerId,
      status: { $in: ["ACTIVE", "APPROVED", "APPROVAL_PENDING", "SUSPENDED"] },
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return NextResponse.json({ subscription: null, isOwner });
    }

    return NextResponse.json({
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount,
        nextBillingTime: subscription.nextBillingTime,
        trialEndTime: subscription.trialEndTime,
        startTime: subscription.startTime,
      },
      isOwner,
    });
  } catch (err) {
    console.error("[subscriptions/status]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
