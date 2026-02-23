import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
export const GET = withPermission("dashboard:admin", async (_req, _ctx, _session, models) => {
  const [
    totalUsers,
    activeUsers,
    totalTasks,
    statuses,
    recentActivity,
    overdueTasks,
  ] = await Promise.all([
    models.User.countDocuments(),
    models.User.countDocuments({ isActive: true }),
    models.Task.countDocuments({ isArchived: false }),
    models.WorkflowStatus.find({ isActive: true }).lean(),
    models.ActivityLog.find()
      .populate("actor", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    models.Task.countDocuments({
      dueDate: { $lt: new Date() },
      completedAt: null,
      isArchived: false,
    }),
  ]);

  // Tasks by status
  const tasksByStatus = await models.Task.aggregate([
    { $match: { isArchived: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const statusMap = statuses.reduce((acc, s) => {
    acc[s._id.toString()] = s;
    return acc;
  }, {} as Record<string, (typeof statuses)[0]>);

  const taskStatusBreakdown = tasksByStatus.map((t) => ({
    status: statusMap[t._id?.toString()] || { name: "Unknown", color: "#999" },
    count: t.count,
  }));

  // Tasks by priority
  const tasksByPriority = await models.Task.aggregate([
    { $match: { isArchived: false } },
    { $group: { _id: "$priority", count: { $sum: 1 } } },
  ]);

  return apiSuccess({
    totalUsers,
    activeUsers,
    totalTasks,
    overdueTasks,
    taskStatusBreakdown,
    tasksByPriority,
    recentActivity,
  });
});
