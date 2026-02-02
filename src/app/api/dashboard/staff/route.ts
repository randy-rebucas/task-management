import { withAuth, apiSuccess } from "@/lib/api-helpers";
import Task from "@/models/Task";
import WorkflowStatus from "@/models/WorkflowStatus";

export const GET = withAuth(async (req, ctx, session) => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalAssigned, overdue, dueSoon, statuses] = await Promise.all([
    Task.countDocuments({
      assignees: session.user.id,
      isArchived: false,
    }),
    Task.countDocuments({
      assignees: session.user.id,
      dueDate: { $lt: now },
      isArchived: false,
    }),
    Task.find({
      assignees: session.user.id,
      dueDate: { $gte: now, $lte: nextWeek },
      isArchived: false,
    })
      .populate("status", "name slug color")
      .sort({ dueDate: 1 })
      .limit(5)
      .lean(),
    WorkflowStatus.find({ isActive: true }).lean(),
  ]);

  // My tasks by status
  const tasksByStatus = await Task.aggregate([
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
