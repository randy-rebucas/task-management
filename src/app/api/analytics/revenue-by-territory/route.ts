import { withPermission, apiSuccess } from "@/features/auth/api-helpers";

// Analytics aggregates change infrequently — cache for 5 minutes
const CACHE = "s-maxage=300, stale-while-revalidate=60";
export const GET = withPermission("reports:view", async (_req, _ctx, _session, models) => {
  const rows = await models.Deal.aggregate([
    { $match: { stage: "closed_won" } },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "departments",
        localField: "user.department",
        foreignField: "_id",
        as: "dept",
      },
    },
    { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ["$dept.name", "(no department)"] },
        revenue: { $sum: "$value" },
        deals: { $sum: 1 },
        avgDeal: { $avg: "$value" },
      },
    },
    {
      $project: {
        _id: 0,
        territory: "$_id",
        revenue: 1,
        deals: 1,
        avgDeal: { $round: ["$avgDeal", 0] },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const topTerritory = rows[0]?.territory ?? null;
  const totalDeals = rows.reduce((s, r) => s + r.deals, 0);
  const overallAvgDeal =
    totalDeals > 0 ? Math.round(totalRevenue / totalDeals) : 0;

  const res = apiSuccess({ rows, totalRevenue, topTerritory, totalDeals, overallAvgDeal });
  res.headers.set("Cache-Control", CACHE);
  return res;
});
