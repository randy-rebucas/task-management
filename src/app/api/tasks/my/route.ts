import { withAuth, apiSuccess, getPaginationParams } from "@/features/auth/api-helpers";
export const GET = withAuth(async (req, ctx, session, models) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");

  const filter: Record<string, unknown> = {
    assignees: session.user.id,
    isArchived: false,
  };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const [data, total] = await Promise.all([
    models.Task.find(filter)
      .populate("status", "name slug color")
      .populate("assignees", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email")
      .sort({ dueDate: 1, priority: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    models.Task.countDocuments(filter),
  ]);

  return apiSuccess({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
