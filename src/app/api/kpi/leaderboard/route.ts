import mongoose from "mongoose";
import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
function getPeriodRange(period: string) {
  const now = new Date();
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  const dow = now.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

function calcScore(a: number, c: number, o: number, v: number, l: number, period: string) {
  const vt = period === "month" ? 20 : 5;
  const lt = period === "month" ? 10 : 3;
  const completionScore = a > 0 ? Math.min(c / a, 1) * 40 : 40;
  const visitScore      = Math.min(v / vt, 1) * 30;
  const leadScore       = Math.min(l / lt, 1) * 20;
  const overdueDeduct   = Math.min(o * 5, 30);
  return Math.max(0, Math.round(completionScore + visitScore + leadScore + 10 - overdueDeduct));
}

export const GET = withPermission("visit_logs:view_all", async (req, _ctx, _session, models) => {
  const period = new URL(req.url).searchParams.get("period") || "week";
  const { start, end } = getPeriodRange(period);
  const now = new Date();

  const finalStatuses = await models.WorkflowStatus.find({ isFinal: true }).select("_id").lean();
  const finalIds = finalStatuses.map((s) => s._id as mongoose.Types.ObjectId);

  // Batch aggregations for efficiency
  const [taskAgg, overdueAgg, visitAgg, visitLogAgg, users] = await Promise.all([
    models.Task.aggregate([
      { $match: { isArchived: false } },
      { $unwind: "$assignees" },
      {
        $group: {
          _id: "$assignees",
          totalAssigned: { $sum: 1 },
          completedInPeriod: {
            $sum: {
              $cond: [
                { $and: [{ $in: ["$status", finalIds] }, { $gte: ["$updatedAt", start] }, { $lte: ["$updatedAt", end] }] },
                1, 0,
              ],
            },
          },
          newLeads: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$taskType", "lead_follow_up"] }, { $gte: ["$createdAt", start] }, { $lte: ["$createdAt", end] }] },
                1, 0,
              ],
            },
          },
          totalLeads: { $sum: { $cond: [{ $eq: ["$taskType", "lead_follow_up"] }, 1, 0] } },
          closedLeads: {
            $sum: { $cond: [{ $and: [{ $eq: ["$taskType", "lead_follow_up"] }, { $in: ["$status", finalIds] }] }, 1, 0] },
          },
        },
      },
    ]),
    models.Task.aggregate([
      { $match: { isArchived: false, dueDate: { $lt: now }, status: { $nin: finalIds } } },
      { $unwind: "$assignees" },
      { $group: { _id: "$assignees", overdue: { $sum: 1 } } },
    ]),
    models.FieldSession.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: "$user", visits: { $sum: 1 } } },
    ]),
    models.VisitLog.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$user", visits: { $sum: 1 } } },
    ]),
    models.User.find({ isActive: true }).select("firstName lastName email department avatar").lean(),
  ]);

  const taskMap     = Object.fromEntries(taskAgg.map((r: any)      => [r._id.toString(), r]));
  const overdueMap  = Object.fromEntries(overdueAgg.map((r: any)   => [r._id.toString(), r.overdue]));
  const visitMap    = Object.fromEntries(visitAgg.map((r: any)     => [r._id.toString(), r.visits]));
  const visitLogMap = Object.fromEntries(visitLogAgg.map((r: any)  => [r._id.toString(), r.visits]));

  const rankings = users
    .map((user) => {
      const uid = user._id.toString();
      const t = taskMap[uid] || { totalAssigned: 0, completedInPeriod: 0, newLeads: 0, totalLeads: 0, closedLeads: 0 };
      const overdue   = overdueMap[uid]  || 0;
      const visits    = (visitMap[uid] || 0) + (visitLogMap[uid] || 0);
      const score     = calcScore(t.totalAssigned, t.completedInPeriod, overdue, visits, t.newLeads, period);
      const closingRate = t.totalLeads > 0 ? Math.round((t.closedLeads / t.totalLeads) * 100) : 0;

      return {
        user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email },
        tasksAssigned: t.totalAssigned,
        tasksCompleted: t.completedInPeriod,
        tasksOverdue: overdue,
        visitCount: visits,
        newLeads: t.newLeads,
        closingRate,
        performanceScore: score,
      };
    })
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return apiSuccess({ period, rankings });
});
