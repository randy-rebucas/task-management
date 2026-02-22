import { withAuth, apiSuccess } from "@/features/auth/api-helpers";
export const GET = withAuth(async (req, ctx, session, models) => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalAssigned, overdue, dueSoon, statuses] = await Promise.all([
    models.Task.countDocuments({
      assignees: session.user.id,
      isArchived: false,
    }),
    models.Task.countDocuments({
      assignees: session.user.id,
      dueDate: { $lt: now },
      isArchived: false,
    }),
    models.Task.find({
      assignees: session.user.id,
      dueDate: { $gte: now, $lte: nextWeek },
      isArchived: false,
    })
      .populate("status", "name slug color")
      .sort({ dueDate: 1 })
      .limit(5)
      .lean(),
    models.WorkflowStatus.find({ isActive: true }).lean(),
  ]);

  // My tasks by status
  const tasksByStatus = await models.Task.aggregate([
    {
      $match: {
        assignees: { $in: [session.user.id] },
        isArchived: false,
      },
    },
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
    totalAssigned,
    overdue,
    dueSoon,
    taskStatusBreakdown,
  });
});
