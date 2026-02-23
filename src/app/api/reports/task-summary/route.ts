import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
export const GET = withPermission("reports:view", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") || "30");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const department = url.searchParams.get("department");

  const now = new Date();
  const fromDate = fromParam
    ? new Date(fromParam)
    : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const toDate = toParam ? new Date(toParam) : now;

  const match: Record<string, unknown> = {
    isArchived: false,
    createdAt: { $gte: fromDate, $lte: toDate },
  };
  if (department) match.department = department;

  const [
    statuses,
    tasksByStatus,
    tasksByPriority,
    completionTrend,
    totalTasks,
    completedTasks,
    overdueTasks,
    inProgressTasks,
  ] = await Promise.all([
    models.WorkflowStatus.find({ isActive: true }).lean(),
    models.Task.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    models.Task.aggregate([
      { $match: match },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    models.Task.aggregate([
      { $match: { ...match, completedAt: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: { year: { $year: "$completedAt" }, month: { $month: "$completedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    models.Task.countDocuments(match),
    models.Task.countDocuments({ ...match, completedAt: { $ne: null } }),
    models.Task.countDocuments({ ...match, dueDate: { $lt: now }, completedAt: null }),
    models.Task.countDocuments({
      ...match,
      completedAt: null,
      $or: [{ dueDate: null }, { dueDate: { $gte: now } }],
    }),
  ]);

  const statusMap = statuses.reduce((acc, s) => {
    acc[(s as any)._id.toString()] = s;
    return acc;
  }, {} as Record<string, any>);

  return apiSuccess({
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    byStatus: tasksByStatus.map((t) => ({
      status: statusMap[t._id?.toString()]?.name || "Unknown",
      color: statusMap[t._id?.toString()]?.color || "#888",
      count: t.count,
    })),
    byPriority: tasksByPriority.map((t) => ({
      priority: t._id || "none",
      count: t.count,
    })),
    completionTrend,
  });
});
