import mongoose from "mongoose";
import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
import Task from "@/models/Task";
import FieldSession from "@/models/FieldSession";
import WorkflowStatus from "@/models/WorkflowStatus";
import User from "@/models/User";
import Department from "@/models/Department";

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
  return Math.max(0, Math.round(
    completionScore +
    Math.min(v / vt, 1) * 30 +
    Math.min(l / lt, 1) * 20 +
    10 - Math.min(o * 5, 30)
  ));
}

export const GET = withPermission("visit_logs:view_all", async (req) => {
  const period = new URL(req.url).searchParams.get("period") || "week";
  const { start, end } = getPeriodRange(period);
  const now = new Date();

  const finalStatuses = await WorkflowStatus.find({ isFinal: true }).select("_id").lean();
  const finalIds = finalStatuses.map((s) => s._id as mongoose.Types.ObjectId);

  const [departments, users, taskAgg, overdueAgg, visitAgg] = await Promise.all([
    Department.find({ isActive: true }).select("name").lean(),
    User.find({ isActive: true }).select("department").lean(),
    Task.aggregate([
      { $match: { isArchived: false } },
      { $unwind: "$assignees" },
      {
        $group: {
          _id: "$assignees",
          assigned: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $and: [{ $in: ["$status", finalIds] }, { $gte: ["$updatedAt", start] }, { $lte: ["$updatedAt", end] }] }, 1, 0] },
          },
          leads: {
            $sum: { $cond: [{ $and: [{ $eq: ["$taskType", "lead_follow_up"] }, { $gte: ["$createdAt", start] }] }, 1, 0] },
          },
        },
      },
    ]),
    Task.aggregate([
      { $match: { isArchived: false, dueDate: { $lt: now }, status: { $nin: finalIds } } },
      { $unwind: "$assignees" },
      { $group: { _id: "$assignees", count: { $sum: 1 } } },
    ]),
    FieldSession.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]),
  ]);

  const taskMap    = Object.fromEntries(taskAgg.map((r: any)    => [r._id.toString(), r]));
  const overdueMap = Object.fromEntries(overdueAgg.map((r: any) => [r._id.toString(), r.count]));
  const visitMap   = Object.fromEntries(visitAgg.map((r: any)   => [r._id.toString(), r.count]));

  // Map each user to their department stats
  const deptStats: Record<string, { memberCount: number; totalAssigned: number; totalCompleted: number; totalOverdue: number; totalVisits: number; totalLeads: number; scores: number[] }> = {};

  for (const user of users) {
    const deptId = user.department?.toString() || "__none__";
    if (!deptStats[deptId]) {
      deptStats[deptId] = { memberCount: 0, totalAssigned: 0, totalCompleted: 0, totalOverdue: 0, totalVisits: 0, totalLeads: 0, scores: [] };
    }
    const s    = deptStats[deptId];
    const uid  = user._id.toString();
    const t    = taskMap[uid]  || { assigned: 0, completed: 0, leads: 0 };
    const o    = overdueMap[uid] || 0;
    const v    = visitMap[uid]   || 0;

    s.memberCount++;
    s.totalAssigned  += t.assigned;
    s.totalCompleted += t.completed;
    s.totalOverdue   += o;
    s.totalVisits    += v;
    s.totalLeads     += t.leads;
    s.scores.push(calcScore(t.assigned, t.completed, o, v, t.leads, period));
  }

  const deptMap = Object.fromEntries(departments.map((d: any) => [d._id.toString(), d.name]));

  const result = Object.entries(deptStats)
    .filter(([id]) => id !== "__none__")
    .map(([deptId, s]) => ({
      department: { _id: deptId, name: deptMap[deptId] || "Unknown" },
      memberCount: s.memberCount,
      totalTasksCompleted: s.totalCompleted,
      totalTasksAssigned: s.totalAssigned,
      totalOverdue: s.totalOverdue,
      totalVisits: s.totalVisits,
      totalLeads: s.totalLeads,
      avgPerformanceScore: s.scores.length
        ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
        : 0,
    }))
    .sort((a, b) => b.avgPerformanceScore - a.avgPerformanceScore);

  return apiSuccess({ period, departments: result });
});
