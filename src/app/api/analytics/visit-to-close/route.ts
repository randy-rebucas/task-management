import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
import type { ILead } from "@/types";
import mongoose from "mongoose";

type LeanLead = Pick<ILead, "industry" | "source"> & { _id: mongoose.Types.ObjectId };

export const GET = withPermission("reports:view", async (_req, _ctx, _session, models) => {
  // Converted leads with source info
  const convertedLeads = await models.Lead.find({ status: "converted" })
    .select("_id industry source")
    .lean() as unknown as LeanLead[];

  if (convertedLeads.length === 0) {
    return apiSuccess({
      avgVisitsToClose: 0,
      bySource: [],
      distribution: [],
      totalConverted: 0,
    });
  }

  const convertedLeadIds = convertedLeads.map((l) => l._id);

  // Count visits per lead
  const visitCounts = await models.CrmInteraction.aggregate([
    { $match: { lead: { $in: convertedLeadIds }, type: "visit" } },
    { $group: { _id: "$lead", visitCount: { $sum: 1 } } },
  ]);

  const visitMap = new Map<string, number>(
    visitCounts.map((v) => [String(v._id), v.visitCount])
  );

  // Build per-lead data
  const perLead = convertedLeads.map((l) => ({
    id: String(l._id),
    source: (l.source as string) || "other",
    industry: (l.industry as string) || "(unspecified)",
    visits: visitMap.get(String(l._id)) ?? 0,
  }));

  // Overall avg
  const totalVisits = perLead.reduce((s, l) => s + l.visits, 0);
  const avgVisitsToClose =
    perLead.length > 0
      ? Math.round((totalVisits / perLead.length) * 10) / 10
      : 0;

  // By source
  const sourceMap = new Map<string, { visits: number; count: number }>();
  for (const l of perLead) {
    const entry = sourceMap.get(l.source) ?? { visits: 0, count: 0 };
    entry.visits += l.visits;
    entry.count += 1;
    sourceMap.set(l.source, entry);
  }
  const bySource = Array.from(sourceMap.entries())
    .map(([source, { visits, count }]) => ({
      source,
      avg: Math.round((visits / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Distribution: how many leads closed in 0, 1, 2, 3, 4, 5+ visits
  const distMap = new Map<number, number>();
  for (const l of perLead) {
    const bucket = Math.min(l.visits, 5);
    distMap.set(bucket, (distMap.get(bucket) ?? 0) + 1);
  }
  const distribution = [0, 1, 2, 3, 4, 5].map((v) => ({
    visits: v === 5 ? "5+" : String(v),
    count: distMap.get(v) ?? 0,
  }));

  return apiSuccess({
    avgVisitsToClose,
    bySource,
    distribution,
    totalConverted: perLead.length,
  });
});
