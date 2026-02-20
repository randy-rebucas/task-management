import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateDealSchema } from "@/features/auth/validators";
import Deal from "@/models/Deal";
import Task from "@/models/Task";

export const GET = withPermission("crm:view", async (_req, ctx) => {
  const { dealId } = await ctx.params;
  const [deal, tasks] = await Promise.all([
    Deal.findById(dealId)
      .populate("lead", "name company email phone status")
      .populate("client", "name company email phone status")
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email"),
    Task.find({ deal: dealId, isArchived: false })
      .populate("status", "name color slug")
      .populate("assignees", "firstName lastName avatar")
      .select("taskNumber title status priority taskType dueDate createdAt")
      .sort({ createdAt: -1 })
      .limit(10),
  ]);
  if (!deal) return apiError("Deal not found", 404);
  return apiSuccess({ ...deal.toObject(), tasks });
});

export const PUT = withPermission("crm:update", async (req, ctx) => {
  const { dealId } = await ctx.params;
  const body = await req.json();
  const parsed = updateDealSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const deal = await Deal.findByIdAndUpdate(dealId, parsed.data, { new: true });
  if (!deal) return apiError("Deal not found", 404);
  return apiSuccess(deal);
});

export const DELETE = withPermission("crm:delete", async (_req, ctx) => {
  const { dealId } = await ctx.params;
  const deal = await Deal.findByIdAndDelete(dealId);
  if (!deal) return apiError("Deal not found", 404);
  return apiSuccess({ message: "Deal deleted" });
});
