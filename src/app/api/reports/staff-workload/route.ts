import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
export const GET = withPermission("reports:view", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const department = url.searchParams.get("department");

  const match: Record<string, unknown> = { isArchived: false };
  if (department) match.department = department;

  const now = new Date();

  const workload = await models.Task.aggregate([
    { $match: match },
    { $unwind: "$assignees" },
    {
      $group: {
        _id: "$assignees",
        totalTasks: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $ne: ["$completedAt", null] }, 1, 0] },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", now] },
                  { $eq: ["$completedAt", null] },
                ],
              },
              1,
              0,
            ],
          },
        },
        inProgress: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$completedAt", null] },
                  { $or: [{ $eq: ["$dueDate", null] }, { $gte: ["$dueDate", now] }] },
                ],
              },
              1,
              0,
            ],
          },
        },
        hoursLogged: { $sum: "$actualHours" },
      },
    },
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
        _id: 0,
        userId: "$_id",
        firstName: "$user.firstName",
        lastName: "$user.lastName",
        email: "$user.email",
        totalTasks: 1,
        completed: 1,
        overdue: 1,
        inProgress: 1,
        hoursLogged: 1,
        completionRate: {
          $cond: [
            { $gt: ["$totalTasks", 0] },
            { $multiply: [{ $divide: ["$completed", "$totalTasks"] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { totalTasks: -1 } },
  ]);

  const totalHours = workload.reduce((sum: number, m: any) => sum + (m.hoursLogged || 0), 0);
  const avgTasks = workload.length
    ? workload.reduce((sum: number, m: any) => sum + m.totalTasks, 0) / workload.length
    : 0;

  return apiSuccess({ staff: workload, avgTasks, totalHours });
});
