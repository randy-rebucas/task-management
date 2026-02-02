import { withPermission, apiSuccess } from "@/lib/api-helpers";
import Task from "@/models/Task";

export const GET = withPermission("reports:view", async (req) => {
  const url = new URL(req.url);
  const department = url.searchParams.get("department");

  const match: Record<string, unknown> = { isArchived: false };
  if (department) match.department = department;

  const workload = await Task.aggregate([
    { $match: match },
    { $unwind: "$assignees" },
    {
      $group: {
        _id: "$assignees",
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $ne: ["$completedAt", null] }, 1, 0] },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", new Date()] },
                  { $eq: ["$completedAt", null] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalHoursLogged: { $sum: "$actualHours" },
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
        name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
        email: "$user.email",
        totalTasks: 1,
        completedTasks: 1,
        overdueTasks: 1,
        totalHoursLogged: 1,
        completionRate: {
          $cond: [
            { $gt: ["$totalTasks", 0] },
            {
              $multiply: [
                { $divide: ["$completedTasks", "$totalTasks"] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { totalTasks: -1 } },
  ]);

  return apiSuccess(workload);
});
