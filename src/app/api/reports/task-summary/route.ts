import { withPermission, apiSuccess } from "@/lib/api-helpers";
import Task from "@/models/Task";
import WorkflowStatus from "@/models/WorkflowStatus";

export const GET = withPermission("reports:view", async (req) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const department = url.searchParams.get("department");

  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  const match: Record<string, unknown> = { isArchived: false };
  if (Object.keys(dateFilter).length) match.createdAt = dateFilter;
  if (department) match.department = department;

  const [statuses, tasksByStatus, tasksByPriority, completionTrend] = await Promise.all([
    WorkflowStatus.find({ isActive: true }).lean(),
    Task.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: match },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { ...match, completedAt: { $exists: true } } },
      {
        $group: {
          _id: {
            year: { $year: "$completedAt" },
            month: { $month: "$completedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  const statusMap = statuses.reduce((acc, s) => {
    acc[s._id.toString()] = s;
    return acc;
  }, {} as Record<string, (typeof statuses)[0]>);

  return apiSuccess({
    tasksByStatus: tasksByStatus.map((t) => ({
      status: statusMap[t._id?.toString()] || { name: "Unknown" },
      count: t.count,
    })),
    tasksByPriority,
    completionTrend,
  });
});
