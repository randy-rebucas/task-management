import { withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";
export const PATCH = withAuth(async (req, ctx, session, models) => {
  const body = await req.json();
  const { ids, all } = body;

  if (all) {
    await models.Notification.updateMany(
      { recipient: session.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  } else if (ids?.length) {
    await models.Notification.updateMany(
      { _id: { $in: ids }, recipient: session.user.id },
      { isRead: true, readAt: new Date() }
    );
  } else {
    return apiError("Provide 'ids' array or 'all: true'");
  }

  return apiSuccess({ message: "Notifications marked as read" });
});
