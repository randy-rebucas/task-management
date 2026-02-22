import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
export const GET = withPermission("reports:view", async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Find field coordinators (role slug contains "field")
  const allUsers = await models.User.find({ isActive: true })
    .populate("roles", "slug name")
    .select("_id firstName lastName email avatar roles")
    .lean();

  const fieldUsers = allUsers.filter((u) => {
    const roles = u.roles as { slug: string }[];
    return roles.some((r) => r.slug.includes("field"));
  });

  if (fieldUsers.length === 0) {
    return apiSuccess([]);
  }

  const userIds = fieldUsers.map((u) => u._id);

  // FieldSession stats per user (past 30 days)
  const sessionStats = await models.FieldSession.aggregate([
    {
      $match: {
        user: { $in: userIds },
        "checkIn.time": { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: "$user",
        sessions: { $sum: 1 },
        totalMinutes: { $sum: { $ifNull: ["$duration", 0] } },
      },
    },
  ]);
  const sessionMap = new Map(
    sessionStats.map((s) => [
      String(s._id),
      { sessions: s.sessions, totalMinutes: s.totalMinutes },
    ])
  );

  // Task completion stats per user (past 30 days)
  const taskStats = await models.Task.aggregate([
    {
      $match: {
        assignees: { $in: userIds },
        completedAt: { $gte: thirtyDaysAgo },
      },
    },
    { $unwind: "$assignees" },
    { $match: { assignees: { $in: userIds } } },
    {
      $group: {
        _id: "$assignees",
        tasksCompleted: { $sum: 1 },
      },
    },
  ]);
  const taskMap = new Map(
    taskStats.map((t) => [String(t._id), t.tasksCompleted as number])
  );

  // Build raw data
  const raw = fieldUsers.map((u) => {
    const uid = String(u._id);
    const sess = sessionMap.get(uid) ?? { sessions: 0, totalMinutes: 0 };
    return {
      userId: uid,
      user: {
        _id: uid,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        avatar: u.avatar ?? null,
      },
      sessions: sess.sessions,
      totalHours: Math.round((sess.totalMinutes / 60) * 10) / 10,
      avgSessionHours:
        sess.sessions > 0
          ? Math.round((sess.totalMinutes / 60 / sess.sessions) * 10) / 10
          : 0,
      tasksCompleted: taskMap.get(uid) ?? 0,
    };
  });

  // Normalise to 0–100 for scoring (relative to team max)
  const maxSessions = Math.max(...raw.map((r) => r.sessions), 1);
  const maxTasks = Math.max(...raw.map((r) => r.tasksCompleted), 1);
  const maxAvgHours = Math.max(...raw.map((r) => r.avgSessionHours), 1);

  const result = raw
    .map((r) => ({
      ...r,
      efficiencyScore: Math.round(
        (r.sessions / maxSessions) * 40 +
          (r.tasksCompleted / maxTasks) * 40 +
          (r.avgSessionHours / maxAvgHours) * 20
      ),
    }))
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  return apiSuccess(result);
});
