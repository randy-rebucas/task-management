import { withAuth, apiSuccess } from "@/features/auth/api-helpers";

export const GET = withAuth(async (req, ctx, session, models) => {
  // Look up the current user to check if they're staff (have an owner)
  const currentUser = await models.User.findById(session.user.id)
    .select("owner")
    .lean() as any;
  const ownerId = currentUser?.owner ?? session.user.id;
  const isOwner = !currentUser?.owner;

  const subscription = await models.Subscription.findOne({
    user: ownerId,
    status: { $in: ["ACTIVE", "APPROVED", "APPROVAL_PENDING", "SUSPENDED"] },
  }).sort({ createdAt: -1 }).lean() as any;

  if (!subscription) {
    return apiSuccess({ subscription: null, isOwner });
  }

  return apiSuccess({
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
});
