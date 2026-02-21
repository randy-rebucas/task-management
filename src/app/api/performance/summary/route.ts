import mongoose from "mongoose";
import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import Task from "@/models/Task";
import Deal from "@/models/Deal";
import WorkflowStatus from "@/models/WorkflowStatus";
import CommissionRule from "@/models/CommissionRule";
import PerformanceTarget from "@/models/PerformanceTarget";
import User from "@/models/User";

function calcScore(stats: {
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  visitCount: number;
  newLeads: number;
}) {
  const visitTarget = 20;
  const leadTarget = 10;
  const completionScore =
    stats.tasksAssigned > 0
      ? Math.min(stats.tasksCompleted / stats.tasksAssigned, 1) * 40
      : 40;
  const visitScore = Math.min(stats.visitCount / visitTarget, 1) * 30;
  const leadScore = Math.min(stats.newLeads / leadTarget, 1) * 20;
  const overdueDeduct = Math.min(stats.tasksOverdue * 5, 30);
  return Math.max(0, Math.round(completionScore + visitScore + leadScore + 10 - overdueDeduct));
}

async function computeForPeriod(
  uid: mongoose.Types.ObjectId,
  month: number,
  year: number,
  finalStatusIds: mongoose.Types.ObjectId[]
) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const now = new Date();

  const [tasksCompleted, tasksAssigned, tasksOverdue, newLeads, dealResult] = await Promise.all([
    Task.countDocuments({
      assignees: uid,
      status: { $in: finalStatusIds },
      updatedAt: { $gte: start, $lte: end },
      isArchived: false,
    }),
    Task.countDocuments({ assignees: uid, isArchived: false }),
    Task.countDocuments({
      assignees: uid,
      dueDate: { $lt: now },
      status: { $nin: finalStatusIds },
      isArchived: false,
    }),
    Task.countDocuments({
      assignees: uid,
      taskType: "lead_follow_up",
      createdAt: { $gte: start, $lte: end },
    }),
    Deal.aggregate([
      { $match: { assignedTo: uid, stage: "closed_won", updatedAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$value" }, count: { $sum: 1 } } },
    ]),
  ]);

  const dealRevenue: number = dealResult[0]?.total ?? 0;
  const dealsClosed: number = dealResult[0]?.count ?? 0;

  return { tasksCompleted, tasksAssigned, tasksOverdue, newLeads, dealRevenue, dealsClosed, start, end };
}

export const GET = withPermission("performance:view", async (req, _ctx, session) => {
  const url = new URL(req.url);
  const now = new Date();
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1));
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()));
  const userIdParam = url.searchParams.get("userId");

  // Non-managers can only view their own data
  const targetUserId = userIdParam || session.user.id;

  if (!month || month < 1 || month > 12) return apiError("Invalid month", 400);

  const uid = new mongoose.Types.ObjectId(targetUserId);

  const [user, finalStatuses] = await Promise.all([
    User.findById(uid).select("firstName lastName email avatar department jobTitle").lean(),
    WorkflowStatus.find({ isFinal: true }).select("_id").lean(),
  ]);

  if (!user) return apiError("User not found", 404);

  const finalStatusIds = finalStatuses.map((s) => s._id as mongoose.Types.ObjectId);

  // Current period
  const current = await computeForPeriod(uid, month, year, finalStatusIds);

  const performanceScore = calcScore({
    tasksAssigned: current.tasksAssigned,
    tasksCompleted: current.tasksCompleted,
    tasksOverdue: current.tasksOverdue,
    visitCount: 0,
    newLeads: current.newLeads,
  });

  // Commission rule lookup — match by department or jobTitle
  const rule = await CommissionRule.findOne({
    $or: [
      ...(user.department ? [{ department: user.department }] : []),
      ...(user.jobTitle ? [{ jobTitle: user.jobTitle }] : []),
      { department: null, jobTitle: null },
    ],
    isActive: true,
  }).sort({ department: -1 }); // prefer department-specific rule

  const commissionRate = rule?.dealCommissionRate ?? 5;
  const commissionEarned = Math.round(current.dealRevenue * (commissionRate / 100));
  const leadBonus = Math.round(current.newLeads * (rule?.leadConversionBonus ?? 0));

  // Score bonus — pick highest matching threshold
  let scoreBonus = 0;
  if (rule?.bonusThresholds?.length) {
    const sorted = [...rule.bonusThresholds].sort((a, b) => b.minScore - a.minScore);
    const match = sorted.find((t) => performanceScore >= t.minScore);
    if (match) scoreBonus = match.bonusAmount;
  }

  const totalIncentive = commissionEarned + leadBonus + scoreBonus;

  // Targets
  const target = await PerformanceTarget.findOne({ user: uid, month, year }).lean();

  const achievementRate = {
    revenue: target?.targetRevenue ? Math.round((current.dealRevenue / target.targetRevenue) * 100) : null,
    deals: target?.targetDeals ? Math.round((current.dealsClosed / target.targetDeals) * 100) : null,
    tasks: target?.targetTasks ? Math.round((current.tasksCompleted / target.targetTasks) * 100) : null,
    leads: target?.targetLeads ? Math.round((current.newLeads / target.targetLeads) * 100) : null,
  };

  // Monthly trend — last 6 months
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const tMonth = month - i <= 0 ? month - i + 12 : month - i;
    const tYear = month - i <= 0 ? year - 1 : year;
    const p = await computeForPeriod(uid, tMonth, tYear, finalStatusIds);
    const pScore = calcScore({
      tasksAssigned: p.tasksAssigned,
      tasksCompleted: p.tasksCompleted,
      tasksOverdue: p.tasksOverdue,
      visitCount: 0,
      newLeads: p.newLeads,
    });
    const pCommission = Math.round(p.dealRevenue * (commissionRate / 100));
    const pLeadBonus = Math.round(p.newLeads * (rule?.leadConversionBonus ?? 0));
    let pScoreBonus = 0;
    if (rule?.bonusThresholds?.length) {
      const sorted = [...rule.bonusThresholds].sort((a, b) => b.minScore - a.minScore);
      const match = sorted.find((t) => pScore >= t.minScore);
      if (match) pScoreBonus = match.bonusAmount;
    }
    monthlyTrend.push({
      month: tMonth,
      year: tYear,
      tasksCompleted: p.tasksCompleted,
      dealsClosed: p.dealsClosed,
      dealRevenue: p.dealRevenue,
      commissionEarned: pCommission,
      scoreBonus: pScoreBonus,
      leadBonus: pLeadBonus,
      totalIncentive: pCommission + pLeadBonus + pScoreBonus,
      performanceScore: pScore,
    });
  }

  return apiSuccess({
    period: { month, year },
    user,
    // Actuals
    tasksCompleted: current.tasksCompleted,
    tasksAssigned: current.tasksAssigned,
    tasksOverdue: current.tasksOverdue,
    completionRate: current.tasksAssigned > 0 ? Math.round((current.tasksCompleted / current.tasksAssigned) * 100) : 0,
    dealsClosed: current.dealsClosed,
    dealRevenue: current.dealRevenue,
    newLeads: current.newLeads,
    performanceScore,
    // Commission
    commissionRate,
    commissionEarned,
    leadBonus,
    scoreBonus,
    totalIncentive,
    rule: rule ? { dealCommissionRate: rule.dealCommissionRate, leadConversionBonus: rule.leadConversionBonus, bonusThresholds: rule.bonusThresholds } : null,
    // Targets
    target: target
      ? { targetRevenue: target.targetRevenue, targetDeals: target.targetDeals, targetTasks: target.targetTasks, targetLeads: target.targetLeads }
      : null,
    achievementRate,
    // Trend
    monthlyTrend,
  });
});
