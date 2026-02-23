import mongoose from "mongoose";
import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
export const GET = withPermission("dashboard:staff", async (req, ctx, session, models) => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const uid = new mongoose.Types.ObjectId(session.user.id);

  const [totalAssigned, overdue, dueSoon, statuses] = await Promise.all([
    models.Task.countDocuments({
      assignees: uid,
      isArchived: false,
    }),
    models.Task.countDocuments({
      assignees: uid,
      dueDate: { $lt: now },
      completedAt: null,
      isArchived: false,
    }),
    models.Task.find({
      assignees: uid,
      dueDate: { $gte: now, $lte: nextWeek },
      completedAt: null,
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
        assignees: { $in: [uid] },
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
