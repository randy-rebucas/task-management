import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { startOfDay, subDays } from "date-fns";

export const GET = withPermission("reports:view", async (req, _ctx, _session, models) => {
  const { searchParams } = new URL(req.url);
  const days   = Math.min(parseInt(searchParams.get("days") ?? "30", 10), 365);
  const userId = searchParams.get("userId"); // "all" or a specific user id

  const since = startOfDay(subDays(new Date(), days));

  const matchStage: Record<string, unknown> = { startTime: { $gte: since } };
  if (userId && userId !== "all") {
    matchStage.user = userId;
  }

  // Aggregate time logs — total minutes per user per day
  const rows = await models.TaskTimeLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          user: "$user",
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
          },
        },
        totalMinutes: { $sum: "$duration" },
        logCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id.user",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: "$_id.user",
        date: "$_id.date",
        totalMinutes: 1,
        totalHours: { $round: [{ $divide: ["$totalMinutes", 60] }, 2] },
        logCount: 1,
        user: {
          _id: "$userInfo._id",
          firstName: "$userInfo.firstName",
          lastName: "$userInfo.lastName",
          email: "$userInfo.email",
        },
      },
    },
    { $sort: { date: -1, totalMinutes: -1 } },
  ]);

  if (!rows.length) {
    return apiSuccess({ rows: [], summary: [], days, since });
  }

  // Build per-user summary
  const summaryMap = new Map<
    string,
    { user: (typeof rows)[0]["user"]; totalMinutes: number; totalHours: number; daysWorked: number }
  >();
  for (const row of rows) {
    const uid = String(row.userId);
    const entry = summaryMap.get(uid) ?? {
      user: row.user,
      totalMinutes: 0,
      totalHours: 0,
      daysWorked: 0,
    };
    entry.totalMinutes += row.totalMinutes;
    entry.daysWorked += 1;
    summaryMap.set(uid, entry);
  }
  const summary = Array.from(summaryMap.values()).map((s) => ({
    ...s,
    totalHours: Math.round((s.totalMinutes / 60) * 100) / 100,
  })).sort((a, b) => b.totalMinutes - a.totalMinutes);

  return apiSuccess({ rows, summary, days, since });
});
