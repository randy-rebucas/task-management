import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
const STAGE_ORDER = [
  "prospect",
  "contacted",
  "meeting",
  "proposal",
  "negotiation",
];

export const GET = withPermission("reports:view", async (_req, _ctx, _session, models) => {
  const now = new Date();

  const rows = await models.Deal.aggregate([
    { $match: { stage: { $nin: ["closed_won", "closed_lost"] } } },
    {
      $addFields: {
        ageDays: {
          $divide: [{ $subtract: [now, "$updatedAt"] }, 86400000],
        },
      },
    },
    {
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
        totalValue: { $sum: "$value" },
        avgAgeDays: { $avg: "$ageDays" },
        maxAgeDays: { $max: "$ageDays" },
      },
    },
    {
      $project: {
        _id: 0,
        stage: "$_id",
        count: 1,
        totalValue: 1,
        avgAgeDays: { $round: ["$avgAgeDays", 1] },
        maxAgeDays: { $round: ["$maxAgeDays", 1] },
      },
    },
  ]);

  // Sort by canonical stage order
  rows.sort(
    (a, b) =>
      STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
  );

  const hasStaleStage = rows.some((r) => r.avgAgeDays > 30);
  const totalPipelineValue = rows.reduce((s, r) => s + r.totalValue, 0);
  const totalOpenDeals = rows.reduce((s, r) => s + r.count, 0);

  return apiSuccess({
    rows,
    hasStaleStage,
    totalPipelineValue,
    totalOpenDeals,
  });
});
