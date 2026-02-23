import { withAuth, apiSuccess, getPaginationParams } from "@/features/auth/api-helpers";
export const GET = withAuth(async (req, ctx, session, models) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const search = url.searchParams.get("search");

  const filter: Record<string, unknown> = {
    assignees: session.user.id,
    isArchived: false,
  };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { taskNumber: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    models.Task.find(filter)
      .populate("status", "name slug color")
      .populate("assignees", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email")
      .sort({ dueDate: 1, createdAt: -1 })
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
