import { withPermission, apiSuccess } from "@/lib/api-helpers";
import Task from "@/models/Task";
import User from "@/models/User";
import WorkflowStatus from "@/models/WorkflowStatus";
import ActivityLog from "@/models/ActivityLog";

export const GET = withPermission("dashboard:admin", async () => {
  const [
    totalUsers,
    activeUsers,
    totalTasks,
    statuses,
    recentActivity,
    overdueTasks,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    Task.countDocuments({ isArchived: false }),
    WorkflowStatus.find({ isActive: true }).lean(),
    ActivityLog.find()
      .populate("actor", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Task.countDocuments({
      dueDate: { $lt: new Date() },
      isArchived: false,
    }),
  ]);

  // Tasks by status
  const tasksByStatus = await Task.aggregate([
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
  const tasksByPriority = await Task.aggregate([
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
