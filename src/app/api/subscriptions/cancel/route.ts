import { withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { cancelPayPalSubscription } from "@/lib/paypal";

export const POST = withAuth(async (_req, _ctx, session, models) => {
  // Only the account owner can cancel
  const currentUser = await models.User.findById(session.user.id).select("owner").lean() as any;
  if (currentUser?.owner) {
    return apiError("Only the account owner can cancel the subscription", 403);
  }

  const subscription = await models.Subscription.findOne({
    user: session.user.id,
    status: { $in: ["ACTIVE", "APPROVED", "APPROVAL_PENDING"] },
  }) as any;

  if (!subscription) return apiError("No active subscription found", 404);

  const cancelled = await cancelPayPalSubscription(
    subscription.paypalSubscriptionId,
    "Cancelled by user"
  );
  if (!cancelled) return apiError("Failed to cancel subscription with PayPal", 502);

  subscription.status = "CANCELLED";
  subscription.cancelledAt = new Date();
  await subscription.save();

  return apiSuccess({ ok: true });
});
