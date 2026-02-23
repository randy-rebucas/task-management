import mongoose from "mongoose";
import { withAuth, apiSuccess } from "@/features/auth/api-helpers";
import type { TenantModels } from "@/lib/tenant-models";
function getPeriodRange(period: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date; label: string } {
  const now = new Date();

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end: now, prevStart, prevEnd, label: "This Month" };
  }

  // Default: this week (Mon–Sun)
  const dow = now.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);

  const prevEnd = new Date(start);
  prevEnd.setMilliseconds(-1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - 6);
  prevStart.setHours(0, 0, 0, 0);

  return { start, end: now, prevStart, prevEnd, label: "This Week" };
}

function calcScore(stats: { tasksAssigned: number; tasksCompleted: number; tasksOverdue: number; visitCount: number; newLeads: number }, period: string) {
  const visitTarget = period === "month" ? 20 : 5;
  const leadTarget  = period === "month" ? 10 : 3;

  const completionScore = stats.tasksAssigned > 0
    ? Math.min(stats.tasksCompleted / stats.tasksAssigned, 1) * 40
    : 40;
  const visitScore   = Math.min(stats.visitCount / visitTarget, 1) * 30;
  const leadScore    = Math.min(stats.newLeads / leadTarget, 1) * 20;
  const overdueDeduct = Math.min(stats.tasksOverdue * 5, 30);

  return Math.max(0, Math.round(completionScore + visitScore + leadScore + 10 - overdueDeduct));
}

async function fetchKPIs(userId: string, start: Date, end: Date, finalStatusIds: mongoose.Types.ObjectId[], now: Date, models: TenantModels) {
  const uid = new mongoose.Types.ObjectId(userId);

  const [assigned, completedInPeriod, overdue, newLeads, totalLeads, closedLeads, visits, visitLogCount] =
    await Promise.all([
      models.Task.countDocuments({ assignees: uid, createdAt: { $gte: start, $lte: end }, isArchived: false }),
      models.Task.countDocuments({ assignees: uid, status: { $in: finalStatusIds }, updatedAt: { $gte: start, $lte: end }, isArchived: false }),
      models.Task.countDocuments({ assignees: uid, dueDate: { $lt: now }, status: { $nin: finalStatusIds }, isArchived: false }),
      models.Task.countDocuments({ assignees: uid, taskType: "lead_follow_up", createdAt: { $gte: start, $lte: end } }),
      models.Task.countDocuments({ assignees: uid, taskType: "lead_follow_up", isArchived: false }),
      models.Task.countDocuments({ assignees: uid, taskType: "lead_follow_up", status: { $in: finalStatusIds }, isArchived: false }),
      models.FieldSession.countDocuments({ user: uid, date: { $gte: start, $lte: end } }),
      models.VisitLog.countDocuments({ user: uid, createdAt: { $gte: start, $lte: end } }),
    ]);

  return {
    tasksAssigned: assigned,
    tasksCompleted: completedInPeriod,
    tasksOverdue: overdue,
    visitCount: visits + visitLogCount,
    newLeads,
    totalLeads,
    closingRate: totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0,
  };
}

export const GET = withAuth(async (req, ctx, session, models) => {
  const period = new URL(req.url).searchParams.get("period") || "week";
  const { start, end, prevStart, prevEnd, label } = getPeriodRange(period);
  const now = new Date();

  const finalStatuses = await models.WorkflowStatus.find({ isFinal: true }).select("_id").lean();
  const finalStatusIds = finalStatuses.map((s) => s._id as mongoose.Types.ObjectId);

  const [current, previous] = await Promise.all([
    fetchKPIs(session.user.id, start, end, finalStatusIds, now, models),
    fetchKPIs(session.user.id, prevStart, prevEnd, finalStatusIds, now, models),
  ]);

  const currentScore  = calcScore(current, period);
  const previousScore = calcScore(previous, period);

  // Daily activity (week only) — single aggregation per resource
  const dailyActivity: { day: string; completed: number; visits: number }[] = [];
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (period === "week") {
    const uid = new mongoose.Types.ObjectId(session.user.id);

    const [completedByDay, visitsByDay] = await Promise.all([
      models.Task.aggregate([
        { $match: { assignees: uid, status: { $in: finalStatusIds }, updatedAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, count: { $sum: 1 } } },
      ]),
      models.FieldSession.aggregate([
        { $match: { user: uid, date: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, count: { $sum: 1 } } },
      ]),
    ]);

    const completedMap = Object.fromEntries(completedByDay.map((r: any) => [r._id, r.count]));
    const visitsMap    = Object.fromEntries(visitsByDay.map((r: any)    => [r._id, r.count]));

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      if (day > now) break;
      const key = day.toISOString().slice(0, 10);
      dailyActivity.push({ day: DAYS[i], completed: completedMap[key] || 0, visits: visitsMap[key] || 0 });
    }
  }

  return apiSuccess({
    period,
    periodLabel: label,
    ...current,
    performanceScore: currentScore,
    trend: {
      tasksCompleted:   current.tasksCompleted - previous.tasksCompleted,
      visitCount:       current.visitCount - previous.visitCount,
      newLeads:         current.newLeads - previous.newLeads,
      performanceScore: currentScore - previousScore,
    },
    dailyActivity,
  });
});
