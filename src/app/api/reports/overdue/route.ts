import { withPermission, apiSuccess, getPaginationParams } from "@/features/auth/api-helpers";
export const GET = withPermission("reports:view", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const department = url.searchParams.get("department");

  const now = new Date();
  const filter: Record<string, unknown> = {
    dueDate: { $lt: now },
    completedAt: null,
    isArchived: false,
  };
  if (department) filter.department = department;

  const [data, total, urgentHighCount, avgResult] = await Promise.all([
    models.Task.find(filter)
      .populate("status", "name slug color")
      .populate("assignees", "firstName lastName email")
      .populate("department", "name code")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    models.Task.countDocuments(filter),
    models.Task.countDocuments({ ...filter, priority: { $in: ["urgent", "high"] } }),
    models.Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgMs: { $avg: { $subtract: [now, "$dueDate"] } },
        },
      },
    ]),
  ]);

  const avgDaysOverdue = avgResult[0]?.avgMs
    ? avgResult[0].avgMs / (1000 * 60 * 60 * 24)
    : 0;

  return apiSuccess({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    urgentHighCount,
    avgDaysOverdue,
  });
});
