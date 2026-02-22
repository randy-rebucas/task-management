import { withPermission, apiSuccess, getPaginationParams } from "@/features/auth/api-helpers";
export const GET = withPermission("reports:view", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const department = url.searchParams.get("department");

  const filter: Record<string, unknown> = {
    dueDate: { $lt: new Date() },
    completedAt: null,
    isArchived: false,
  };
  if (department) filter.department = department;

  const [data, total] = await Promise.all([
    models.Task.find(filter)
      .populate("status", "name slug color")
      .populate("assignees", "firstName lastName email")
      .populate("department", "name code")
      .sort({ dueDate: 1 })
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
