import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateClientSchema } from "@/features/auth/validators";
import Client from "@/models/Client";

export const GET = withPermission("crm:view", async (_req, ctx) => {
  const { clientId } = await ctx.params;
  const client = await Client.findById(clientId)
    .populate("assignedTo", "firstName lastName email avatar")
    .populate("department", "name")
    .populate("createdBy", "firstName lastName email");
  if (!client) return apiError("Client not found", 404);
  return apiSuccess(client);
});

export const PUT = withPermission("crm:update", async (req, ctx) => {
  const { clientId } = await ctx.params;
  const body = await req.json();
  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const client = await Client.findByIdAndUpdate(clientId, parsed.data, { new: true });
  if (!client) return apiError("Client not found", 404);
  return apiSuccess(client);
});

export const DELETE = withPermission("crm:delete", async (_req, ctx) => {
  const { clientId } = await ctx.params;
  const client = await Client.findByIdAndDelete(clientId);
  if (!client) return apiError("Client not found", 404);
  return apiSuccess({ message: "Client deleted" });
});
