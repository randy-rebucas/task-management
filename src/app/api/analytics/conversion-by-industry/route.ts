import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
import Lead from "@/models/Lead";

export const GET = withPermission("reports:view", async () => {
  const rows = await Lead.aggregate([
    {
      $group: {
        _id: { $ifNull: ["$industry", "(unspecified)"] },
        total: { $sum: 1 },
        converted: {
          $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        industry: "$_id",
        total: 1,
        converted: 1,
        rate: {
          $round: [
            {
              $multiply: [
                { $divide: ["$converted", { $max: ["$total", 1] }] },
                100,
              ],
            },
            1,
          ],
        },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandConverted = rows.reduce((s, r) => s + r.converted, 0);
  const overallRate =
    grandTotal > 0
      ? Math.round((grandConverted / grandTotal) * 1000) / 10
      : 0;

  return apiSuccess({ rows, grandTotal, grandConverted, overallRate });
});
