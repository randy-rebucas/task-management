import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateLeadSchema } from "@/features/auth/validators";
import Lead from "@/models/Lead";

export const GET = withPermission("crm:view", async (_req, ctx) => {
  const { leadId } = await ctx.params;
  const lead = await Lead.findById(leadId)
    .populate("assignedTo", "firstName lastName email avatar")
    .populate("convertedToClient", "name company email phone")
    .populate("createdBy", "firstName lastName email");
  if (!lead) return apiError("Lead not found", 404);
  return apiSuccess(lead);
});

export const PUT = withPermission("crm:update", async (req, ctx) => {
  const { leadId } = await ctx.params;
  const body = await req.json();
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const lead = await Lead.findByIdAndUpdate(leadId, parsed.data, { new: true });
  if (!lead) return apiError("Lead not found", 404);
  return apiSuccess(lead);
});

export const DELETE = withPermission("crm:delete", async (_req, ctx) => {
  const { leadId } = await ctx.params;
  const lead = await Lead.findByIdAndDelete(leadId);
  if (!lead) return apiError("Lead not found", 404);
  return apiSuccess({ message: "Lead deleted" });
});
