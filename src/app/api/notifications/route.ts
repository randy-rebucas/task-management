import { withAuth, apiSuccess, apiError, getPaginationParams } from "@/features/auth/api-helpers";
export const GET = withAuth(async (req, ctx, session, models) => {
  const url = new URL(req.url);

  // If only requesting unread count
  if (url.searchParams.get("unreadCount") === "true") {
    const unreadCount = await models.Notification.countDocuments({
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
    models.Notification.find(filter)
      .populate("relatedTask", "taskNumber title")
      .populate("relatedUser", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    models.Notification.countDocuments(filter),
  ]);

  return apiSuccess({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const DELETE = withAuth(async (req, _ctx, session, models) => {
  const body = await req.json();
  const { ids, all } = body;

  if (all) {
    await models.Notification.deleteMany({ recipient: session.user.id });
  } else if (ids?.length) {
    await models.Notification.deleteMany({ _id: { $in: ids }, recipient: session.user.id });
  } else {
    return apiError("Provide 'ids' array or 'all: true'");
  }

  return apiSuccess({ message: "Notifications deleted" });
});
