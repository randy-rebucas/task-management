import { withAuth, apiSuccess, apiError } from "@/lib/api-helpers";
import Notification from "@/models/Notification";

export const PATCH = withAuth(async (req, ctx, session) => {
  const body = await req.json();
  const { ids, all } = body;

  if (all) {
    await Notification.updateMany(
      { recipient: session.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  } else if (ids?.length) {
    await Notification.updateMany(
      { _id: { $in: ids }, recipient: session.user.id },
      { isRead: true, readAt: new Date() }
    );
  } else {
    return apiError("Provide 'ids' array or 'all: true'");
  }

  return apiSuccess({ message: "Notifications marked as read" });
});
