import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
import { DEAL_STAGES } from "@/config/constants";
export const GET = withPermission("crm:view", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const assignedTo = url.searchParams.get("assignedTo") || "";

  const filter: Record<string, unknown> = {};
  if (assignedTo) filter.assignedTo = assignedTo;

  const deals = await models.Deal.find(filter)
    .populate("lead", "name company")
    .populate("client", "name company")
    .populate("assignedTo", "firstName lastName avatar")
    .sort({ createdAt: -1 });

  const grouped = DEAL_STAGES.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage.value);
    const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    return {
      stage: stage.value,
      label: stage.label,
      color: stage.color,
      deals: stageDeals,
      count: stageDeals.length,
      totalValue,
    };
  });

  return apiSuccess(grouped);
});
