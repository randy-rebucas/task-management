import { withAuth, apiSuccess, getPaginationParams } from "@/lib/api-helpers";
import Notification from "@/models/Notification";

export const GET = withAuth(async (req, ctx, session) => {
  const url = new URL(req.url);

  // If only requesting unread count
  if (url.searchParams.get("unreadCount") === "true") {
    const unreadCount = await Notification.countDocuments({
      recipient: session.user.id,
      isRead: false,
    });
    return apiSuccess({ unreadCount });
  }

  const { page, limit, skip } = getPaginationParams(url);
  const isRead = url.searchParams.get("isRead");

  const filter: Record<string, unknown> = { recipient: session.user.id };
  if (isRead !== null && isRead !== undefined && isRead !== "") {
    filter.isRead = isRead === "true";
  }

  const [data, total] = await Promise.all([
    Notification.find(filter)
      .populate("relatedTask", "taskNumber title")
      .populate("relatedUser", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return apiSuccess({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
