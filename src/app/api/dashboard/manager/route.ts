import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
export const GET = withPermission("dashboard:manager", async (req, ctx, session, models) => {
  const managerUser = await models.User.findById(session.user.id);
  const departmentFilter = managerUser?.department
    ? { department: managerUser.department }
    : {};

  const [teamMembers, totalTasks, overdueTasks] = await Promise.all([
    models.User.countDocuments({ ...departmentFilter, isActive: true }),
    models.Task.countDocuments({ ...departmentFilter, isArchived: false }),
    models.Task.countDocuments({
      ...departmentFilter,
      dueDate: { $lt: new Date() },
      completedAt: null,
      isArchived: false,
    }),
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

  return apiSuccess({
    teamMembers,
    totalTasks,
    overdueTasks,
    workloadByAssignee,
  });
});
