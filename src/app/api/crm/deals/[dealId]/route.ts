import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateDealSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
export const GET = withPermission("crm:view", async (_req, ctx, _session, models) => {
  const { dealId } = await ctx.params;
  const [deal, tasks] = await Promise.all([
    models.Deal.findById(dealId)
      .populate("lead", "name company email phone status")
      .populate("client", "name company email phone status")
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email"),
    models.Task.find({ deal: dealId, isArchived: false })
      .populate("status", "name color slug")
      .populate("assignees", "firstName lastName avatar")
      .select("taskNumber title status priority taskType dueDate createdAt")
      .sort({ createdAt: -1 })
      .limit(10),
  ]);
  if (!deal) return apiError("Deal not found", 404);
  return apiSuccess({ ...deal.toObject(), tasks });
});

export const PUT = withPermission("crm:update", async (req, ctx, _session, models) => {
  const { dealId } = await ctx.params;
  const body = await req.json();
  const parsed = updateDealSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const deal = await models.Deal.findByIdAndUpdate(dealId, parsed.data, { new: true });
  if (!deal) return apiError("Deal not found", 404);
  return apiSuccess(deal);
});

export const DELETE = withPermission("crm:delete", async (_req, ctx, session, models) => {
  const { dealId } = await ctx.params;
  const deal = await models.Deal.findByIdAndDelete(dealId);
  if (!deal) return apiError("Deal not found", 404);

  // Cascade: clear dangling deal reference from linked tasks
  await models.Task.updateMany({ deal: dealId }, { $unset: { deal: 1 } });

  await logActivity({
    actor: session.user.id,
    action: "deal.deleted",
    resource: "deal",
    resourceId: dealId,
    details: { title: (deal as any).title },
    req: _req,
  });

  return apiSuccess({ message: "Deal deleted" });
});
