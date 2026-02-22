import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateLeadSchema } from "@/features/auth/validators";
import { triggerNotification } from "@/features/users/notification-service";
import type { ILead } from "@/types";

export const GET = withPermission("crm:view", async (_req, ctx, _session, models) => {
  const { leadId } = await ctx.params;
  const lead = await models.Lead.findById(leadId)
    .populate("assignedTo", "firstName lastName email avatar")
    .populate("convertedToClient", "name company email phone")
    .populate("createdBy", "firstName lastName email");
  if (!lead) return apiError("Lead not found", 404);
  return apiSuccess(lead);
});

export const PUT = withPermission("crm:update", async (req, ctx, session, models) => {
  const { leadId } = await ctx.params;
  const body = await req.json();
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const lead = await models.Lead.findByIdAndUpdate(leadId, parsed.data, { new: true }).lean() as unknown as ILead | null;
  if (!lead) return apiError("Lead not found", 404);

  if (parsed.data.followUpDate) {
    await triggerNotification("follow_up_reminder", {
      actorId: session.user.id,
      resourceType: "lead",
      resourceId: leadId,
      data: { name: lead.name, followUpDate: parsed.data.followUpDate },
    }, models);
  }

  return apiSuccess(lead);
});

export const DELETE = withPermission("crm:delete", async (_req, ctx, _session, models) => {
  const { leadId } = await ctx.params;
  const lead = await models.Lead.findByIdAndDelete(leadId);
  if (!lead) return apiError("Lead not found", 404);
  return apiSuccess({ message: "Lead deleted" });
});
