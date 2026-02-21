import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Subscription } from "@/models/Subscription";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const subscription = await Subscription.findOne({
      user: session.user.id,
      status: { $in: ["ACTIVE", "APPROVED", "APPROVAL_PENDING", "SUSPENDED"] },
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return NextResponse.json({ subscription: null });
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
    });
  } catch (err) {
    console.error("[subscriptions/status]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
