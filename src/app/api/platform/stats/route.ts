import { NextRequest, NextResponse } from "next/server";
import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";

function checkAuth(req: NextRequest) {
  return req.headers.get("x-super-admin-secret") === process.env.SUPER_ADMIN_SECRET;
}

const PLAN_MRR: Record<string, number> = {
  trial: 0, starter: 29, growth: 79, business: 199, enterprise: 499,
};

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);

  const [allTenants, weeklyAgg] = await Promise.all([
    Tenant.find({}).select("status plan createdAt").lean() as Promise<{ status: string; plan: string; createdAt: Date }[]>,
    Tenant.aggregate([
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$createdAt" },
            week: { $isoWeek: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
      { $limit: 12 },
    ]),
  ]);

  // Counts by status
  const byStatus = { active: 0, trial: 0, suspended: 0, cancelled: 0, pending: 0 };
  const byPlan: Record<string, number> = { trial: 0, starter: 0, growth: 0, business: 0, enterprise: 0 };
  let mrr = 0;

  for (const t of allTenants) {
    byStatus[t.status as keyof typeof byStatus] = (byStatus[t.status as keyof typeof byStatus] ?? 0) + 1;
    byPlan[t.plan] = (byPlan[t.plan] ?? 0) + 1;
    if (t.status === "active") mrr += PLAN_MRR[t.plan] ?? 0;
  }

  // Format weekly signups for chart
  const recentSignups = weeklyAgg.map((row) => ({
    label: `W${row._id.week} '${String(row._id.year).slice(2)}`,
    count: row.count as number,
  }));

  return NextResponse.json({
    total: allTenants.length,
    byStatus,
    byPlan,
    mrr,
    recentSignups,
  });
}
