import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
export const GET = withPermission("dashboard:manager", async (req, ctx, session, models) => {
  const user = await models.User.findById(session.user.id);
  const departmentFilter = user?.department
    ? { department: user.department }
    : {};

  const [teamMembers, totalTasks, overdueTasks, statuses] = await Promise.all([
    models.User.countDocuments({ ...departmentFilter, isActive: true }),
    models.Task.countDocuments({ ...departmentFilter, isArchived: false }),
    models.Task.countDocuments({
      ...departmentFilter,
      dueDate: { $lt: new Date() },
      isArchived: false,
    }),
    models.WorkflowStatus.find({ isActive: true }).lean(),
  ]);

  // Workload by assignee
  const workloadByAssignee = await models.Task.aggregate([
    { $match: { isArchived: false, ...departmentFilter } },
    { $unwind: "$assignees" },
    { $group: { _id: "$assignees", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        count: 1,
        name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
      },
    },
  ]);

  // Tasks by status
  const tasksByStatus = await models.Task.aggregate([
    { $match: { isArchived: false, ...departmentFilter } },
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

  return apiSuccess({
    teamMembers,
    totalTasks,
    overdueTasks,
    workloadByAssignee,
    taskStatusBreakdown,
  });
});
