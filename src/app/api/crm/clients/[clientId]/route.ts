import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateClientSchema } from "@/features/auth/validators";
import { triggerNotification } from "@/features/users/notification-service";

export const GET = withPermission("crm:view", async (_req, ctx) => {
  const { clientId } = await ctx.params;
  const client = await models.Client.findById(clientId)
    .populate("assignedTo", "firstName lastName email avatar")
    .populate("department", "name")
    .populate("createdBy", "firstName lastName email");
  if (!client) return apiError("Client not found", 404);
  return apiSuccess(client);
});

export const PUT = withPermission("crm:update", async (req, ctx, session, models) => {
  const { clientId } = await ctx.params;
  const body = await req.json();
  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const client = await models.Client.findByIdAndUpdate(clientId, parsed.data, { new: true });
  if (!client) return apiError("Client not found", 404);

  if (parsed.data.followUpDate) {
    await triggerNotification("follow_up_reminder", {
      actorId: session.user.id,
      resourceType: "client",
      resourceId: clientId,
      data: { name: client.name, followUpDate: parsed.data.followUpDate },
    }, models);
  }

  return apiSuccess(client);
});

export const DELETE = withPermission("crm:delete", async (_req, ctx) => {
  const { clientId } = await ctx.params;
  const client = await models.Client.findByIdAndDelete(clientId);
  if (!client) return apiError("Client not found", 404);
  return apiSuccess({ message: "Client deleted" });
});
